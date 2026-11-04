// Generated Cloudflare Environment interface for Workers bindings
interface CloudflareEnv {
  // Cloudflare D1 Database binding
  DB?: any;

  // Cloudflare R2 Media Bucket binding
  MEDIA_BUCKET?: any;

  // Cloudflare KV Namespace binding
  KV?: any;

  // Static Assets binding for Next.js assets
  ASSETS?: any;

  // Environment variables and secrets
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
  DATABASE_URL?: string;
  CRON_SECRET?: string;
}
