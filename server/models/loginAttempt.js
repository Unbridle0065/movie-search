import { db } from '../db/index.js';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export function checkLockout(username) {
  const normalized = username.toLowerCase();
  const record = db.prepare('SELECT attempts, locked_until FROM login_attempts WHERE username = ?').get(normalized);

  if (!record) return { locked: false };

  if (record.locked_until) {
    const lockedUntil = new Date(record.locked_until + 'Z').getTime();
    if (lockedUntil > Date.now()) {
      const remainingMins = Math.ceil((lockedUntil - Date.now()) / 60000);
      return { locked: true, remainingMins };
    }
    // Lockout expired, clear it
    db.prepare('DELETE FROM login_attempts WHERE username = ?').run(normalized);
  }

  return { locked: false };
}

export function recordFailure(username) {
  const normalized = username.toLowerCase();
  const record = db.prepare('SELECT attempts FROM login_attempts WHERE username = ?').get(normalized);
  const newAttempts = (record?.attempts || 0) + 1;

  const lockedUntil = newAttempts >= MAX_FAILED_ATTEMPTS
    ? new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString().replace('Z', '').replace('T', ' ')
    : null;

  db.prepare(`
    INSERT INTO login_attempts (username, attempts, locked_until)
    VALUES (?, ?, ?)
    ON CONFLICT(username) DO UPDATE SET attempts = ?, locked_until = ?
  `).run(normalized, newAttempts, lockedUntil, newAttempts, lockedUntil);

  return newAttempts >= MAX_FAILED_ATTEMPTS;
}

export function clearAttempts(username) {
  db.prepare('DELETE FROM login_attempts WHERE username = ?').run(username.toLowerCase());
}
