const https = require('https');

function get(url, timeoutMs = 7000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'mesa-y-pique/1.0' } }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return get(res.headers.location, timeoutMs).then(resolve).catch(reject);
      }
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    });
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=86400');
  const name = req.query?.name;
  if (!name) return res.status(400).json({ image: null });

  try {
    // 1. Exact search first, then fuzzy
    let xml = await get(`https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(name)}&type=boardgame&exact=1`);
    let id = xml.match(/<item[^>]*objectid="(\d+)"/)?.[1];

    if (!id) {
      xml = await get(`https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(name)}&type=boardgame`);
      id = xml.match(/<item[^>]*objectid="(\d+)"/)?.[1];
    }
    if (!id) return res.json({ image: null });

    // 2. Get thing details
    const thing = await get(`https://boardgamegeek.com/xmlapi2/thing?id=${id}`);
    if (thing.includes('try again later') || thing.includes('processing')) {
      return res.json({ image: null });
    }

    let img = (thing.match(/<image>(.*?)<\/image>/) || [])[1]?.trim();
    if (!img) return res.json({ image: null });
    if (img.startsWith('//')) img = 'https:' + img;

    res.json({ image: img, bggId: id });
  } catch {
    res.json({ image: null });
  }
};
