ALTER TABLE "conversation" ADD COLUMN "ipAddress" varchar(64);--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "userAgent" text;--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "referrer" text;--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "flag" varchar(32);--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "isArchived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "lastMessageAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX "conversation_last_message_idx" ON "conversation" USING btree ("botId","lastMessageAt");--> statement-breakpoint
CREATE INDEX "conversation_end_user_idx" ON "conversation" USING btree ("botId","endUserId");