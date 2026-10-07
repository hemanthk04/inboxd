CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inbox_id" uuid NOT NULL,
	"message_id" text,
	"from" jsonb NOT NULL,
	"to" jsonb NOT NULL,
	"subject" text,
	"text" text,
	"html" text,
	"date" timestamp with time zone,
	"headers" jsonb,
	"attachments" jsonb,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_inbox_id_inboxes_id_fk" FOREIGN KEY ("inbox_id") REFERENCES "public"."inboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "messages_inbox_id_idx" ON "messages" USING btree ("inbox_id");--> statement-breakpoint
CREATE INDEX "messages_message_id_idx" ON "messages" USING btree ("message_id");