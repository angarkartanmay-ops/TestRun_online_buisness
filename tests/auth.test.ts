import { describe, expect, it } from "vitest";
import { AuthError, requestCode, userForToken, verifyCode } from "@/lib/auth";
import { makeCtx } from "./support/harness";

const opts = { secret: "test-secret", revealCode: true, deliverable: true };

describe("email code sign-in", () => {
  it("signs in with the right code and creates the member once", async () => {
    const { ctx } = await makeCtx();
    const { devCode } = await requestCode(ctx, "  Maya@Example.com ", opts);
    expect(devCode).toMatch(/^\d{6}$/);
    const a = await verifyCode(ctx, "maya@example.com", devCode!, opts);
    expect(a.user.email).toBe("maya@example.com");
    expect(a.user.crewCode).toMatch(/^[2-9a-z]{6}$/);
    expect((await userForToken(ctx, a.token))?.id).toBe(a.user.id);
    await expect(verifyCode(ctx, "maya@example.com", devCode!, opts)).rejects.toBeInstanceOf(AuthError);
  });

  it("emails the code and keeps it out of the response when not revealing", async () => {
    const { ctx, mailer } = await makeCtx();
    const r = await requestCode(ctx, "dev@example.com", { ...opts, revealCode: false });
    expect(r.devCode).toBeUndefined();
    expect(mailer.outbox[0]?.subject).toMatch(/^\d{6} is your QUORUM code$/);
  });

  it("fails closed when the code can't reach the person", async () => {
    const { ctx } = await makeCtx();
    await expect(requestCode(ctx, "a@example.com", { secret: "s", revealCode: false, deliverable: false })).rejects.toMatchObject({ code: "email_unavailable" });
  });

  it("locks the code after five wrong guesses", async () => {
    const { ctx } = await makeCtx();
    const { devCode } = await requestCode(ctx, "x@example.com", opts);
    for (let i = 0; i < 5; i++) await expect(verifyCode(ctx, "x@example.com", "000000", opts)).rejects.toBeInstanceOf(AuthError);
    await expect(verifyCode(ctx, "x@example.com", devCode!, opts)).rejects.toMatchObject({ code: "too_many_attempts" });
  });

  it("expires codes after ten minutes", async () => {
    const { ctx, advance } = await makeCtx();
    const { devCode } = await requestCode(ctx, "late@example.com", opts);
    advance(11 * 60_000);
    await expect(verifyCode(ctx, "late@example.com", devCode!, opts)).rejects.toMatchObject({ code: "expired" });
  });

  it("rate-limits code requests", async () => {
    const { ctx, advance } = await makeCtx();
    await requestCode(ctx, "spam@example.com", opts);
    await expect(requestCode(ctx, "spam@example.com", opts)).rejects.toMatchObject({ code: "cooldown" });
    for (let i = 0; i < 5; i++) {
      advance(31_000);
      await requestCode(ctx, "spam@example.com", opts);
    }
    advance(31_000);
    await expect(requestCode(ctx, "spam@example.com", opts)).rejects.toMatchObject({ code: "rate_limited" });
  });

  it("rejects sessions after they expire", async () => {
    const { ctx, advance } = await makeCtx();
    const { devCode } = await requestCode(ctx, "s@example.com", opts);
    const { token } = await verifyCode(ctx, "s@example.com", devCode!, opts);
    advance(31 * 24 * 3600_000);
    expect(await userForToken(ctx, token)).toBeNull();
  });
});

describe("email log", () => {
  it("never stores a sign-in code", async () => {
    const { emailLog } = await import("@/lib/db/schema");
    const { ctx } = await makeCtx();
    const { devCode } = await requestCode(ctx, "log@example.com", opts);
    const rows = await ctx.db.select().from(emailLog);
    expect(rows).toHaveLength(1);
    expect(JSON.stringify(rows)).not.toContain(devCode!);
  });
});
