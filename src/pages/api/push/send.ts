import type { APIRoute } from 'astro';
import webpush from 'web-push';

export const prerender = false;

// Protected admin endpoint — requires Authorization: Bearer <PUSH_SEND_SECRET>
// Usage:
//   curl -X POST https://example.com/api/push/send \
//     -H "Authorization: Bearer <your-secret>" \
//     -H "Content-Type: application/json" \
//     -d '{"title":"New post","body":"Check out our latest article.","url":"/blog/post-slug/"}'

function getEnv(key: string): string | undefined {
  return process.env[key];
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const sendSecret = getEnv('PUSH_SEND_SECRET');
    const authHeader = request.headers.get('Authorization');

    if (!sendSecret || authHeader !== `Bearer ${sendSecret}`) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let body: { title: string; body: string; url?: string; icon?: string };

    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!body?.title || !body?.body) {
      return new Response(JSON.stringify({ ok: false, error: 'title and body are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const publicKey = getEnv('VAPID_PUBLIC_KEY');
    const privateKey = getEnv('VAPID_PRIVATE_KEY');
    const email = getEnv('VAPID_EMAIL');

    if (!publicKey || !privateKey || !email) {
      return new Response(JSON.stringify({ ok: false, error: 'VAPID keys not configured' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const redisUrl = getEnv('KV_REST_API_URL');
    const redisToken = getEnv('KV_REST_API_TOKEN');

    if (!redisUrl || !redisToken) {
      return new Response(JSON.stringify({ ok: false, error: 'Redis not configured' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { Redis } = await import('@upstash/redis');
    const redis = new Redis({ url: redisUrl, token: redisToken });

    const stored = await redis.hgetall<Record<string, string>>('push:subscriptions');

    if (!stored || Object.keys(stored).length === 0) {
      return new Response(
        JSON.stringify({ ok: true, sent: 0, failed: 0, message: 'No subscribers' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    try {
      webpush.setVapidDetails(email, publicKey, privateKey);
    } catch (err) {
      console.error('[push/send] setVapidDetails error:', err);
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid VAPID configuration' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const payload = JSON.stringify({
      title: body.title,
      body: body.body,
      url: body.url || '/',
      icon: body.icon,
    });

    const entries = Object.entries(stored);
    const expiredEndpoints: string[] = [];
    const errors: { endpoint: string; statusCode?: number; message: string }[] = [];

    const results = await Promise.allSettled(
      entries.map(async ([endpoint, subJson]) => {
        const subscription = JSON.parse(subJson) as webpush.PushSubscription;
        try {
          await webpush.sendNotification(subscription, payload);
        } catch (err: unknown) {
          const statusCode = (err as { statusCode?: number })?.statusCode;
          const message = (err as Error)?.message || String(err);

          if (statusCode === 410 || statusCode === 404) {
            expiredEndpoints.push(endpoint);
          }

          errors.push({ endpoint: endpoint.slice(0, 60) + '...', statusCode, message });
          throw err;
        }
      })
    );

    if (expiredEndpoints.length > 0) {
      try {
        await redis.hdel('push:subscriptions', ...expiredEndpoints);
      } catch (err) {
        console.error('[push/send] cleanup error:', err);
      }
    }

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return new Response(
      JSON.stringify({ ok: true, sent, failed, subscribers: entries.length, errors }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[push/send] unhandled error:', err);
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'Internal server error',
        detail: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
