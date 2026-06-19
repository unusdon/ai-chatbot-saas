CREATE TYPE "public"."security_event_type" AS ENUM('sign_in', 'sign_out', 'session_revoked', 'sessions_revoked_all', 'password_changed', 'email_changed', 'profile_changed', 'account_deleted');--> statement-breakpoint
CREATE TABLE "security_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"type" "security_event_type" NOT NULL,
	"ipAddress" varchar(64),
	"userAgent" text,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"ipAddress" varchar(64),
	"userAgent" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"lastSeenAt" timestamp DEFAULT now() NOT NULL,
	"revokedAt" timestamp
);
--> statement-breakpoint
ALTER TABLE "security_event" ADD CONSTRAINT "security_event_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_session" ADD CONSTRAINT "user_session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "security_event_user_idx" ON "security_event" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "security_event_created_idx" ON "security_event" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "user_session_user_idx" ON "user_session" USING btree ("userId");