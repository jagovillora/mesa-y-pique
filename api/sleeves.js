const { GoogleGenerativeAI } = require('@google/generative-ai');

const SYSTEM = `Eres un experto en juegos de mesa y fundas para cartas. Dado el nombre de un juego, indica qué fundas se necesitan para enfundar TODAS las cartas de la edición base.

Para cada tipo de carta proporciona:
- Nombre del tipo en español
- Nombre estándar del tamaño (Standard American, Mini American, Standard European, Mini European, Standard Card Game, Tarot, Large, etc.)
- Anchura exacta en mm
- Altura exacta en mm
- Cantidad (exacta si la conoces, aproximada si no)
- Notas opcionales (expansiones, variantes de edición, etc.)

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

Si el juego no existe o no tiene cartas: {"found": false, "game": "nombre"}
Sé preciso. Si no estás seguro de la cantidad exacta, pon una estimación e indícalo en notes.`;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { game } = req.body || {};
  if (!game?.trim()) return res.status(400).json({ error: 'Falta el nombre del juego' });

  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY);
  const model = genAI.getGenerativeModel(
    { model: 'gemini-1.5-flash' },
    { apiVersion: 'v1' }
  );

  try {
    const result = await model.generateContent(`${SYSTEM}\n\nJuego: ${game.trim()}`);
    let txt = result.response.text().trim();
    txt = txt.replace(/```json/gi, '').replace(/```/g, '').trim();
    const a = txt.indexOf('{'), z = txt.lastIndexOf('}');
    if (a >= 0 && z > a) txt = txt.slice(a, z + 1);
    res.json(JSON.parse(txt));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
