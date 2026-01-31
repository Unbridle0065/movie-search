import { Router } from 'express';
import * as Invite from '../models/invite.js';
import * as User from '../models/user.js';

export const adminRouter = Router();

// Strict type validation helper
function isString(value) {
  return typeof value === 'string';
}

// Middleware to require admin - verifies against database on each request
const requireAdmin = (req, res, next) => {
  if (!req.session?.authenticated || !req.session?.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Re-verify admin status from database (not cached session)
  const user = User.findById(req.session.userId);
  if (!user || !user.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
};

// Apply admin middleware to all routes
adminRouter.use(requireAdmin);

// Create invite
adminRouter.post('/invites', (req, res) => {
  const { maxUses = 1, expiresIn = '7d', emailAllowed } = req.body;

  // Validate maxUses
  if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 100) {
    return res.status(400).json({ error: 'maxUses must be between 1 and 100' });
  }

  // Validate expiresIn format (must be string)
  if (!isString(expiresIn) || !/^\d+[hdm]$/.test(expiresIn)) {
    return res.status(400).json({ error: 'Invalid expiration format. Use format like "24h", "7d", or "1m"' });
  }

  // Validate email (required, must be string)
  if (!isString(emailAllowed) || !User.isValidEmail(emailAllowed)) {
    return res.status(400).json({ error: 'Valid email is required' });
  }

  try {
    const invite = Invite.createInvite({
      maxUses,
      expiresIn,
      emailAllowed,
      createdBy: req.session.userId
    });

    // Build invite URL
    const baseUrl = process.env.CORS_ORIGIN || `http://localhost:${process.env.PORT || 3001}`;
    const inviteUrl = `${baseUrl}/signup?token=${invite.token}`;

    res.status(201).json({
      success: true,
      token: invite.token,
      inviteUrl,
      expiresAt: invite.expiresAt
    });
  } catch (error) {
    console.error('Create invite error:', error);
    res.status(500).json({ error: 'Failed to create invite' });
  }
});

// List invites
adminRouter.get('/invites', (req, res) => {
  try {
    const invites = Invite.listInvites();

    // Add status to each invite
    const now = new Date();
    const invitesWithStatus = invites.map(invite => ({
      ...invite,
      status: invite.revoked ? 'revoked' :
        new Date(invite.expires_at) <= now ? 'expired' :
        invite.uses >= invite.max_uses ? 'exhausted' : 'active'
    }));

    res.json({ invites: invitesWithStatus });
  } catch (error) {
    console.error('List invites error:', error);
    res.status(500).json({ error: 'Failed to list invites' });
  }
});

// Revoke or delete invite
adminRouter.delete('/invites/:id', (req, res) => {
  const inviteId = parseInt(req.params.id);

  if (!Number.isInteger(inviteId)) {
    return res.status(400).json({ error: 'Invalid invite ID' });
  }

  const invite = Invite.getInviteById(inviteId);
  if (!invite) {
    return res.status(404).json({ error: 'Invite not found' });
  }

  try {
    // If already revoked, permanently delete; otherwise just revoke
    if (invite.revoked) {
      Invite.deleteInvite(inviteId);
      res.json({ success: true, deleted: true });
    } else {
      Invite.revokeInvite(inviteId);
      res.json({ success: true, revoked: true });
    }
  } catch (error) {
    console.error('Revoke/delete invite error:', error);
    res.status(500).json({ error: 'Failed to process invite' });
  }
});
