export type HoldStatus = "requires_confirmation" | "held" | "captured" | "canceled" | "failed";

export interface Payments {
  readonly mode: "stripe" | "demo";
  /** Place an authorisation-only hold. Demo holds succeed immediately. */
  createHold(args: {
    amountCents: number;
    currency: string;
    email: string;
    description: string;
    pledgeId: string;
    dropId: string;
  }): Promise<{ ref: string; clientSecret: string | null; status: HoldStatus }>;
  /** Re-open an unfinished hold (the member closed the tab before confirming). */
  resumeHold(ref: string): Promise<{ clientSecret: string | null; status: HoldStatus }>;
  getStatus(ref: string): Promise<HoldStatus>;
  /** Capture part or all of the hold. The remainder is released by the card network. */
  capture(ref: string, amountCents: number, idempotencyKey: string): Promise<void>;
  /** Cancel the hold. Safe to call on an already-cancelled hold. */
  release(ref: string, idempotencyKey: string): Promise<void>;
  /** Refund a captured payment in full (Bylaw 5: missed ship-by date). */
  refund(ref: string, idempotencyKey: string): Promise<void>;
}

export class HoldExpiredError extends Error {
  constructor(ref: string) {
    super(`Authorisation ${ref} expired before capture`);
  }
}
