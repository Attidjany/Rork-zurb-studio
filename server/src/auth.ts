import { Hono, Context, Next } from 'hono';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import { getPool, q, exec, uuid, withTx } from './db.js';
import { initializeAccountSettings } from './hooks.js';
import { sendMail } from './mail.js';

export interface AuthUser { id: string; email: string }
export type AuthEnv = { Variables: { user: AuthUser } };

const SECRET = () => process.env.JWT_SECRET || 'dev-secret-change-me';
const TOKEN_TTL = '30d';

function makeSession(user: AuthUser) {
  const access_token = jwt.sign({ sub: user.id, email: user.email }, SECRET(), { expiresIn: TOKEN_TTL });
  return { access_token, token_type: 'bearer', user: { id: user.id, email: user.email } };
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const p = jwt.verify(token, SECRET()) as any;
    if (!p?.sub) return null;
    return { id: String(p.sub), email: String(p.email || '') };
  } catch {
    return null;
  }
}

export async function requireAuth(c: Context<AuthEnv>, next: Next) {
  const h = c.req.header('authorization') || '';
  const token = h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : '';
  const user = token ? verifyToken(token) : null;
  if (!user) return c.json({ error: { message: 'Not authenticated', code: 'unauthorized' } }, 401);
  c.set('user', user);
  await next();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const authRoutes = new Hono<AuthEnv>();

authRoutes.post('/signup', async c => {
  const body = await c.req.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!EMAIL_RE.test(email)) return c.json({ error: { message: 'Invalid email address' } }, 400);
  if (password.length < 6) return c.json({ error: { message: 'Password should be at least 6 characters' } }, 400);
  const existing = await q(getPool(), 'SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length) return c.json({ error: { message: 'User already registered' } }, 400);
  const id = uuid();
  const hash = await bcrypt.hash(password, 10);
  await withTx(async conn => {
    await exec(conn, 'INSERT INTO users (id, email, password_hash) VALUES (?,?,?)', [id, email, hash]);
    await exec(conn, 'INSERT INTO profiles (id, email, role) VALUES (?,?,?)', [id, email, 'designer']);
    await initializeAccountSettings(conn, id);
  });
  const session = makeSession({ id, email });
  return c.json({ data: { user: session.user, session } });
});

authRoutes.post('/login', async c => {
  const body = await c.req.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const rows = await q(getPool(), 'SELECT id, email, password_hash FROM users WHERE email = ?', [email]);
  if (!rows.length || !(await bcrypt.compare(password, rows[0].password_hash))) {
    return c.json({ error: { message: 'Invalid login credentials' } }, 400);
  }
  const session = makeSession({ id: rows[0].id, email: rows[0].email });
  return c.json({ data: { user: session.user, session } });
});

authRoutes.post('/logout', async c => c.json({ data: {} }));

authRoutes.get('/session', async c => {
  const h = c.req.header('authorization') || '';
  const token = h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : '';
  const user = token ? verifyToken(token) : null;
  if (!user) return c.json({ data: { session: null } });
  const rows = await q(getPool(), 'SELECT id, email FROM users WHERE id = ?', [user.id]);
  if (!rows.length) return c.json({ data: { session: null } });
  return c.json({ data: { session: makeSession({ id: rows[0].id, email: rows[0].email }) } });
});

authRoutes.post('/reset-password', async c => {
  const body = await c.req.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  const rows = await q(getPool(), 'SELECT id FROM users WHERE email = ?', [email]);
  // Always answer the same way (no account enumeration).
  if (rows.length) {
    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000);
    await exec(getPool(), 'INSERT INTO password_resets (token, user_id, expires_at) VALUES (?,?,?)', [token, rows[0].id, expires]);
    const base = (process.env.SITE_URL || '').replace(/\/$/, '');
    const link = `${base}/api/auth/reset?token=${token}`;
    await sendMail(email, 'Reset your ZURB Studio password',
      `Open this link to choose a new password (valid 1 hour):\n\n${link}\n\nIf you did not request this, ignore this email.`,
      `<p>Open this link to choose a new password (valid 1 hour):</p><p><a href="${link}">${link}</a></p><p>If you did not request this, ignore this email.</p>`);
  }
  return c.json({ data: {} });
});

const resetPage = (token: string, msg = '') => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ZURB Studio — Reset password</title>
<style>body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f6f7f9;margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center}form{background:#fff;padding:32px;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,.08);width:320px}h1{font-size:20px;margin:0 0 16px}input{width:100%;box-sizing:border-box;padding:10px;margin:6px 0 14px;border:1px solid #d0d5dd;border-radius:8px;font-size:15px}button{width:100%;padding:11px;border:0;border-radius:8px;background:#1f6feb;color:#fff;font-size:15px;cursor:pointer}.msg{color:#b42318;margin-bottom:12px;font-size:14px}</style></head>
<body><form method="post" action="/api/auth/reset"><h1>Choose a new password</h1>${msg ? `<div class="msg">${msg}</div>` : ''}<input type="hidden" name="token" value="${token}"><label>New password<input type="password" name="password" minlength="6" required></label><label>Confirm<input type="password" name="confirm" minlength="6" required></label><button type="submit">Update password</button></form></body></html>`;

authRoutes.get('/reset', async c => {
  const token = c.req.query('token') || '';
  const rows = await q(getPool(), 'SELECT token FROM password_resets WHERE token = ? AND used_at IS NULL AND expires_at > NOW(3)', [token]);
  if (!rows.length) return c.html('<p style="font-family:sans-serif">This reset link is invalid or has expired. Request a new one from the app.</p>', 400);
  return c.html(resetPage(token));
});

authRoutes.post('/reset', async c => {
  const form = await c.req.parseBody();
  const token = String(form.token || '');
  const password = String(form.password || '');
  const confirm = String(form.confirm || '');
  const rows = await q(getPool(), 'SELECT user_id FROM password_resets WHERE token = ? AND used_at IS NULL AND expires_at > NOW(3)', [token]);
  if (!rows.length) return c.html('<p style="font-family:sans-serif">This reset link is invalid or has expired. Request a new one from the app.</p>', 400);
  if (password.length < 6) return c.html(resetPage(token, 'Password should be at least 6 characters'), 400);
  if (password !== confirm) return c.html(resetPage(token, 'Passwords do not match'), 400);
  const hash = await bcrypt.hash(password, 10);
  await withTx(async conn => {
    await exec(conn, 'UPDATE users SET password_hash = ? WHERE id = ?', [hash, rows[0].user_id]);
    await exec(conn, 'UPDATE password_resets SET used_at = NOW(3) WHERE token = ?', [token]);
  });
  const base = (process.env.SITE_URL || '').replace(/\/$/, '');
  return c.html(`<p style="font-family:sans-serif">Password updated. <a href="${base || '/'}">Return to ZURB Studio</a> and sign in.</p>`);
});
