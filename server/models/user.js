import { db } from '../db/index.js';
import bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;

export async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

// Synchronous version - use when you have a pre-hashed password
export function createUserSync({ username, email, passwordHash, inviteId }) {
  const stmt = db.prepare(`
    INSERT INTO users (username, email, password_hash, created_by_invite_id)
    VALUES (?, ?, ?, ?)
  `);

  const result = stmt.run(username, email || null, passwordHash, inviteId || null);
  return result.lastInsertRowid;
}

// Async convenience wrapper
export async function createUser({ username, email, password, inviteId }) {
  const passwordHash = await hashPassword(password);
  return createUserSync({ username, email, passwordHash, inviteId });
}

export function findByUsername(username) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

export function findByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}

export function findById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

export async function verifyPassword(user, password) {
  return bcrypt.compare(password, user.password_hash);
}

export function updateLastLogin(userId) {
  db.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").run(userId);
}

export function isValidUsername(username) {
  return typeof username === 'string' &&
    username.length >= 3 &&
    username.length <= 30 &&
    /^[a-zA-Z0-9_]+$/.test(username);
}

export function isValidEmail(email) {
  if (!email) return false; // Email is required
  return typeof email === 'string' &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPassword(password) {
  const missing = [];

  if (typeof password !== 'string' || password.length < 8) {
    missing.push('at least 8 characters');
  }
  if (typeof password === 'string' && !/[a-z]/.test(password)) {
    missing.push('a lowercase letter');
  }
  if (typeof password === 'string' && !/[A-Z]/.test(password)) {
    missing.push('an uppercase letter');
  }
  if (typeof password === 'string' && !/[0-9]/.test(password)) {
    missing.push('a number');
  }

  if (missing.length > 0) {
    return { valid: false, reason: `Password must contain ${missing.join(' and ')}` };
  }
  return { valid: true };
}

// Dummy hash for timing-safe comparison when user doesn't exist
// Pre-computed bcrypt hash of a random string (cost 12)
const DUMMY_HASH = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA/iCUVVK3m';

export async function verifyPasswordTimingSafe(user, password) {
  // Always perform bcrypt comparison to prevent timing attacks
  const hashToCompare = user ? user.password_hash : DUMMY_HASH;
  const result = await bcrypt.compare(password, hashToCompare);
  // Only return true if user exists AND password matches
  return user ? result : false;
}
