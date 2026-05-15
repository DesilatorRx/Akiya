// Vercel Edge Function. Proxies the Anthropic API so ANTHROPIC_API_KEY
// never reaches the browser. Used by both the property advisor chat and
// the akiya-bank letter generator.
//
// POST body: { system?: string, messages: [{ role, content }], maxTokens? }
// Response:  { text: string }  |  { error: string }

export const config = { runtime: 'edge' };

const MODEL = 'claude-sonnet-4-6';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

// ---- In-memory rate limiting -------------------------------------------
// Module scope persists on a warm Edge isolate. This is best-effort, not
// distributed: it throttles a client hammering one region/instance and
// caps total spend per instance. A determined abuser spread across many
// regions can get more through — upgrade to Upstash Redis if that matters.
const WINDOW_MS = 60_000;
const PER_IP_MAX = 15; // requests / IP / minute
const GLOBAL_MAX = 600; // requests / instance / minute (billing backstop)
const MAX_MESSAGES = 30; // bound input token cost per request
const MAX_CHARS = 12_000; // total chars across messages + system

const ipHits = new Map(); // ip -> { count, resetAt }
let globalHits = { count: 0, resetAt: 0 };

function rateLimit(ip) {
  const now = Date.now();

  if (now > globalHits.resetAt) {
    globalHits = { count: 0, resetAt: now + WINDOW_MS };
  }
  globalHits.count++;
  if (globalHits.count > GLOBAL_MAX) {
    return { ok: false, retryAfter: Math.ceil((globalHits.resetAt - now) / 1000) };
  }

  let rec = ipHits.get(ip);
  if (!rec || now > rec.resetAt) {
    rec = { count: 0, resetAt: now + WINDOW_MS };
    ipHits.set(ip, rec);
  }
  rec.count++;
  if (rec.count > PER_IP_MAX) {
    return { ok: false, retryAfter: Math.ceil((rec.resetAt - now) / 1000) };
  }

  // Prune stale IP entries opportunistically to bound memory.
  if (ipHits.size > 5_000) {
    for (const [k, v] of ipHits) if (now > v.resetAt) ipHits.delete(k);
  }
  return { ok: true };
}

function clientIp(req) {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const limited = rateLimit(clientIp(req));
  if (!limited.ok) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded. Please slow down.' }),
      {
        status: 429,
        headers: {
          'content-type': 'application/json',
          'retry-after': String(limited.retryAfter),
        },
      }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return json({ error: 'Server is missing ANTHROPIC_API_KEY.' }, 500);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }

  const { system, messages, maxTokens } = body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return json({ error: 'messages[] is required.' }, 400);
  }
  if (messages.length > MAX_MESSAGES) {
    return json({ error: `Too many messages (max ${MAX_MESSAGES}).` }, 400);
  }

  // Bound input token cost regardless of rate limit.
  const totalChars =
    (system ? system.length : 0) +
    messages.reduce(
      (n, m) => n + (typeof m?.content === 'string' ? m.content.length : 0),
      0
    );
  if (totalChars > MAX_CHARS) {
    return json(
      { error: `Request too large (max ${MAX_CHARS} characters).` },
      413
    );
  }

  // Guard against runaway token usage from a public endpoint.
  const max_tokens = Math.min(Math.max(Number(maxTokens) || 1024, 1), 2048);

  try {
    const upstream = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens,
        ...(system ? { system } : {}),
        messages,
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      return json(
        { error: `Anthropic API error (${upstream.status}): ${detail}` },
        502
      );
    }

    const data = await upstream.json();
    const text =
      data?.content?.map((b) => b.text || '').join('').trim() || '';
    return json({ text });
  } catch (err) {
    return json({ error: `Upstream request failed: ${err.message}` }, 502);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
