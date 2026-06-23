import type { APIRoute } from 'astro';
import webpush from 'web-push';

export const prerender = false;

type PushSubscription = {
  endpoint: string;
  expirationTime?: number | null;
  keys: { auth: string; p256dh: string };
};

function getEnv(key: string): string | undefined {
  // process.env is more reliable than import.meta.env in Vercel serverless
  return process.env[key];
}

function isValidVapidEmail(email: string): boolean {
  return email.startsWith('mailto:') || email.startsWith('https://');
}

async function storeSubscription(subscription: PushSubscription): Promise<void> {
  const url = getEnv('KV_REST_API_URL');
  const token = getEnv('KV_REST_API_TOKEN');
  if (!url || !token) {
    console.warn('[push/subscribe] KV_REST_API_URL/TOKEN not set — subscription not persisted');
    return;
  }
  const { Redis } = await import('@upstash/redis');
  const redis = new Redis({ url, token });
  await redis.hset('push:subscriptions', {
    [subscription.endpoint]: JSON.stringify(subscription),
  });
}

export const POST: APIRoute = async ({ request }) => {
  try {
    let subscription: PushSubscription;

    try {
      subscription = await request.json();
    } catch {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!subscription?.endpoint || !subscription?.keys?.auth || !subscription?.keys?.p256dh) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid subscription object' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const publicKey = getEnv('VAPID_PUBLIC_KEY');
    const privateKey = getEnv('VAPID_PRIVATE_KEY');
    const email = getEnv('VAPID_EMAIL');

    if (!publicKey || !privateKey || !email) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Push notifications not configured' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!isValidVapidEmail(email)) {
      return new Response(
        JSON.stringify({ ok: false, error: 'VAPID_EMAIL must start with mailto: or https://' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    try {
      await storeSubscription(subscription);
    } catch (err) {
      console.error('[push/subscribe] storage error:', err);
    }

    try {
      webpush.setVapidDetails(email, publicKey, privateKey);
    } catch (err) {
      console.error('[push/subscribe] setVapidDetails error:', err);
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid VAPID configuration' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    try {
      await webpush.sendNotification(
        subscription as webpush.PushSubscription,
        JSON.stringify({
          title: 'Subscribed',
          body: "You'll now receive updates on new content and announcements.",
          url: '/',
        })
      );
    } catch (err) {
      console.warn('[push/subscribe] welcome notification failed:', err);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[push/subscribe] unhandled error:', err);
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
