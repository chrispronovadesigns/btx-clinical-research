import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let body: { endpoint?: string };

  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!body?.endpoint) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing endpoint' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = import.meta.env.KV_REST_API_URL;
  const token = import.meta.env.KV_REST_API_TOKEN;

  if (url && token) {
    try {
      const { Redis } = await import('@upstash/redis');
      const redis = new Redis({ url, token });
      await redis.hdel('push:subscriptions', body.endpoint);
    } catch (err) {
      console.error('[push/unsubscribe] Redis error:', err);
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
