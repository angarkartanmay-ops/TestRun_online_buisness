import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import type { Ctx } from "./ctx";
import { loginCodes, sessions, users, type User } from "./db/schema";
import { deliver, mails } from "./email";

export const CODE_TTL_MIN = 10;
export const MAX_ATTEMPTS = 5;
export const RESEND_COOLDOWN_SEC = 30;
export const MAX_CODES_PER_HOUR = 6;
export const SESSION_DAYS = 30;

// Trim and lowercase *before* validating, so a pasted " Maya@Example.com " is accepted.
export const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254));

export class AuthError extends Error {
  constructor(
    public code: "invalid_email" | "cooldown" | "rate_limited" | "invalid_code" | "expired" | "too_many_attempts" | "email_unavailable",
    message: string,
  ) {
    super(message);
  }
}

const hashCode = (secret: string, email: string, code: string) =>
  createHmac("sha256", secret).update(`${email}:${code}`).digest("hex");

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Unambiguous alphabet — no 0/o, 1/l/i — because people read these out loud. */
const CREW_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
export function newCrewCode(): string {
  let out = "";
  for (let i = 0; i < 6; i++) out += CREW_ALPHABET[randomInt(CREW_ALPHABET.length)];
  return out;
}

export async function requestCode(
  ctx: Ctx,
  rawEmail: string,
  opts: {
    secret: string;
    /** Return the code to the browser. Only in full demo mode, never for admins. */
    revealCode: boolean;
    /** Can this person actually receive the code (real email, or revealed on screen)? */
    deliverable: boolean;
  },
): Promise<{ devCode?: string }> {
  const parsed = emailSchema.safeParse(rawEmail);
  if (!parsed.success) throw new AuthError("invalid_email", "That doesn't look like an email address.");
  const email = parsed.data;
  if (!opts.deliverable && !opts.revealCode) {
    throw new AuthError("email_unavailable", "Sign-in email isn't configured on this server yet.");
  }

  const now = ctx.now();
  const recent = await ctx.db
    .select({ createdAt: loginCodes.createdAt })
    .from(loginCodes)
    .where(and(eq(loginCodes.email, email), gt(loginCodes.createdAt, new Date(now.getTime() - 3600_000))))
    .orderBy(desc(loginCodes.createdAt));

  const last = recent[0];
  if (last && now.getTime() - last.createdAt.getTime() < RESEND_COOLDOWN_SEC * 1000) {
    throw new AuthError("cooldown", `A code was just sent. You can ask for another in ${RESEND_COOLDOWN_SEC} seconds.`);
  }
  if (recent.length >= MAX_CODES_PER_HOUR) {
    throw new AuthError("rate_limited", "Too many codes requested for this email. Try again in an hour.");
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await ctx.db.insert(loginCodes).values({
    email,
    codeHash: hashCode(opts.secret, email, code),
    // Stamp with the app clock, not the database's now(): the rate limit compares
    // against ctx.now(), and mixing two clocks makes the window drift.
    createdAt: now,
    expiresAt: new Date(now.getTime() + CODE_TTL_MIN * 60_000),
  });

  // Always hand the code to the mailer. Unconfigured, that's the server log — which is
  // how an operator signs in to /admin before email is set up.
  await deliver(ctx, mails.loginCode(email, code));
  return opts.revealCode ? { devCode: code } : {};
}

export async function verifyCode(
  ctx: Ctx,
  rawEmail: string,
  rawCode: string,
  opts: { secret: string },
): Promise<{ user: User; token: string; expiresAt: Date }> {
  const parsed = emailSchema.safeParse(rawEmail);
  if (!parsed.success) throw new AuthError("invalid_email", "That doesn't look like an email address.");
  const email = parsed.data;
  const code = rawCode.replace(/\D/g, "");
  const now = ctx.now();

  const [row] = await ctx.db
    .select()
    .from(loginCodes)
    .where(and(eq(loginCodes.email, email), isNull(loginCodes.consumedAt)))
    .orderBy(desc(loginCodes.createdAt))
    .limit(1);

  if (!row) throw new AuthError("invalid_code", "That code isn't right. Check the latest email, or ask for a new one.");
  if (row.expiresAt <= now) throw new AuthError("expired", "That code has expired. Ask for a new one.");
  if (row.attempts >= MAX_ATTEMPTS) throw new AuthError("too_many_attempts", "Too many wrong tries. Ask for a new code.");

  // Count the attempt before comparing, so parallel guesses can't skip the limit.
  await ctx.db.update(loginCodes).set({ attempts: sql`${loginCodes.attempts} + 1` }).where(eq(loginCodes.id, row.id));

  const expected = Buffer.from(row.codeHash, "hex");
  const actual = Buffer.from(hashCode(opts.secret, email, code), "hex");
  if (code.length !== 6 || !timingSafeEqual(expected, actual)) {
    const left = MAX_ATTEMPTS - row.attempts - 1;
    throw new AuthError(
      left > 0 ? "invalid_code" : "too_many_attempts",
      left > 0 ? `That code isn't right. ${left} ${left === 1 ? "try" : "tries"} left.` : "Too many wrong tries. Ask for a new code.",
    );
  }

  const consumed = await ctx.db
    .update(loginCodes)
    .set({ consumedAt: now })
    .where(and(eq(loginCodes.id, row.id), isNull(loginCodes.consumedAt)))
    .returning({ id: loginCodes.id });
  if (consumed.length === 0) throw new AuthError("invalid_code", "That code was already used. Ask for a new one.");

  const user = await findOrCreateUser(ctx, email);
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + SESSION_DAYS * 86400_000);
  await ctx.db.insert(sessions).values({ id: hashToken(token), userId: user.id, expiresAt });
  return { user, token, expiresAt };
}

export async function findOrCreateUser(ctx: Ctx, email: string): Promise<User> {
  const [existing] = await ctx.db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) return existing;
  for (let attempt = 0; attempt < 5; attempt++) {
    const inserted = await ctx.db
      .insert(users)
      .values({ email, crewCode: newCrewCode() })
      .onConflictDoNothing()
      .returning();
    if (inserted[0]) return inserted[0];
    // Conflict on email (a parallel sign-in) or on crew code (retry with a new one).
    const [raced] = await ctx.db.select().from(users).where(eq(users.email, email)).limit(1);
    if (raced) return raced;
  }
  throw new Error("Could not allocate a crew code");
}

export async function userForToken(ctx: Ctx, token: string | undefined): Promise<User | null> {
  if (!token) return null;
  const [row] = await ctx.db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, hashToken(token)), gt(sessions.expiresAt, ctx.now())))
    .limit(1);
  return row?.user ?? null;
}

export async function revokeToken(ctx: Ctx, token: string | undefined) {
  if (token) await ctx.db.delete(sessions).where(eq(sessions.id, hashToken(token)));
}
