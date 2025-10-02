const { MongoClient } = require('mongodb');
const getFetch = async () => {
  if (typeof fetch !== 'undefined') return fetch;
  const mod = await import('node-fetch');
  return mod.default;
};

async function loginOrRegister(email, password) {
  const fetchFn = await getFetch();
  const base = 'https://registry.dev.reviz.dev/api';
  try {
    const res = await fetchFn(`${base}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, username: email.split('@')[0] }),
    });
    await res.text();
  } catch (_) {}
  const login = await fetchFn(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await login.json();
  if (!data?.data?.token) throw new Error('Login failed');
  return data.data.token;
}

async function main() {
  const registryUri = process.env.REGISTRY_MONGODB_URI;
  if (!registryUri) throw new Error('Missing REGISTRY_MONGODB_URI');

  const client = new MongoClient(registryUri);
  await client.connect();
  const dbName = registryUri.split('/').pop().split('?')[0];
  const db = client.db(dbName);
  const assets = db.collection('assets');

  const candidates = await assets
    .find({ layer: 'G', nna_address: { $exists: true, $ne: '' } })
    .project({ _id: 0, name: 1, nna_address: 1 })
    .sort({ updatedAt: -1 })
    .limit(5)
    .toArray();

  console.log('Found G-layer assets:', candidates);

  const email = `algo-smoke-${Date.now()}@example.com`;
  const password = 'Test1234!';
  const token = await loginOrRegister(email, password);
  console.log('JWT length:', token.length);

  const devBase = 'https://dev.algorhythm.media/api/v1';
  const fetchFn = await getFetch();
  for (const a of candidates) {
    const res = await fetchFn(`${devBase}/recommend/template`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ song_id: a.nna_address, user_context: { user_id: 'smoke' } }),
    });
    const body = await res.json().catch(() => ({}));
    console.log('Song:', a.name, a.nna_address, '→', res.status, body?.error?.message || 'OK');
  }

  await client.close();
}

main().catch((e) => {
  console.error('Smoke test failed:', e.message);
  process.exit(1);
});


