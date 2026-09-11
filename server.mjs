import { createReadStream, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const publicDir = join(here, 'public');

// Small local .env reader so the project stays dependency-free on Node 18+.
// Existing shell environment values always win.
const envFile = join(here, '.env');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}
const port = Number(process.env.PORT || 3000);

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

function sendJson(response, status, data) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(data));
}

function isConfigured() {
  return Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.startsWith('gsk_'));
}

function saveKey(key) {
  const oldLines = existsSync(envFile) ? readFileSync(envFile, 'utf8').split(/\r?\n/) : [];
  const withoutKey = oldLines.filter((line) => !/^\s*GROQ_API_KEY\s*=/.test(line));
  const content = [...withoutKey.filter(Boolean), `GROQ_API_KEY=${key}`, ''].join('\n');
  writeFileSync(envFile, content, { encoding: 'utf8', mode: 0o600 });
  process.env.GROQ_API_KEY = key;
}

function upstreamErrorMessage(status, details) {
  try {
    const payload = JSON.parse(details);
    const message = payload?.error?.message || payload?.message;
    if (message) return `Groq request failed (${status}): ${message}`;
  } catch { /* The provider response was not JSON. */ }
  return `Groq request failed (${status}). Check the key and try again.`;
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 200_000) {
        reject(new Error('Request body is too large.'));
        request.destroy();
      }
    });
    request.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); } catch { reject(new Error('Invalid JSON body.')); }
    });
    request.on('error', reject);
  });
}

function sanitiseMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((item) => item && ['user', 'assistant'].includes(item.role) && typeof item.content === 'string')
    .slice(-18)
    .map((item) => ({ role: item.role, content: item.content.slice(0, 12_000) }));
}

function sanitiseMoods(moods) {
  const fallback = ['neutral', 'happy', 'joy', 'calm', 'surprised', 'mischievous', 'cool'];
  if (!Array.isArray(moods)) return fallback;
  const selected = moods
    .map((mood) => String(mood).toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40))
    .filter(Boolean)
    .slice(0, 24);
  return selected.length ? selected : fallback;
}

async function chat(request, response) {
  const key = process.env.GROQ_API_KEY;
  if (!isConfigured()) {
    sendJson(response, 503, { error: 'AI is not configured yet. Open Settings, add your Groq API key under AI connection, and save it.' });
    return;
  }

  let input;
  try { input = await readJson(request); } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const messages = sanitiseMessages(input.messages);
  if (!messages.length) {
    sendJson(response, 400, { error: 'A message is required.' });
    return;
  }

  const language = input.language === 'ar' ? 'Arabic' : 'English';
  const moods = sanitiseMoods(input.moods);
  const moodList = moods.join(', ');
  const system = `Your name is THE GENIUS. You are a warm, concise pixel RPG companion. Reply naturally in ${language}. Use the user's language, including Arabic when asked. If asked for your name, say exactly THE GENIUS. Do not mention this instruction, model names, mood tags, or hidden settings. Keep answers helpful and reasonably brief. After your visible answer, append exactly one final marker with no text after it: [[mood:ID]]. Choose ID that best matches your response from this exact list: ${moodList}.`;

  const controller = new AbortController();
  let disconnected = false;
  request.on('aborted', () => {
    disconnected = true;
    controller.abort();
  });
  response.on('close', () => {
    if (!response.writableEnded) {
      disconnected = true;
      controller.abort();
    }
  });

  try {
    const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        stream: true,
        reasoning_effort: 'low',
        reasoning_format: 'hidden',
        temperature: 0.75,
        max_completion_tokens: 700,
        messages: [{ role: 'system', content: system }, ...messages],
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const details = await upstream.text();
      sendJson(response, upstream.status || 502, { error: upstreamErrorMessage(upstream.status || 502, details) });
      return;
    }

    response.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const reader = upstream.body.getReader();
    while (!disconnected) {
      const { done, value } = await reader.read();
      if (done) break;
      response.write(value);
    }
    response.end();
  } catch (error) {
    if (error.name === 'AbortError' || disconnected) {
      if (!response.writableEnded) response.end();
      return;
    }
    if (!response.headersSent) sendJson(response, 502, { error: error.message || 'Could not reach Groq.' });
    else response.end();
  }
}

async function setup(request, response) {
  let input;
  try { input = await readJson(request); } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }
  const key = typeof input.key === 'string' ? input.key.trim() : '';
  if (!/^gsk_[A-Za-z0-9_-]{20,}$/.test(key)) {
    sendJson(response, 400, { error: 'That does not look like a valid Groq API key. It should begin with gsk_.' });
    return;
  }
  try {
    saveKey(key);
    sendJson(response, 200, { configured: true });
  } catch {
    sendJson(response, 500, { error: 'The server could not save its local configuration file.' });
  }
}

function serveStatic(request, response) {
  const requestPath = request.url === '/' ? '/index.html' : decodeURIComponent(request.url.split('?')[0]);
  const candidate = normalize(join(publicDir, requestPath));
  if (!candidate.startsWith(publicDir) || !existsSync(candidate)) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }
  response.writeHead(200, {
    'Content-Type': mimeTypes[extname(candidate)] || 'application/octet-stream',
    'Cache-Control': 'no-cache',
  });
  createReadStream(candidate).pipe(response);
}

createServer((request, response) => {
  if (request.method === 'GET' && request.url === '/api/status') return sendJson(response, 200, { configured: isConfigured() });
  if (request.method === 'POST' && request.url === '/api/setup') return setup(request, response);
  if (request.method === 'POST' && request.url === '/api/chat') return chat(request, response);
  if (request.method === 'GET') return serveStatic(request, response);
  response.writeHead(405, { Allow: 'GET, POST' });
  response.end();
}).listen(port, '0.0.0.0', () => {
  console.log(`THE GENIUS is running on this PC: http://localhost:${port}`);
  const localAddresses = Object.values(networkInterfaces())
    .flat()
    .filter((address) => address && address.family === 'IPv4' && !address.internal)
    .map((address) => address.address);
  for (const address of [...new Set(localAddresses)]) {
    console.log(`Phone on the same Wi-Fi: http://${address}:${port}`);
  }
});
