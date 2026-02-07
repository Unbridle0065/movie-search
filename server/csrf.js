import crypto from 'crypto';

const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
// Paths relative to the mount point (middleware mounted at /api)
const EXEMPT_ROUTES = new Set(['/login', '/signup', '/invite/validate']);

function parseCookie(req, name) {
  const header = req.get('cookie');
  if (!header) return undefined;
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

export function generateCsrfToken(req, res) {
  if (!req.session) return null;

  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }

  res.cookie(CSRF_COOKIE_NAME, req.session.csrfToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });

  return req.session.csrfToken;
}

export function clearCsrfCookie(res) {
  res.clearCookie(CSRF_COOKIE_NAME, { path: '/' });
}

export function csrfProtection(req, res, next) {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  if (EXEMPT_ROUTES.has(req.path)) {
    return next();
  }

  const cookieToken = parseCookie(req, CSRF_COOKIE_NAME);
  const headerToken = req.get(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken) {
    return res.status(403).json({ error: 'CSRF token missing' });
  }

  if (cookieToken !== headerToken || cookieToken !== req.session?.csrfToken) {
    return res.status(403).json({ error: 'CSRF token invalid' });
  }

  next();
}
