// Local preview: serves the static site and mounts api/chat.js (Vercel's `vercel dev` without the login).
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import handler from '../api/chat.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.json': 'application/json' };
const blocked = /^(\.env|\.git|private|node_modules|knowledge|scripts|api)/;

http.createServer(async (req, res) => {
  const path = decodeURIComponent(req.url.split('?')[0]);

  if (path === '/api/chat') {
    let raw = '';
    for await (const c of req) raw += c;
    try { req.body = JSON.parse(raw || '{}'); } catch { req.body = {}; }
    res.status = (c) => { res.statusCode = c; return res; };
    res.json = (o) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); };
    return handler(req, res);
  }

  const rel = normalize(path === '/' ? 'index.html' : path.slice(1));
  if (rel.startsWith('..') || blocked.test(rel)) { res.statusCode = 404; return res.end('Not found'); }
  try {
    const body = await readFile(join(root, rel));
    res.setHeader('Content-Type', types[extname(rel)] || 'application/octet-stream');
    res.end(body);
  } catch {
    res.statusCode = 404;
    res.end('Not found');
  }
}).listen(3000, () => console.log('Portfolio running at http://localhost:3000'));
