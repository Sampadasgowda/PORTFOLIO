import { GoogleGenAI } from '@google/genai';
import { readFileSync } from 'node:fs';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const index = JSON.parse(readFileSync(new URL('./index.json', import.meta.url), 'utf8'));

const hits = new Map();
const LIMIT = 15; // requests per IP per 10 minutes
const WINDOW = 10 * 60 * 1000;

function limited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > LIMIT;
}

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

const SYSTEM = `You are the portfolio assistant for Sampada S Gowda. Answer visitors' questions about her using ONLY the context provided. Refer to her in the third person. Be friendly and concise (2-4 sentences). If the answer is not in the context, say you don't have that information and suggest emailing sampadagowda18@gmail.com. Politely decline requests unrelated to Sampada's background.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0] || 'unknown';
  if (limited(ip)) return res.status(429).json({ reply: 'Too many messages. Please try again in a few minutes.' });

  const { message, history = [] } = req.body || {};
  if (typeof message !== 'string' || !message.trim() || message.length > 500) {
    return res.status(400).json({ reply: 'Please send a message under 500 characters.' });
  }

  try {
    const q = await ai.models.embedContent({
      model: 'gemini-embedding-001',
      contents: message,
      config: { taskType: 'RETRIEVAL_QUERY', outputDimensionality: 768 },
    });
    const qv = q.embeddings[0].values;
    const context = index
      .map((c) => ({ text: c.text, score: cosine(qv, c.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((c) => c.text)
      .join('\n\n---\n\n');

    const past = (Array.isArray(history) ? history : []).slice(-6).map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: String(m.text || '').slice(0, 500) }],
    }));

    const out = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [...past, { role: 'user', parts: [{ text: message }] }],
      config: { systemInstruction: `${SYSTEM}\n\nContext:\n${context}`, maxOutputTokens: 400 },
    });
    res.status(200).json({ reply: out.text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ reply: 'Sorry, something went wrong. Please try again or email sampadagowda18@gmail.com.' });
  }
}
