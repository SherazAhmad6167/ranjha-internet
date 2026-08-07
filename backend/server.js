require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { MikrotikConn } = require('./mikrotik-api');

const app = express();
app.use(express.json());

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:4200')
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
    methods: ['GET', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  }),
);

// ── MikroTik config ───────────────────────────────────────────────────────────
// RouterOS 6.x uses the MikroTik API protocol on port 8728.
// Enable it first on the router: /ip service set api disabled=no
const MIKROTIK_HOST = process.env.MIKROTIK_HOST || '103.66.149.194';
const MIKROTIK_PORT = parseInt(process.env.MIKROTIK_PORT || '8728', 10);
const MIKROTIK_USER = process.env.MIKROTIK_USER || 'saqibr';
const MIKROTIK_PASS = process.env.MIKROTIK_PASS || '';

async function withRouter(res, fn) {
  const conn = new MikrotikConn({ host: MIKROTIK_HOST, port: MIKROTIK_PORT });
  try {
    await conn.connect(MIKROTIK_USER, MIKROTIK_PASS);
    const result = await fn(conn);
    res.json(result);
  } catch (err) {
    const msg = err?.message || String(err);
    if (msg.includes('ECONNREFUSED')) {
      res.status(503).json({ message: 'Cannot connect to MikroTik router. Is port 8728 enabled?' });
    } else if (msg.includes('ETIMEDOUT') || msg.includes('timed out')) {
      res.status(504).json({ message: 'Connection to MikroTik router timed out.' });
    } else {
      res.status(500).json({ message: msg });
    }
  } finally {
    conn.close();
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

// PPP / PPPoE secret  (most common for ISPs)
app.put('/mikrotik/ppp/secret', async (req, res) => {
  const { name, password, profile = 'default', service = 'pppoe' } = req.body;
  if (!name || !password) return res.status(400).json({ message: 'name and password are required' });

  await withRouter(res, (conn) =>
    conn.add('/ppp/secret', { name, password, profile, service }),
  );
});

// Hotspot user
app.put('/mikrotik/ip/hotspot/user', async (req, res) => {
  const { name, password, profile = 'default' } = req.body;
  if (!name || !password) return res.status(400).json({ message: 'name and password are required' });

  await withRouter(res, (conn) =>
    conn.add('/ip/hotspot/user', { name, password, profile }),
  );
});

// Router management user
app.put('/mikrotik/user', async (req, res) => {
  const { name, password, group = 'full' } = req.body;
  if (!name || !password) return res.status(400).json({ message: 'name and password are required' });

  await withRouter(res, (conn) =>
    conn.add('/user', { name, password, group }),
  );
});

// System resource (connection health check)
app.get('/mikrotik/system/resource', async (req, res) => {
  await withRouter(res, async (conn) => {
    const rows = await conn.get('/system/resource');
    return rows[0] || {};
  });
});

// Proxy liveness (no router connection)
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3000', 10);
app.listen(PORT, () => {
  console.log(`MikroTik proxy running on http://localhost:${PORT}`);
  console.log(`Router: ${MIKROTIK_HOST}:${MIKROTIK_PORT}`);
});
