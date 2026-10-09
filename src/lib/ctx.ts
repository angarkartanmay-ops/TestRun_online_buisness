import type { DB } from "./db";
import type { Mailer } from "./mailer";
import type { Payments } from "./payments/types";

/** Everything a service needs, passed in so tests can substitute fakes. */
export type Ctx = {
  db: DB;
  payments: Payments;
  mailer: Mailer;
  now: () => Date;
  siteUrl: string;
  currency: string;
};
