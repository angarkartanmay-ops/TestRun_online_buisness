import "server-only";

/**
 * Runtime configuration, read once. Every integration degrades to a safe local
 * mode when its keys are absent, and `modes` says which mode is active so the UI
 * can be honest about it.
 */
const env = (k: string) => {
  const v = process.env[k];
  return v && v.trim() !== "" ? v.trim() : undefined;
};

/**
 * Public URL for links, emails and share cards. An explicit NEXT_PUBLIC_SITE_URL
 * (your domain) wins; on Vercel production we use the project's stable
 * *.vercel.app address, and on previews the deployment's own URL.
 */
function siteUrl(): string {
  const explicit = env("NEXT_PUBLIC_SITE_URL");
  if (explicit) return explicit;
  const prod = env("VERCEL_PROJECT_PRODUCTION_URL");
  if (env("VERCEL_ENV") === "production" && prod) return `https://${prod}`;
  const preview = env("VERCEL_URL");
  return preview ? `https://${preview}` : "http://localhost:3000";
}

export const config = {
  siteUrl: siteUrl().replace(/\/$/, ""),
  /** Load the sample drops into an empty database on first boot (preview deployments). */
  seedDemo: env("SEED_DEMO") === "true",
  databaseUrl: env("DATABASE_URL"),
  authSecret: env("AUTH_SECRET") ?? "dev-only-secret-do-not-use-in-production",
  adminEmails: (env("ADMIN_EMAILS") ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
  stripeSecretKey: env("STRIPE_SECRET_KEY"),
  stripePublishableKey: env("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
  stripeWebhookSecret: env("STRIPE_WEBHOOK_SECRET"),
  currency: (env("CURRENCY") ?? "usd").toLowerCase(),
  resendApiKey: env("RESEND_API_KEY"),
  emailFrom: env("EMAIL_FROM") ?? "QUORUM <onboarding@resend.dev>",
  cronSecret: env("CRON_SECRET"),
  isVercel: Boolean(env("VERCEL")),
  isProduction: process.env.NODE_ENV === "production",
};

export const modes = {
  /** No Stripe key: holds are simulated and no card is ever touched. */
  payments: config.stripeSecretKey ? ("stripe" as const) : ("demo" as const),
  email: config.resendApiKey ? ("resend" as const) : ("console" as const),
  database: config.databaseUrl ? ("postgres" as const) : ("pglite" as const),
};

/**
 * Sign-in codes are shown on screen only when nothing real is at stake: payments
 * are simulated AND there is no email provider to deliver the code. With live
 * Stripe keys and no email provider, sign-in fails closed instead.
 */
export const showLoginCodeOnScreen = modes.payments === "demo" && modes.email === "console";

export const isDemo = modes.payments === "demo";

export { rules } from "./rules";
