DROP INDEX "pledges_one_active_per_user";--> statement-breakpoint
ALTER TABLE "drops" ADD COLUMN "practice" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "drops" ADD COLUMN "kind" text DEFAULT 'partner' NOT NULL;--> statement-breakpoint
ALTER TABLE "drops" ADD COLUMN "fee_bps" integer DEFAULT 800 NOT NULL;--> statement-breakpoint
ALTER TABLE "drops" ADD COLUMN "host_share_bps" integer DEFAULT 300 NOT NULL;--> statement-breakpoint
ALTER TABLE "drops" ADD COLUMN "sizes" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "drops" ADD COLUMN "country_of_origin" text DEFAULT 'India' NOT NULL;--> statement-breakpoint
ALTER TABLE "drops" ADD COLUMN "views" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "pledges" ADD COLUMN "pay_url" text;--> statement-breakpoint
ALTER TABLE "pledges" ADD COLUMN "pay_by" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pledges" ADD COLUMN "paid_claimed_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "drops_host_user_idx" ON "drops" USING btree ("host_user_id");--> statement-breakpoint
CREATE INDEX "host_applications_user_idx" ON "host_applications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payouts_drop_idx" ON "payouts" USING btree ("drop_id");--> statement-breakpoint
CREATE INDEX "pledges_referrer_idx" ON "pledges" USING btree ("referrer_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pledges_one_active_per_user" ON "pledges" USING btree ("drop_id","user_id") WHERE status in ('pending', 'held', 'capturing', 'awaiting_payment', 'charged');