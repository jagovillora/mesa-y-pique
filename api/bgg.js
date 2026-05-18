const https = require('https');

function get(url, token) {
  return new Promise((resolve, reject) => {
    const headers = { 'User-Agent': 'mesa-y-pique/1.0 (personal board game tracker)' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const req = https.get(url, { headers }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, data: d }));
    });
    req.setTimeout(9000, () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  const path = req.query.path;
  if (!path || !path.startsWith('/xmlapi2/')) return res.status(400).end();

  const token = process.env.BGG_TOKEN;
  if (!token) {
    return res.status(503).json({ error: 'BGG_TOKEN no configurado. Registra la app en boardgamegeek.com/applications.' });
  }

  res.setHeader('Cache-Control', 'public, max-age=3600');
  try {
    const { status, data } = await get(`https://boardgamegeek.com${path}`, token);
    res.setHeader('Content-Type', 'text/xml; charset=utf-8');
    res.status(status).send(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
