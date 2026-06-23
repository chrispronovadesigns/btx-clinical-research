import type { APIRoute } from 'astro';
import { Resend } from 'resend';

export const prerender = false;

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'hello@example.com';
const INTERNAL_EMAIL = process.env.CONTACT_EMAIL || 'hello@example.com';

// Rate limit config
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 5; // max submissions per IP per window

async function checkRateLimit(ip: string): Promise<boolean> {
  const redisUrl = process.env.KV_REST_API_URL;
  const redisToken = process.env.KV_REST_API_TOKEN;

  if (!redisUrl || !redisToken) {
    return true;
  }

  const { Redis } = await import('@upstash/redis');
  const redis = new Redis({ url: redisUrl, token: redisToken });

  const key = `waitlist:ratelimit:${ip}`;
  const current = await redis.get<number>(key);

  if (current && typeof current === 'number' && current >= RATE_LIMIT_MAX) {
    return false;
  }

  const newCount = (typeof current === 'number' ? current : 0) + 1;
  await redis.set(key, newCount, { px: RATE_LIMIT_WINDOW_MS });
  return true;
}

async function verifyTurnstile(token: string, secretKey: string, remoteIp?: string): Promise<boolean> {
  try {
    const form = new URLSearchParams();
    form.append('secret', secretKey);
    form.append('response', token);
    if (remoteIp) form.append('remoteip', remoteIp);

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    });

    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  let body: Record<string, string> | null = null;

  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!body || !body.name || !body.email || !body.source) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing required fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Honeypot check
  if (body._gotcha) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Minimum time check (3 seconds)
  const loaded = parseInt(body._form_loaded || '0', 10);
  if (loaded && Date.now() - loaded < 3000) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Turnstile verification
  const turnstileToken = body['cf-turnstile-response'];
  const turnstileSecret = import.meta.env.TURNSTILE_SECRET_KEY;

  if (!turnstileSecret) {
    return new Response(JSON.stringify({ ok: false, error: 'Turnstile not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!turnstileToken) {
    return new Response(JSON.stringify({ ok: false, error: 'Bot verification required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const ip = clientAddress ?? request.headers.get('x-forwarded-for') ?? 'unknown';
  const turnstileOk = await verifyTurnstile(turnstileToken, turnstileSecret, ip ?? undefined);

  if (!turnstileOk) {
    return new Response(JSON.stringify({ ok: false, error: 'Bot verification failed. Please try again.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Rate limit check
  const rateOk = await checkRateLimit(ip);
  if (!rateOk) {
    return new Response(JSON.stringify({ ok: false, error: 'Too many submissions. Please try again later.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { name, email, source } = body;
  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  const nameParts = trimmedName.split(/\s+/);

  const apiKey = import.meta.env.RESEND_API_KEY;

  if (!apiKey) {
    console.error('[waitlist] RESEND_API_KEY is not configured');
    return new Response(JSON.stringify({ ok: false, error: 'Email service not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const resend = new Resend(apiKey);
  const audienceId = import.meta.env.RESEND_CONTACT_AUDIENCE_ID;

  // Add to Resend contact-form audience (best-effort, don't fail form if this errors)
  if (audienceId) {
    try {
      await resend.contacts.create({
        email: trimmedEmail,
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        unsubscribed: false,
        audienceId,
      });
    } catch (audienceErr) {
      console.error('[waitlist] Failed to add contact to audience:', audienceErr);
    }
  }

  // Send internal notification email
  try {
    await resend.emails.send({
      from: `Your Site <${FROM_EMAIL}>`,
      to: INTERNAL_EMAIL,
      replyTo: trimmedEmail,
      subject: `New waitlist signup: ${source}`,
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; color: #111;">
          <h2 style="font-size: 18px; margin: 0 0 16px; border-bottom: 3px solid #1652B0; padding-bottom: 12px;">New waitlist signup</h2>
          <table style="font-size: 14px; line-height: 1.6; border-collapse: collapse; width: 100%;">
            <tr><td style="padding: 6px 16px 6px 0; font-weight: 600; white-space: nowrap; vertical-align: top;">Name</td><td>${trimmedName}</td></tr>
            <tr><td style="padding: 6px 16px 6px 0; font-weight: 600; white-space: nowrap; vertical-align: top;">Email</td><td><a href="mailto:${trimmedEmail}">${trimmedEmail}</a></td></tr>
            <tr><td style="padding: 6px 16px 6px 0; font-weight: 600; white-space: nowrap; vertical-align: top;">Source</td><td>${source}</td></tr>
            <tr><td style="padding: 6px 16px 6px 0; font-weight: 600; white-space: nowrap; vertical-align: top;">IP</td><td>${ip}</td></tr>
            <tr><td style="padding: 6px 16px 6px 0; font-weight: 600; white-space: nowrap; vertical-align: top;">Time</td><td>${new Date().toISOString()}</td></tr>
          </table>
        </div>
      `,
    });
  } catch (err) {
    console.error('[waitlist] Resend email error:', err);
    return new Response(JSON.stringify({ ok: false, error: 'Failed to process signup' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
