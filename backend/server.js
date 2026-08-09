require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { MikrotikConn } = require('./mikrotik-api');

const app = express();
app.use(express.json());

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = (
  process.env.ALLOWED_ORIGINS ||
  'http://localhost:4200,https://ranjha7starcable.web.app'
)
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  }),
);

// ── MikroTik config ───────────────────────────────────────────────────────────
// RouterOS 6.x uses the MikroTik API protocol on port 8728.
// Enable it first on the router: /ip service set api disabled=no

// Server 1 — 103.66.149.194 (194.1002)
const MIKROTIK_HOST = process.env.MIKROTIK_HOST || '103.66.149.194';
const MIKROTIK_PORT = parseInt(process.env.MIKROTIK_PORT || '8728', 10);
const MIKROTIK_USER = process.env.MIKROTIK_USER || 'saqibr';
const MIKROTIK_PASS = process.env.MIKROTIK_PASS || '';

// Server 2 — 103.66.149.195 (195.9998)
const MIKROTIK_HOST_2 = process.env.MIKROTIK_HOST_2 || '103.66.149.195';
const MIKROTIK_PORT_2 = parseInt(process.env.MIKROTIK_PORT_2 || '8728', 10);
const MIKROTIK_USER_2 = process.env.MIKROTIK_USER_2 || 'admin';
const MIKROTIK_PASS_2 = process.env.MIKROTIK_PASS_2 || '';

function makeWithRouter(host, port, user, pass) {
  return async function withRouter(res, fn) {
    const conn = new MikrotikConn({ host, port, timeout: 6000 });
    try {
      await conn.connect(user, pass);
      const result = await fn(conn);
      res.json(result);
    } catch (err) {
      const msg = err?.message || String(err);
      if (msg.includes('ECONNREFUSED')) {
        res.status(503).json({ message: `Cannot connect to ${host}:${port}. Is the MikroTik API service enabled? (/ip service set api disabled=no)` });
      } else if (msg.includes('ETIMEDOUT') || msg.includes('timed out')) {
        res.status(504).json({ message: `Connection to ${host}:${port} timed out. Check that port ${port} is open and not blocked by the router firewall.` });
      } else {
        res.status(500).json({ message: msg });
      }
    } finally {
      conn.close();
    }
  };
}

const withRouter  = makeWithRouter(MIKROTIK_HOST,   MIKROTIK_PORT,   MIKROTIK_USER,   MIKROTIK_PASS);
const withRouter2 = makeWithRouter(MIKROTIK_HOST_2, MIKROTIK_PORT_2, MIKROTIK_USER_2, MIKROTIK_PASS_2);

// ── Route factory ────────────────────────────────────────────────────────────

function registerRoutes(prefix, withRtr) {
  // PPP / PPPoE secret  (most common for ISPs)
  app.put(`${prefix}/ppp/secret`, async (req, res) => {
    const { name, password, profile = 'default', service = 'pppoe', disabled = 'no' } = req.body;
    if (!name || !password) return res.status(400).json({ message: 'name and password are required' });
    await withRtr(res, (conn) => conn.add('/ppp/secret', { name, password, profile, service, disabled }));
  });

  // Hotspot user
  app.put(`${prefix}/ip/hotspot/user`, async (req, res) => {
    const { name, password, profile = 'default' } = req.body;
    if (!name || !password) return res.status(400).json({ message: 'name and password are required' });
    await withRtr(res, (conn) => conn.add('/ip/hotspot/user', { name, password, profile }));
  });

  // Router management user
  app.put(`${prefix}/user`, async (req, res) => {
    const { name, password, group = 'full' } = req.body;
    if (!name || !password) return res.status(400).json({ message: 'name and password are required' });
    await withRtr(res, (conn) => conn.add('/user', { name, password, group }));
  });

  // Get all PPP secrets
  app.get(`${prefix}/ppp/secret`, async (req, res) => {
    await withRtr(res, (conn) => conn.get('/ppp/secret'));
  });

  // Update PPP secret by .id (passed in body)
  app.patch(`${prefix}/ppp/secret`, async (req, res) => {
    const { id, ...attrs } = req.body;
    if (!id) return res.status(400).json({ message: 'id is required' });
    await withRtr(res, (conn) => conn.set('/ppp/secret', id, attrs));
  });

  // Delete PPP secret by .id (passed in body)
  app.delete(`${prefix}/ppp/secret`, async (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ message: 'id is required' });
    await withRtr(res, (conn) => conn.remove('/ppp/secret', id));
  });

  // PPP profiles (for populating the profile dropdown)
  app.get(`${prefix}/ppp/profile`, async (req, res) => {
    await withRtr(res, (conn) => conn.get('/ppp/profile'));
  });

  // Bulk enable all PPP secrets (single connection, loop server-side)
  app.post(`${prefix}/ppp/secret/bulk-enable`, async (req, res) => {
    await withRtr(res, async (conn) => {
      const secrets = await conn.get('/ppp/secret');
      let updated = 0;
      for (const secret of secrets) {
        if (secret.disabled === 'yes' || secret.disabled === 'true') {
          await conn.set('/ppp/secret', secret['.id'], { disabled: 'no' });
          updated++;
        }
      }
      return { updated, total: secrets.length };
    });
  });

  // Bulk disable all PPP secrets (single connection, loop server-side)
  app.post(`${prefix}/ppp/secret/bulk-disable`, async (req, res) => {
    await withRtr(res, async (conn) => {
      const secrets = await conn.get('/ppp/secret');
      let updated = 0;
      for (const secret of secrets) {
        if (secret.disabled !== 'yes' && secret.disabled !== 'true') {
          await conn.set('/ppp/secret', secret['.id'], { disabled: 'yes' });
          updated++;
        }
      }
      return { updated, total: secrets.length };
    });
  });

  // System resource (connection health check)
  app.get(`${prefix}/system/resource`, async (req, res) => {
    await withRtr(res, async (conn) => {
      const rows = await conn.get('/system/resource');
      return rows[0] || {};
    });
  });
}

// ── Register routes for both servers ─────────────────────────────────────────

registerRoutes('/mikrotik',  withRouter);   // Server 1 — 103.66.149.194
registerRoutes('/mikrotik2', withRouter2);  // Server 2 — 103.66.149.195

// Proxy liveness (no router connection)
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ── Start ─────────────────────────────────────────────────────────────────────
// When run directly (local dev), start the HTTP server.
// When imported by Vercel serverless, just export the app.
if (require.main === module) {
  const PORT = parseInt(process.env.PORT || '3000', 10);
  app.listen(PORT, () => {
    console.log(`MikroTik proxy running on http://localhost:${PORT}`);
    console.log(`Server 1: ${MIKROTIK_HOST}:${MIKROTIK_PORT}`);
    console.log(`Server 2: ${MIKROTIK_HOST_2}:${MIKROTIK_PORT_2}`);
  });
}

module.exports = app;
