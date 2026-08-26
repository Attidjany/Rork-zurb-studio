import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { getPool } from './db.js';
import { ensureSchema } from './schema.js';
import { authRoutes } from './auth.js';
import { dbRoutes, rpcRoutes } from './dbapi.js';
import { duplicateRoutes } from './duplicate.js';
import { aiRoutes } from './ai.js';

const app = new Hono();
app.use('/api/*', cors());

app.get('/api/health', c => c.json({ status: 'ok', message: 'ZURB API is healthy', timestamp: new Date().toISOString() }));
app.get('/api', c => c.json({ status: 'ok', message: 'ZURB API is running' }));

app.route('/api/auth', authRoutes);
app.route('/api/db', dbRoutes);
app.route('/api/rpc', rpcRoutes);
app.route('/api', duplicateRoutes);
app.route('/api', aiRoutes);

app.notFound(c => {
  if (c.req.path.startsWith('/api/')) return c.json({ error: 'Not Found', path: c.req.path }, 404);
  return c.text('Not Found', 404);
});
app.onError((err, c) => {
  console.error('[server] unhandled', err);
  return c.json({ error: 'Internal server error', message: err.message }, 500);
});

// Optional static hosting of the exported web app (local dev / single-process setups).
const STATIC_DIR = process.env.STATIC_DIR;
if (STATIC_DIR && existsSync(STATIC_DIR)) {
  app.use('/*', serveStatic({ root: STATIC_DIR }));
  app.get('/*', c => {
    const index = join(STATIC_DIR, 'index.html');
    if (!existsSync(index)) return c.text('Not Found', 404);
    return c.html(readFileSync(index, 'utf8'));
  });
}

const port = Number(process.env.PORT || 3001);
(async () => {
  await ensureSchema(getPool());
  serve({ fetch: app.fetch, port, hostname: process.env.HOST || '127.0.0.1' }, info => {
    console.log(`[server] ZURB API listening on http://${info.address}:${info.port}`);
  });
})().catch(e => { console.error('[server] failed to start', e); process.exit(1); });
