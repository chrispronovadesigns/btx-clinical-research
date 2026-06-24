import { describe, it, expect, vi, beforeEach } from 'vitest';

// Set up env vars before importing the route
process.env.TURNSTILE_SECRET_KEY = 'test-secret';
process.env.RESEND_API_KEY = 'test-key';
process.env.RESEND_CONTACT_AUDIENCE_ID = 'test-audience';

// We import dynamically to avoid module-level env var issues
async function getContactHandler() {
  const mod = await import('@/pages/api/contact');
  return mod.POST;
}

function createRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/contact', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 for invalid JSON', async () => {
    const req = new Request('http://localhost/api/contact', {
      method: 'POST',
      body: 'not-json',
    });
    const POST = await getContactHandler();
    const res = await POST({ request: req, clientAddress: '127.0.0.1' } as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toBe('Invalid JSON');
  });

  it('returns 400 for missing required fields', async () => {
    const POST = await getContactHandler();
    const res = await POST({
      request: createRequest({ email: 'test@test.com' }),
      clientAddress: '127.0.0.1',
    } as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Missing required fields');
  });

  it('returns 200 honeypot trap for bots', async () => {
    const POST = await getContactHandler();
    const res = await POST({
      request: createRequest({
        email: 'bot@test.com',
        name: 'Bot',
        message: 'spam',
        website: 'filled',
      }),
      clientAddress: '127.0.0.1',
    } as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it('returns 400 when turnstile token is missing', async () => {
    const POST = await getContactHandler();
    const res = await POST({
      request: createRequest({
        email: 'test@test.com',
        name: 'John Doe',
        message: 'Hello world',
      }),
      clientAddress: '127.0.0.1',
    } as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Bot verification required');
  });

  it('returns 403 when turnstile verification fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: false }),
    });

    const POST = await getContactHandler();
    const res = await POST({
      request: createRequest({
        email: 'test@test.com',
        name: 'John Doe',
        message: 'Hello world',
        'cf-turnstile-response': 'fake-token',
      }),
      clientAddress: '127.0.0.1',
    } as any);

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain('Bot verification failed');
  });

  it('returns 200 on successful submission', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
    });

    const POST = await getContactHandler();
    const res = await POST({
      request: createRequest({
        email: 'test@test.com',
        name: 'John Doe',
        phone: '(956) 280-5310',
        service: 'Clinical Research',
        message: 'Hello world',
        'cf-turnstile-response': 'valid-token',
      }),
      clientAddress: '127.0.0.1',
    } as any);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});
