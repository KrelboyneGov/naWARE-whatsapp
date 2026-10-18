CREATE TABLE "emergency_map_subscriber" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"phone_hash" text NOT NULL,
	"phone_ciphertext" text NOT NULL,
	"verification_status" text NOT NULL,
	"verified_at" timestamp with time zone,
	"home_district_name" text NOT NULL,
	"home_ubigeo" text,
	"consent_version" text NOT NULL,
	"consent_at" timestamp with time zone NOT NULL,
	"notifications_enabled" boolean NOT NULL,
	"opted_out_at" timestamp with time zone,
	"erasure_due_at" timestamp with time zone,
	"window_opened_at" timestamp with time zone,
	"last_home_level" text,
	"last_home_notice_id" text,
	"last_informed_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "emergency_map_subscriber_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."emergency_map_user"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX "subscriber_user_id_idx" ON "emergency_map_subscriber" USING btree ("user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "subscriber_phone_hash_idx" ON "emergency_map_subscriber" USING btree ("phone_hash");
--> statement-breakpoint
CREATE TABLE "emergency_map_conversation_message" (
	"id" text PRIMARY KEY NOT NULL,
	"subscriber_id" text NOT NULL,
	"direction" text NOT NULL,
	"body_ciphertext" text NOT NULL,
	"external_message_id" text,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "emergency_map_conversation_message_subscriber_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."emergency_map_subscriber"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX "conversation_message_subscriber_idx" ON "emergency_map_conversation_message" USING btree ("subscriber_id");
--> statement-breakpoint
CREATE TABLE "emergency_map_conversation_summary" (
	"subscriber_id" text PRIMARY KEY NOT NULL,
	"summary_ciphertext" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "emergency_map_conversation_summary_subscriber_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."emergency_map_subscriber"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE "emergency_map_interest_topic" (
	"id" text PRIMARY KEY NOT NULL,
	"subscriber_id" text NOT NULL,
	"place_name" text NOT NULL,
	"ubigeo" text,
	"consulted_for_date" text,
	"last_informed_level" text,
	"last_informed_notice_id" text,
	"last_informed_at" timestamp with time zone,
	CONSTRAINT "emergency_map_interest_topic_subscriber_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."emergency_map_subscriber"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX "interest_topic_subscriber_idx" ON "emergency_map_interest_topic" USING btree ("subscriber_id");
--> statement-breakpoint
CREATE TABLE "emergency_map_inbound_event" (
	"id" text PRIMARY KEY NOT NULL,
	"message_id" text NOT NULL,
	"processed_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emergency_map_notification_job" (
	"id" text PRIMARY KEY NOT NULL,
	"dedupe_key" text NOT NULL,
	"subscriber_id" text NOT NULL,
	"purpose" text NOT NULL,
	"mode" text NOT NULL,
	"body" text NOT NULL,
	"template_name" text,
	"variables_json" text,
	"status" text NOT NULL,
	"terminal" boolean NOT NULL,
	"attempts" integer NOT NULL,
	"last_error" text,
	"next_attempt_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone,
	CONSTRAINT "emergency_map_notification_job_subscriber_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."emergency_map_subscriber"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX "notification_job_dedupe_idx" ON "emergency_map_notification_job" USING btree ("dedupe_key");
--> statement-breakpoint
CREATE INDEX "notification_job_due_idx" ON "emergency_map_notification_job" USING btree ("status","next_attempt_at");
