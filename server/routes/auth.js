import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { db } from '../db/index.js';
import * as User from '../models/user.js';
import * as Invite from '../models/invite.js';

export const authRouter = Router();

// Per-account lockout tracking (in-memory)
const accountLockouts = new Map(); // username -> { attempts: number, lockedUntil: Date | null }
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function checkAccountLockout(username) {
  const normalized = username.toLowerCase();
  const record = accountLockouts.get(normalized);
  if (!record) return { locked: false };

  if (record.lockedUntil && record.lockedUntil > Date.now()) {
    const remainingMs = record.lockedUntil - Date.now();
    const remainingMins = Math.ceil(remainingMs / 60000);
    return { locked: true, remainingMins };
  }

  // Lockout expired, reset
  if (record.lockedUntil && record.lockedUntil <= Date.now()) {
    accountLockouts.delete(normalized);
  }
  return { locked: false };
}

function recordFailedAttempt(username) {
  const normalized = username.toLowerCase();
  const record = accountLockouts.get(normalized) || { attempts: 0, lockedUntil: null };
  record.attempts++;

  if (record.attempts >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
  }

  accountLockouts.set(normalized, record);
  return record.attempts >= MAX_FAILED_ATTEMPTS;
}

function clearFailedAttempts(username) {
  accountLockouts.delete(username.toLowerCase());
}

// Rate limiting for signup
const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many signup attempts, please try again later' }
});

// Rate limiting for invite validation
const validateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many validation attempts, please try again later' }
});

// Rate limiting for login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Increased since we have per-account lockout too
  message: { error: 'Too many login attempts, please try again later' }
});

// Validate invite token (pre-signup check)
authRouter.post('/invite/validate', validateLimiter, (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token required' });
  }

  const info = Invite.getInviteInfo(token);
  res.json(info);
});

// Signup with invite token
authRouter.post('/signup', signupLimiter, async (req, res) => {
  const { token, username, email, password } = req.body;

  // Validate inputs
  if (!token) {
    return res.status(400).json({ error: 'Invite token required' });
  }

  if (!User.isValidUsername(username)) {
    return res.status(400).json({ error: 'Username must be 3-30 alphanumeric characters or underscores' });
  }

  if (!User.isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  const passwordCheck = User.isValidPassword(password);
  if (!passwordCheck.valid) {
    return res.status(400).json({ error: passwordCheck.reason });
  }

  // Validate invite token
  const invite = Invite.validateToken(token);
  if (!invite) {
    return res.status(400).json({ error: 'Invalid or expired invite token' });
  }

  // Check email restriction
  if (invite.email_allowed && invite.email_allowed.toLowerCase() !== (email || '').toLowerCase()) {
    return res.status(400).json({ error: 'Email does not match invite' });
  }

  // Check if username or email already exists (generic message to prevent enumeration)
  const usernameExists = User.findByUsername(username);
  const emailExists = email && User.findByEmail(email);
  if (usernameExists || emailExists) {
    return res.status(409).json({ error: 'Username or email already in use' });
  }

  try {
    // Hash password first (async), then run synchronous transaction
    const passwordHash = await User.hashPassword(password);

    // Create user and consume invite atomically (synchronous transaction)
    const createUserAndConsumeInvite = db.transaction(() => {
      const userId = User.createUserSync({
        username,
        email,
        passwordHash,
        inviteId: invite.id
      });
      Invite.consumeInvite(invite.id);
      return userId;
    });

    const userId = createUserAndConsumeInvite();

    // Regenerate session to prevent session fixation attacks
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regeneration error:', err);
        return res.status(500).json({ error: 'Failed to create session' });
      }

      // Auto-login after signup
      req.session.authenticated = true;
      req.session.userId = userId;
      req.session.isAdmin = false;

      res.status(201).json({ success: true });
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// Login
authRouter.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  // Check per-account lockout
  const lockout = checkAccountLockout(username);
  if (lockout.locked) {
    return res.status(429).json({
      error: `Account temporarily locked. Try again in ${lockout.remainingMins} minute(s)`
    });
  }

  // Find user (may be null)
  const user = User.findByUsername(username);

  // Timing-safe password verification (always runs bcrypt even if user doesn't exist)
  const validPassword = await User.verifyPasswordTimingSafe(user, password);

  if (!validPassword) {
    // Record failed attempt and check if account is now locked
    const nowLocked = recordFailedAttempt(username);
    if (nowLocked) {
      return res.status(429).json({
        error: `Too many failed attempts. Account locked for 15 minutes`
      });
    }
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Success - clear any failed attempts
  clearFailedAttempts(username);
  User.updateLastLogin(user.id);

  // Regenerate session to prevent session fixation attacks
  req.session.regenerate((err) => {
    if (err) {
      console.error('Session regeneration error:', err);
      return res.status(500).json({ error: 'Failed to create session' });
    }

    req.session.authenticated = true;
    req.session.userId = user.id;
    req.session.isAdmin = !!user.is_admin;

    res.json({ success: true, isAdmin: !!user.is_admin });
  });
});

// Logout
authRouter.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ success: true });
  });
});

// Auth check
authRouter.get('/auth/check', (req, res) => {
  res.json({
    authenticated: !!req.session?.authenticated,
    isAdmin: !!req.session?.isAdmin
  });
});
