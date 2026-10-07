CREATE TABLE "inboxes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"address" varchar(320) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inboxes_address_unique" UNIQUE("address")
);
--> statement-breakpoint
ALTER TABLE "inboxes" ADD CONSTRAINT "inboxes_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inboxes_account_id_idx" ON "inboxes" USING btree ("account_id");