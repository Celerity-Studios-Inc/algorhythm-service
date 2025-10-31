#!/usr/bin/env node
// Fetch recent composites from NNA Registry (dev), derive component MFAs,
// call AlgoRhythm variations per layer, and emit a CSV.

import https from 'https';
import crypto from 'crypto';

const REGISTRY_BASE = process.env.NNA_REGISTRY_BASE_URL || 'https://registry.dev.reviz.dev';
const AR_BASE = process.env.ALGORHYTHM_BASE_URL || 'https://dev.algorhythm.media';
const API_KEY = process.env.AR_API_KEY || 'reviz-dev-30390-13220-4896-9516-9001';

// Dev JWT secret (must match Backend JWT_SECRET_DEV). Prefer env; fallback to known value if provided.
const DEV_JWT_SECRET = process.env.DEV_JWT_SECRET;
if (!DEV_JWT_SECRET) {
  console.error('❌ DEV_JWT_SECRET env var is required to run this exporter.');
  process.exit(1);
}

function signHS256(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const base64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const h = base64url(header);
  const p = base64url(payload);
  const data = `${h}.${p}`;
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${data}.${sig}`;
}

function httpsRequest(method, url, { headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      method,
      hostname: u.hostname,
      path: u.pathname + (u.search || ''),
      protocol: u.protocol,
      headers: {
        'Accept': 'application/json',
        ...headers,
      },
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', (d) => (data += d));
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, json, raw: data });
        } catch (e) {
          resolve({ status: res.statusCode, json: null, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function getJWT() {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    userId: 'system',
    email: 'system@algorhythm.media',
    role: 'user',
    iat: now,
    exp: now + 3600,
  };
  return signHS256(payload, DEV_JWT_SECRET);
}

function parseMfasFromCompositeName(name) {
  // Expect format: C.FUL.ALL.xxx:MFAs joined by '+'
  const idx = name.indexOf(':');
  if (idx === -1) return [];
  const suffix = name.slice(idx + 1);
  return suffix.split('+').map((s) => s.trim()).filter(Boolean);
}

function orderByLayers(components) {
  // Normalize to [G,S,L,M,W] list of MFAs if available
  const order = ['G', 'S', 'L', 'M', 'W'];
  const byLayer = new Map();
  for (const c of components || []) {
    if (!c || !c.layer) continue;
    byLayer.set(c.layer, c.nna_address || c.name);
  }
  return order.map((L) => byLayer.get(L) || '');
}

async function main() {
  const limit = parseInt(process.env.LIMIT || '30', 10);
  const token = await getJWT();

  const listUrl = `${REGISTRY_BASE}/api/v1/assets?layer=C&limit=${limit}`;
  const listRes = await httpsRequest('GET', listUrl, { headers: { Authorization: `Bearer ${token}` } });
  if (listRes.status !== 200 || !listRes.json) {
    console.error('Failed to fetch composites list', listRes.status, listRes.raw);
    process.exit(1);
  }
  const composites = Array.isArray(listRes.json.data) ? listRes.json.data : (listRes.json || []);

  const rows = [];
  rows.push(['composite_hfn','song_mfa','star_mfa','look_mfa','moves_mfa','world_mfa','vary_stars_ok','vary_looks_ok','vary_moves_ok','vary_world_ok']);

  for (const c of composites) {
    const name = c.name || '';
    let mfas = [];
    if (Array.isArray(c.components) && c.components.length > 0) {
      mfas = orderByLayers(c.components);
    } else {
      mfas = parseMfasFromCompositeName(name);
      if (mfas.length < 2) continue; // skip malformed
      // Ensure exactly 5 items if possible (pad/truncate)
      mfas = (mfas.concat(['','','',''])).slice(0,5);
    }

    const compositeId = mfas.filter(Boolean).join('+');
    const test = async (layers) => {
      const body = { composite_id: compositeId, vary_layers: layers, assets_per_layer: 5, variants_per_asset: 3 };
      const res = await httpsRequest('POST', `${AR_BASE}/api/v1/reviz/composite/variations`, {
        headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
        body,
      });
      if (res.status !== 200 || !res.json) return false;
      if (res.json.success === true) return true;
      const msg = res.json?.error?.message || '';
      if (/No current asset found|Composite not found/i.test(msg)) return false;
      // Consider other non-auth errors as fail
      return false;
    };

    const starsOk = await test(['stars']);
    const looksOk = await test(['looks']);
    const movesOk = await test(['moves']);
    const worldOk = await test(['worlds']);

    rows.push([
      name,
      mfas[0] || '',
      mfas[1] || '',
      mfas[2] || '',
      mfas[3] || '',
      mfas[4] || '',
      starsOk ? 'PASS' : 'FAIL',
      looksOk ? 'PASS' : 'FAIL',
      movesOk ? 'PASS' : 'FAIL',
      worldOk ? 'PASS' : 'FAIL',
    ]);
  }

  const csv = rows.map(r => r.map(v => String(v).includes(',') ? `"${String(v).replace(/"/g,'""')}"` : String(v)).join(',')).join('\n');
  console.log(csv);
}

main().catch((e) => {
  console.error('Unexpected error', e);
  process.exit(1);
});


