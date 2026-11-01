import "server-only";
import { CURRENCY } from "./money";

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
  /** Set with NEXT_PUBLIC_CURRENCY (default inr) so the browser formats prices the same way. */
  currency: CURRENCY,
  /**
   * Pay-after-close collection. With a UPI ID, members get a UPI link + QR for the
   * final price when a drop clears. With Razorpay keys, they get a Razorpay
   * payment link instead, and the webhook marks them paid automatically.
   */
  upiVpa: env("UPI_VPA"),
  upiPayeeName: env("UPI_PAYEE_NAME") ?? "QUORUM",
  razorpayKeyId: env("RAZORPAY_KEY_ID"),
  razorpayKeySecret: env("RAZORPAY_KEY_SECRET"),
  razorpayWebhookSecret: env("RAZORPAY_WEBHOOK_SECRET"),
  /** Consumer Protection (E-Commerce) Rules 2020: a named grievance officer. */
  grievanceName: env("GRIEVANCE_NAME"),
  grievanceEmail: env("GRIEVANCE_EMAIL"),
  sellerName: env("SELLER_NAME"),
  sellerAddress: env("SELLER_ADDRESS"),
  resendApiKey: env("RESEND_API_KEY"),
  emailFrom: env("EMAIL_FROM") ?? "QUORUM <onboarding@resend.dev>",
  cronSecret: env("CRON_SECRET"),
  isVercel: Boolean(env("VERCEL")),
  isProduction: process.env.NODE_ENV === "production",
};

const collects = Boolean(config.upiVpa || (config.razorpayKeyId && config.razorpayKeySecret));

export const modes = {
  /**
   * stripe: card holds, captured at close (US/UK).
   * commit: pay after close — joining is a promise; members pay the final price by UPI or a payment link (India).
   * demo: nothing is ever paid; used when neither is configured.
   */
  payments: config.stripeSecretKey ? ("stripe" as const) : collects ? ("commit" as const) : ("demo" as const),
  email: config.resendApiKey ? ("resend" as const) : ("console" as const),
  database: config.databaseUrl ? ("postgres" as const) : ("pglite" as const),
};

/**
 * Sign-in codes are shown on screen only when nothing real is at stake: payments
 * are simulated AND there is no email provider to deliver the code. With real
 * payments (Stripe or pay-after-close) and no email provider, sign-in fails closed.
 */
export const showLoginCodeOnScreen = modes.payments === "demo" && modes.email === "console";

export const isDemo = modes.payments === "demo";

/** How members pay: a card hold now ("card"), or the final price after close ("later"). */
export const payStyle = modes.payments === "stripe" ? ("card" as const) : ("later" as const);

export { rules } from "./rules";
