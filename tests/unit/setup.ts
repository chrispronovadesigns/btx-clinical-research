import { vi } from 'vitest';

// Create a mockable Redis constructor (must be a real function for `new`)
function createMockRedis(overrides?: Record<string, unknown>) {
  const defaultMock = {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    hset: vi.fn().mockResolvedValue(1),
    hgetall: vi.fn().mockResolvedValue({}),
    hdel: vi.fn().mockResolvedValue(1),
  };
  return { ...defaultMock, ...overrides };
}

// Global mocks for external services
vi.mock('resend', () => {
  const mockResendInstance = {
    emails: {
      send: vi.fn().mockResolvedValue({ error: null }),
    },
    contacts: {
      create: vi.fn().mockResolvedValue({ id: 'test-contact-id' }),
    },
    batch: {
      send: vi.fn().mockResolvedValue({ data: { id: 'test-batch-id' } }),
    },
  };

  // Must be a proper function constructor for `new Resend()`
  function MockResend() {
    return mockResendInstance;
  }

  return {
    Resend: MockResend,
  };
});

vi.mock('@upstash/redis', () => {
  // Must be a proper function constructor for `new Redis()`
  function MockRedis() {
    return createMockRedis();
  }

  return {
    Redis: MockRedis,
  };
});

vi.mock('web-push', () => {
  return {
    default: {
      setVapidDetails: vi.fn(),
      sendNotification: vi.fn().mockResolvedValue(undefined),
    },
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn().mockResolvedValue(undefined),
  };
});

// Mock node:fs for static file reads
vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs');
  return {
    ...(actual as any),
    readFileSync: vi.fn().mockReturnValue(Buffer.from('fake-pdf-content')),
    existsSync: vi.fn().mockReturnValue(true),
  };
});

vi.mock('node:path', async () => {
  const actual = await vi.importActual('node:path');
  return {
    ...(actual as any),
    resolve: vi.fn().mockReturnValue('/fake/path/to/file.pdf'),
  };
});
