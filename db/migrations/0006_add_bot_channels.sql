CREATE TYPE "public"."bot_channel_type" AS ENUM('telegram', 'whatsapp');--> statement-breakpoint
CREATE TABLE "bot_channel" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"botId" uuid NOT NULL,
	"type" "bot_channel_type" NOT NULL,
	"webhookSecret" varchar(64) NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"label" text,
	"externalIdentity" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"lastSeenAt" timestamp,
	"lastError" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bot_channel" ADD CONSTRAINT "bot_channel_botId_bot_id_fk" FOREIGN KEY ("botId") REFERENCES "public"."bot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bot_channel_bot_idx" ON "bot_channel" USING btree ("botId");--> statement-breakpoint
CREATE INDEX "bot_channel_secret_idx" ON "bot_channel" USING btree ("webhookSecret");