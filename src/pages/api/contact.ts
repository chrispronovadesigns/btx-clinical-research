import type { APIRoute } from 'astro';
import { Resend } from 'resend';

export const prerender = false;

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'contact@btxclinicalresearch.com';
const INTERNAL_EMAIL = process.env.CONTACT_EMAIL || 'info@btxclinicalresearch.com';

// Rate limit config
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 3; // max submissions per IP per window

async function checkRateLimit(ip: string): Promise<boolean> {
  const redisUrl = process.env.KV_REST_API_URL;
  const redisToken = process.env.KV_REST_API_TOKEN;

  if (!redisUrl || !redisToken) {
    // Redis not configured — allow through (don't block legitimate users)
    return true;
  }

  const { Redis } = await import('@upstash/redis');
  const redis = new Redis({ url: redisUrl, token: redisToken });

  const key = `contact:ratelimit:${ip}`;
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

  if (!body || !body.email || !body.name || !body.message) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing required fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Honeypot check
  if (body.website || body._gotcha) {
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

  const { name, email, phone, service, message } = body;

  const apiKey = import.meta.env.RESEND_API_KEY;

  if (!apiKey) {
    console.error('[contact] RESEND_API_KEY is not configured');
    return new Response(JSON.stringify({ ok: false, error: 'Email service not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const resend = new Resend(apiKey);

  try {
    await resend.emails.send({
      from: `BTX Clinical Research <${FROM_EMAIL}>`,
      to: INTERNAL_EMAIL,
      replyTo: email,
      subject: `New contact: ${name}${service ? ` — ${service}` : ''}`,
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; color: #111;">
          <h2 style="font-size: 18px; margin: 0 0 16px; border-bottom: 3px solid #172161; padding-bottom: 12px;">New contact form submission</h2>
          <table style="font-size: 14px; line-height: 1.6; border-collapse: collapse; width: 100%;">
            <tr><td style="padding: 6px 16px 6px 0; font-weight: 600; white-space: nowrap; vertical-align: top;">Name</td><td>${name}</td></tr>
            <tr><td style="padding: 6px 16px 6px 0; font-weight: 600; white-space: nowrap; vertical-align: top;">Email</td><td><a href="mailto:${email}">${email}</a></td></tr>
            <tr><td style="padding: 6px 16px 6px 0; font-weight: 600; white-space: nowrap; vertical-align: top;">Phone</td><td>${phone || 'Not provided'}</td></tr>
            <tr><td style="padding: 6px 16px 6px 0; font-weight: 600; white-space: nowrap; vertical-align: top;">Service</td><td>${service || 'Not specified'}</td></tr>
          </table>
          <div style="margin-top: 24px; padding: 16px; background: #f7f7f7; border-radius: 8px;">
            <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #888; margin: 0 0 8px; font-weight: 600;">Message</p>
            <p style="font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${message}</p>
          </div>
        </div>
      `,
    });
  } catch (err) {
    console.error('[contact] Resend error:', err);
    return new Response(JSON.stringify({ ok: false, error: 'Failed to send email' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
