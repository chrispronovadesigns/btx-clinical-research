/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  // Push notifications
  readonly VAPID_PUBLIC_KEY: string;
  readonly PUBLIC_VAPID_PUBLIC_KEY: string;
  readonly VAPID_PRIVATE_KEY: string;
  readonly VAPID_EMAIL: string;
  readonly UPSTASH_REDIS_REST_URL: string;
  readonly UPSTASH_REDIS_REST_TOKEN: string;
  readonly PUSH_SEND_SECRET: string;
  // Email — Resend
  readonly RESEND_API_KEY: string;
  // Analytics
  readonly PUBLIC_GA_ID: string;
  // Turnstile
  readonly PUBLIC_TURNSTILE_SITE_KEY: string;
  readonly TURNSTILE_SECRET_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
