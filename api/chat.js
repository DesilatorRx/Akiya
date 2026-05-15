// Vercel Edge Function. Proxies the Anthropic API so ANTHROPIC_API_KEY
// never reaches the browser. Used by both the property advisor chat and
// the akiya-bank letter generator.
//
// POST body: { system?: string, messages: [{ role, content }], maxTokens? }
// Response:  { text: string }  |  { error: string }

export const config = { runtime: 'edge' };

const MODEL = 'claude-sonnet-4-6';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

export default async function handler(req) {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
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
