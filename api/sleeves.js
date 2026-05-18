const Groq = require('groq-sdk');

const SYSTEM = `Eres un experto en juegos de mesa y fundas para cartas. Dado el nombre de un juego, indica qué fundas se necesitan para enfundar TODAS las cartas de la edición base.

Para cada tipo de carta proporciona:
- Nombre del tipo en español
- Nombre estándar del tamaño (Standard American, Mini American, Standard European, Mini European, Standard Card Game, Tarot, Large, etc.)
- Anchura exacta en mm
- Altura exacta en mm
- Cantidad (exacta si la conoces, aproximada si no)
- Notas opcionales

Devuelve SOLO JSON válido sin texto adicional:
{
  "found": true,
  "game": "nombre oficial",
  "sleeves": [
    {
      "type": "nombre del tipo de carta",
      "size": "nombre del tamaño",
      "width": 56,
      "height": 87,
      "quantity": 170,
      "notes": "nota o null"
    }
  ],
  "notes": "notas generales o null"
}

Si el juego no existe o no tiene cartas: {"found": false, "game": "nombre"}`;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { game } = req.body || {};
  if (!game?.trim()) return res.status(400).json({ error: 'Falta el nombre del juego' });

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `Juego: ${game.trim()}` }
      ],
      max_tokens: 1024,
      response_format: { type: 'json_object' }
    });

    let txt = completion.choices[0].message.content.trim();
    txt = txt.replace(/```json/gi, '').replace(/```/g, '').trim();
    const a = txt.indexOf('{'), z = txt.lastIndexOf('}');
    if (a >= 0 && z > a) txt = txt.slice(a, z + 1);
    res.json(JSON.parse(txt));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
