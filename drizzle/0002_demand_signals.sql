CREATE TABLE "want_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"want_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"max_price_cents" integer,
	"city" text DEFAULT 'Bengaluru' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"brand" text NOT NULL,
	"item" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"category" text DEFAULT 'apparel' NOT NULL,
	"city" text DEFAULT 'Bengaluru' NOT NULL,
	"created_by" uuid NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"answer" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "want_votes" ADD CONSTRAINT "want_votes_want_id_wants_id_fk" FOREIGN KEY ("want_id") REFERENCES "public"."wants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "want_votes" ADD CONSTRAINT "want_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wants" ADD CONSTRAINT "wants_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "want_votes_one_per_user" ON "want_votes" USING btree ("want_id","user_id");--> statement-breakpoint
CREATE INDEX "want_votes_user_idx" ON "want_votes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "wants_created_by_idx" ON "wants" USING btree ("created_by","created_at");--> statement-breakpoint
CREATE INDEX "wants_status_idx" ON "wants" USING btree ("status");