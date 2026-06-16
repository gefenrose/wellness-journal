// Proxies AI requests from the Wellness Journal PWA to Groq's API
// (free tier, OpenAI-compatible), keeping the API key server-side.
// Deploy with wrangler (see README).
//
// The response is translated back into the same shape the frontend already
// expects ({ content: [{ text }] }), so index.html doesn't need to know
// which model is behind this.

const ALLOWED_ORIGINS = new Set([
  'https://gefenrose.github.io',     // GitHub Pages PWA
  'https://wellness-journal.pages.dev', // Cloudflare Pages PWA
  'http://localhost',                // local testing
  'http://127.0.0.1'                 // local testing
]);

const GROQ_MODEL = 'llama-3.3-70b-versatile';

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(origin) ? origin : 'https://gefenrose.github.io',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders(origin) });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response('Invalid JSON', { status: 400, headers: corsHeaders(origin) });
    }

    if (!body.prompt || typeof body.prompt !== 'string') {
      return new Response('Missing prompt', { status: 400, headers: corsHeaders(origin) });
    }

    const headers = { ...corsHeaders(origin), 'Content-Type': 'application/json' };

    try {
      const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [{ role: 'user', content: body.prompt }]
        })
      });

      const data = await upstream.json();
      if (!upstream.ok || data.error) {
        return new Response(JSON.stringify({ error: data.error?.message || 'Generation failed' }), {
          status: upstream.ok ? 502 : upstream.status,
          headers
        });
      }
      const text = data.choices?.[0]?.message?.content || '';
      return new Response(JSON.stringify({ content: [{ text }] }), { headers });
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Upstream request failed' }), { status: 502, headers });
    }
  }
};
