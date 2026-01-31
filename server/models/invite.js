import { db } from '../db/index.js';
import crypto from 'crypto';

export function generateToken() {
  const raw = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export function createInvite({ maxUses = 1, expiresIn, emailAllowed, createdBy }) {
  const { raw, hash } = generateToken();

  // Parse expiration (e.g., "24h", "7d", "30d")
  let expiresAt;
  const match = expiresIn.match(/^(\d+)([hdm])$/);
  if (match) {
    const amount = parseInt(match[1]);
    const unit = match[2];
    const now = new Date();
    if (unit === 'h') {
      now.setHours(now.getHours() + amount);
    } else if (unit === 'd') {
      now.setDate(now.getDate() + amount);
    } else if (unit === 'm') {
      now.setMonth(now.getMonth() + amount);
    }
    expiresAt = now.toISOString();
  } else {
    throw new Error('Invalid expiration format. Use format like "24h", "7d", or "1m"');
  }

  const stmt = db.prepare(`
    INSERT INTO invites (token_hash, expires_at, max_uses, email_allowed, created_by)
    VALUES (?, ?, ?, ?, ?)
  `);

  const result = stmt.run(hash, expiresAt, maxUses, emailAllowed || null, createdBy);

  return {
    id: result.lastInsertRowid,
    token: raw,
    expiresAt,
    maxUses,
    emailAllowed
  };
}

export function validateToken(rawToken) {
  if (!rawToken || typeof rawToken !== 'string' || rawToken.length !== 64) {
    return null;
  }

  const tokenHash = hashToken(rawToken);

  const invite = db.prepare(`
    SELECT * FROM invites
    WHERE token_hash = ?
      AND revoked = 0
      AND uses < max_uses
      AND datetime(expires_at) > datetime('now')
  `).get(tokenHash);

  return invite || null;
}

export function getInviteInfo(rawToken) {
  if (!rawToken || typeof rawToken !== 'string' || rawToken.length !== 64) {
    return { valid: false, reason: 'invalid' };
  }

  const tokenHash = hashToken(rawToken);

  const invite = db.prepare('SELECT * FROM invites WHERE token_hash = ?').get(tokenHash);

  if (!invite) {
    return { valid: false, reason: 'invalid' };
  }

  if (invite.revoked) {
    return { valid: false, reason: 'revoked' };
  }

  if (new Date(invite.expires_at) <= new Date()) {
    return { valid: false, reason: 'expired' };
  }

  if (invite.uses >= invite.max_uses) {
    return { valid: false, reason: 'exhausted' };
  }

  return {
    valid: true,
    emailRequired: invite.email_allowed,
    expiresAt: invite.expires_at
  };
}

export function consumeInvite(inviteId) {
  db.prepare('UPDATE invites SET uses = uses + 1 WHERE id = ?').run(inviteId);
}

export function listInvites(createdBy = null) {
  let query = 'SELECT id, expires_at, max_uses, uses, email_allowed, created_at, revoked FROM invites';
  let params = [];

  if (createdBy !== null) {
    query += ' WHERE created_by = ?';
    params.push(createdBy);
  }

  query += ' ORDER BY created_at DESC';

  return db.prepare(query).all(...params);
}

export function revokeInvite(inviteId) {
  db.prepare('UPDATE invites SET revoked = 1 WHERE id = ?').run(inviteId);
}

export function getInviteById(inviteId) {
  return db.prepare('SELECT * FROM invites WHERE id = ?').get(inviteId);
}

export function deleteInvite(inviteId) {
  db.prepare('DELETE FROM invites WHERE id = ?').run(inviteId);
}
