CREATE TABLE "emergency_map_account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emergency_map_session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "emergency_map_session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "emergency_map_user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "emergency_map_user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "emergency_map_verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emergency_map_todo" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"category_id" text,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "emergency_map_account" ADD CONSTRAINT "emergency_map_account_user_id_emergency_map_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."emergency_map_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_map_session" ADD CONSTRAINT "emergency_map_session_user_id_emergency_map_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."emergency_map_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_map_todo" ADD CONSTRAINT "emergency_map_todo_user_id_emergency_map_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."emergency_map_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "emergency_map_account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "emergency_map_session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "emergency_map_verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "todo_userId_idx" ON "emergency_map_todo" USING btree ("user_id");