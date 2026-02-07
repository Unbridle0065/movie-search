import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { db } from '../db/index.js';
import * as User from '../models/user.js';
import * as Invite from '../models/invite.js';
import * as LoginAttempt from '../models/loginAttempt.js';
import { generateCsrfToken, clearCsrfCookie } from '../csrf.js';

export const authRouter = Router();

// Strict input validation helper - ensures value is a non-empty string
function isString(value) {
  return typeof value === 'string';
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0;
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

  // Strict type validation - prevent object/array injection
  if (!isNonEmptyString(token)) {
    return res.status(400).json({ error: 'Token required' });
  }

  const info = Invite.getInviteInfo(token);
  res.json(info);
});

// Signup with invite token
authRouter.post('/signup', signupLimiter, async (req, res) => {
  const { token, username, email, password } = req.body;

  // Strict type validation - prevent object/array injection
  if (!isNonEmptyString(token)) {
    return res.status(400).json({ error: 'Invite token required' });
  }

  if (!isString(username) || !User.isValidUsername(username)) {
    return res.status(400).json({ error: 'Username must be 3-30 alphanumeric characters or underscores' });
  }

  if (!isString(email) || !User.isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  if (!isString(password)) {
    return res.status(400).json({ error: 'Invalid password format' });
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

      generateCsrfToken(req, res);
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

  // Strict type validation - prevent object/array injection
  if (!isNonEmptyString(username) || !isNonEmptyString(password)) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  // Check per-account lockout
  const lockout = LoginAttempt.checkLockout(username);
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
    const nowLocked = LoginAttempt.recordFailure(username);
    if (nowLocked) {
      return res.status(429).json({
        error: `Too many failed attempts. Account locked for 15 minutes`
      });
    }
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Success - clear any failed attempts
  LoginAttempt.clearAttempts(username);
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

    generateCsrfToken(req, res);
    res.json({ success: true, isAdmin: !!user.is_admin });
  });
});

// Logout
authRouter.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    clearCsrfCookie(res);
    res.json({ success: true });
  });
});

// Auth check
authRouter.get('/auth/check', (req, res) => {
  if (req.session?.authenticated) {
    generateCsrfToken(req, res);
  }
  res.json({
    authenticated: !!req.session?.authenticated,
    isAdmin: !!req.session?.isAdmin
  });
});
