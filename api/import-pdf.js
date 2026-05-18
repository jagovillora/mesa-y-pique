const Groq = require('groq-sdk');
const pdfParse = require('pdf-parse');
const { createClient } = require('@supabase/supabase-js');

const ADMIN_EMAIL = 'jagovillora@gmail.com';

const PROMPT = `Eres un experto en juegos de mesa que redacta fichas de referencia para un grupo de amigos. Te paso el texto extraído del reglamento completo de un juego. Tu trabajo es leerlo ENTERO y producir una ficha tan detallada y bien escrita como la haría un humano experto que se ha leído el manual y quiere dejar una chuleta impecable para jugar y para enseñar a otros.

═══ PRINCIPIOS (OBLIGATORIOS) ═══
1. TODO en ESPAÑOL claro y natural, aunque el reglamento esté en inglés u otro idioma: tradúcelo con criterio, no literalmente. Usa la terminología española habitual del juego si existe.
2. NIVEL DE DETALLE ALTO. No resumas en exceso: alguien debe poder jugar y arbitrar dudas solo con tu ficha. Incluye costes, límites, números concretos, excepciones y casos especiales relevantes.
3. Tono práctico de chuleta: frases directas, listas con "·", pasos numerados. Nada de relleno, marketing ni introducciones largas.
4. Estructura el texto con saltos de línea reales y subtítulos en MAYÚSCULAS cuando ayude.
5. Si el texto incluye expansiones, modos alternativos o variantes, INTÉGRALOS en "notes" con su propio subtítulo, traducidos.
6. Devuelve EXCLUSIVAMENTE un objeto JSON válido.

═══ ESTRUCTURA EXACTA DEL JSON ═══
{
  "name": "nombre oficial del juego",
  "meta": "Nº jugadores · duración · frase corta del tipo de juego",
  "rules": "Objetivo. Estructura de rondas/turnos. TODAS las acciones posibles explicadas con su coste y efecto. Condición de fin de partida. Cómo se gana.",
  "setup": "Puesta en mesa paso a paso: componentes comunes en la mesa y, aparte, qué recibe y prepara CADA jugador.",
  "notes": "Datos útiles: tipos de poderes/cartas, conceptos clave, expansiones, recordatorios, detalles finos de puntuación y consejos estratégicos breves.",
  "cats": ["categorías CORTAS de puntuación final","1-3 palabras cada una"]
}

Para "cats": las categorías REALES en las que se suman puntos al final de la partida. Si el juego se puntúa con un único total, devuelve "cats": [].`;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  try {
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    const { data: { user }, error } = await sb.auth.getUser(token);
    if (error || user?.email !== ADMIN_EMAIL) return res.status(403).json({ error: 'Solo el administrador puede importar PDFs' });
  } catch { return res.status(403).json({ error: 'Token inválido' }); }

  const { pdf } = req.body || {};
  if (!pdf) return res.status(400).json({ error: 'Falta el PDF en base64' });

  try {
    const buffer = Buffer.from(pdf, 'base64');
    const { text } = await pdfParse(buffer);
    if (!text || text.trim().length < 50) {
      return res.status(400).json({ error: 'No se pudo extraer texto del PDF. Comprueba que no sea un PDF escaneado como imagen.' });
    }

    const content = text.length > 90000 ? text.slice(0, 90000) + '\n[texto truncado por longitud]' : text;

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: PROMPT },
        { role: 'user', content: `Texto del reglamento:\n\n${content}` }
      ],
      max_tokens: 4096,
      response_format: { type: 'json_object' }
    });

    let txt = completion.choices[0].message.content.trim();
    txt = txt.replace(/```json/gi, '').replace(/```/g, '').trim();
    const a = txt.indexOf('{'), z = txt.lastIndexOf('}');
    if (a >= 0 && z > a) txt = txt.slice(a, z + 1);

    const game = JSON.parse(txt);
    if (!game.name) throw new Error('No se pudo identificar el nombre del juego');
    res.json({ ok: true, game });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
