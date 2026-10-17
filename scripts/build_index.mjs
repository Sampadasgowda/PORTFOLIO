import { GoogleGenAI } from '@google/genai';
import { readdir, readFile, writeFile } from 'node:fs/promises';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const dir = new URL('../knowledge/', import.meta.url);

// one chunk per "# heading" section
const chunks = [];
for (const file of (await readdir(dir)).filter((f) => f.endsWith('.md'))) {
  const text = await readFile(new URL(file, dir), 'utf8');
  for (const part of text.split(/^# /m).filter((p) => p.trim())) {
    chunks.push({ source: file, text: part.trim() });
  }
}

const res = await ai.models.embedContent({
  model: 'gemini-embedding-001',
  contents: chunks.map((c) => c.text),
  config: { taskType: 'RETRIEVAL_DOCUMENT', outputDimensionality: 768 },
});

const out = chunks.map((c, i) => ({ ...c, embedding: res.embeddings[i].values }));
await writeFile(new URL('../api/index.json', import.meta.url), JSON.stringify(out));
console.log(`Indexed ${out.length} chunks`);
