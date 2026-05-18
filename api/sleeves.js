const Groq = require('groq-sdk');

const SYSTEM = `Eres un experto en fundas para cartas de juegos de mesa. Tu tarea es identificar TODOS los tipos de cartas de un juego y asignarles el tamaño de funda correcto.

TAMAÑOS ESTÁNDAR (úsalos exactamente así):
- Mini American:        41 × 63 mm  (cartas pequeñas: recursos en Catan, monedas, etc.)
- Mini European:        44 × 68 mm  (cartas pequeñas europeas)
- Standard American:    56 × 87 mm  (cartas de desarrollo, muchos juegos de cartas)
- Standard Card Game:   63.5 × 88 mm (naipes estándar, poker)
- Standard European:    59 × 92 mm  (cartas grandes europeas, muchos euros)
- Tarot:                70 × 120 mm (cartas grandes de tarot/tamaño grande)
- Large Square:         80 × 80 mm  (cartas cuadradas)

REGLAS CRÍTICAS:
1. Las cartas del MISMO juego pueden tener tamaños DISTINTOS. Identifica cada tipo por separado.
2. En Catan: cartas de RECURSO = Mini American 41×63mm. Cartas de DESARROLLO = Standard American 56×87mm.
3. Revisa la descripción de componentes con cuidado para encontrar TODOS los tipos de cartas.
4. Si la descripción menciona el número exacto de cartas, úsalo. Si no, estima conservadoramente.
5. NO agrupes cartas de distinto tamaño en el mismo tipo.

Devuelve SOLO JSON válido:
{
  "found": true,
  "game": "nombre oficial",
  "sleeves": [
    {
      "type": "nombre del tipo de carta en español",
      "size": "nombre del tamaño",
      "width": 56,
      "height": 87,
      "quantity": 170,
      "notes": "nota o null"
    }
  ],
  "notes": "notas generales o null"
}

Si el juego no tiene cartas o no lo conoces: {"found": false, "game": "nombre"}`;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { game, bggData } = req.body || {};
  if (!game?.trim()) return res.status(400).json({ error: 'Falta el nombre del juego' });

  // Build context — BGG description gives accurate component counts
  let userMsg = `Juego: ${game.trim()}`;
  if (bggData?.description && bggData.description.length > 50) {
    const desc = bggData.description
      .replace(/&#10;/g, '\n')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .slice(0, 5000);
    userMsg = `Juego: ${bggData.name || game}\n\nDescripción e información de componentes de BoardGameGeek:\n${desc}`;
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: userMsg }
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
