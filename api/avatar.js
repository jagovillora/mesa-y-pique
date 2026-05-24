const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).end();

  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { name, imageBase64, mimeType } = req.body || {};
  if (!name || !imageBase64) return res.status(400).json({ error: 'Missing name or image' });

  const ext = (mimeType || 'image/jpeg').split('/')[1].replace('jpeg', 'jpg');
  const filename = `${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}.${ext}`;
  const buffer = Buffer.from(imageBase64, 'base64');

  const { error: upErr } = await db.storage.from('avatars').upload(filename, buffer, {
    contentType: mimeType || 'image/jpeg',
    upsert: true,
  });
  if (upErr) return res.status(500).json({ error: upErr.message });

  const { data: { publicUrl } } = db.storage.from('avatars').getPublicUrl(filename);

  // Load existing avatars from settings and merge
  const { data: row } = await db.from('settings').select('value').eq('key', 'avatars').single();
  const avatars = row ? JSON.parse(row.value || '{}') : {};
  avatars[name] = publicUrl;

  await db.from('settings').upsert({ key: 'avatars', value: JSON.stringify(avatars) });

  res.status(200).json({ url: publicUrl });
};
