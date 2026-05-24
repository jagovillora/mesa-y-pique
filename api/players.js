module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Missing Supabase config' });
  }

  const headers = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };

  if (req.method === 'POST') {
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ error: 'Missing name' });
    const r = await fetch(`${SUPABASE_URL}/rest/v1/players`, {
      method: 'POST', headers, body: JSON.stringify({ name }),
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json(data);
    return res.status(201).json(data);
  }

  if (req.method === 'DELETE') {
    const { name } = req.query;
    if (!name) return res.status(400).json({ error: 'Missing name' });
    const r = await fetch(`${SUPABASE_URL}/rest/v1/players?name=eq.${encodeURIComponent(name)}`, {
      method: 'DELETE', headers,
    });
    return res.status(r.ok ? 204 : r.status).end();
  }

  res.status(405).json({ error: 'Method not allowed' });
};
