// Cloudflare Worker that lets every learner use the chat without their own API key.
// It adds your Anthropic API key (stored as a Worker secret, never in the site's code)
// to chat requests coming from your site, and passes the streamed answer back.
//
// Setup (see README.md, "Shared chat server"):
//   ANTHROPIC_API_KEY  secret  your key from console.anthropic.com
//   ALLOWED_ORIGINS    var     e.g. https://ramyalakshmanan.github.io
//
// Requests are limited to the model and settings the site uses, so the key
// cannot be used for anything else through this Worker. Set a monthly spend
// limit in the Anthropic Console as well, since anyone visiting your site can chat.

const MODEL = 'claude-opus-5-5';
const MAX_TOKENS = 16000;
const MAX_BODY_BYTES = 200_000;

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
    const ok = allowed.includes(origin);
    const cors = {
      'Access-Control-Allow-Origin': ok ? origin : allowed[0] || '',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    };
    if (request.method === 'OPTIONS') return new Response(null, { status: ok ? 204 : 403, headers: cors });
    if (!ok) return new Response('Forbidden', { status: 403, headers: cors });

    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== '/v1/messages') {
      return new Response('Not found', { status: 404, headers: cors });
    }

    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return new Response('Conversation too long', { status: 413, headers: cors });
    let body;
    try { body = JSON.parse(raw); } catch { return new Response('Bad request', { status: 400, headers: cors }); }

    // Only plain chat: fixed model, capped length, no tools or outside servers.
    body.model = MODEL;
    body.max_tokens = Math.min(Number(body.max_tokens) || MAX_TOKENS, MAX_TOKENS);
    delete body.tools; delete body.tool_choice; delete body.mcp_servers; delete body.container;

    const headers = {
      'content-type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': request.headers.get('anthropic-version') || '2023-06-01',
    };
    const beta = request.headers.get('anthropic-beta');
    if (beta) headers['anthropic-beta'] = beta;

    const upstream = await fetch('https://api.anthropic.com/v1/messages' + url.search, {
      method: 'POST', headers, body: JSON.stringify(body),
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { ...cors, 'content-type': upstream.headers.get('content-type') || 'application/json' },
    });
  },
};
