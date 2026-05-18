const https = require('https');

function get(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/xml, text/xml, */*'
      }
    }, res => {
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
  res.setHeader('Cache-Control', 'public, max-age=3600');
  try {
    const { status, data } = await get(`https://boardgamegeek.com${path}`);
    res.setHeader('Content-Type', 'text/xml; charset=utf-8');
    res.status(status).send(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
