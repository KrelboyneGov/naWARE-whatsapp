CREATE TABLE "emergency_map_activity" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"event_title" text NOT NULL,
	"type" text NOT NULL,
	"actor_role" text NOT NULL,
	"summary" text NOT NULL,
	"at" timestamp with time zone NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emergency_map_event" (
	"id" text PRIMARY KEY NOT NULL,
	"origin" text NOT NULL,
	"review_status" text NOT NULL,
	"publication_status" text NOT NULL,
	"situation_status" text NOT NULL,
	"severity_level" text,
	"severity_issuer" text,
	"severity_legend" text,
	"current_version_seq" integer DEFAULT 1 NOT NULL,
	"author_id" text NOT NULL,
	"author_display_name" text NOT NULL,
	"author_role" text NOT NULL,
	"private_location" geometry(Point,4326),
	"merged_into_event_id" text,
	"contribution_count" integer DEFAULT 0 NOT NULL,
	"has_open_needs" boolean DEFAULT false NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"last_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emergency_map_event_version" (
	"event_id" text NOT NULL,
	"seq" integer NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"place_precision" text NOT NULL,
	"place_point" geometry(Point,4326),
	"territory_ubigeo" text NOT NULL,
	"territory_name" text NOT NULL,
	"territory_province_name" text,
	"territory_department_name" text NOT NULL,
	"place_reference" text,
	"occurred_precision" text NOT NULL,
	"occurred_start" timestamp with time zone NOT NULL,
	"occurred_end" timestamp with time zone,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"publication_status" text NOT NULL,
	CONSTRAINT "emergency_map_event_version_event_id_seq_pk" PRIMARY KEY("event_id","seq")
);
--> statement-breakpoint
CREATE TABLE "emergency_map_evidence" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"type" text NOT NULL,
	"author_id" text NOT NULL,
	"author_display_name" text NOT NULL,
	"author_role" text NOT NULL,
	"description" text NOT NULL,
	"storage_key" text,
	"file_sha256" text,
	"url" text,
	"observed_personally" boolean,
	"owns_image" boolean,
	"declared_captured_precision" text,
	"declared_captured_start" timestamp with time zone,
	"declared_captured_end" timestamp with time zone,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"review_status" text NOT NULL,
	"visibility" text NOT NULL,
	"duplicate_of_evidence_id" text,
	"is_demo" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emergency_map_collection_point" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"arrival_reference" text,
	"location" geometry(Point,4326) NOT NULL,
	"territory_ubigeo" text NOT NULL,
	"territory_name" text NOT NULL,
	"territory_province_name" text,
	"territory_department_name" text NOT NULL,
	"schedule_text" text NOT NULL,
	"schedule_confirmed_at" timestamp with time zone,
	"accepts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"does_not_accept" text,
	"destination_territories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"contacts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text NOT NULL,
	"availability_confirmed_at" timestamp with time zone,
	"is_demo" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emergency_map_need" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"event_id" text,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"destination_ubigeo" text NOT NULL,
	"destination_name" text NOT NULL,
	"destination_province_name" text,
	"destination_department_name" text NOT NULL,
	"collection_point_id" text,
	"quantity" text,
	"deadline" timestamp with time zone,
	"status" text NOT NULL,
	"status_note" text,
	"is_demo" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emergency_map_organization_member" (
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "emergency_map_organization_member_organization_id_user_id_pk" PRIMARY KEY("organization_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "emergency_map_organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"coverage" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"contacts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"identity_review" text NOT NULL,
	"identity_reviewed_at" timestamp with time zone,
	"contact_review" text NOT NULL,
	"contact_reviewed_at" timestamp with time zone,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emergency_map_territory" (
	"ubigeo" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"province_name" text,
	"department_name" text NOT NULL,
	"level" text NOT NULL,
	"parent_ubigeo" text,
	"centroid" geometry(Point,4326) NOT NULL,
	"geometry" geometry(MultiPolygon,4326),
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emergency_map_issue_report" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"type" text NOT NULL,
	"explanation" text NOT NULL,
	"url" text,
	"reporter_id" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emergency_map_review_decision" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"version_seq" integer NOT NULL,
	"kind" text NOT NULL,
	"decision" text NOT NULL,
	"actor_id" text NOT NULL,
	"public_reason" text NOT NULL,
	"private_note" text,
	"details" jsonb NOT NULL,
	"decided_at" timestamp with time zone NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emergency_map_review_queue" (
	"event_id" text PRIMARY KEY NOT NULL,
	"reason" text NOT NULL,
	"version_seq" integer NOT NULL,
	"assigned_to" text,
	"entered_at" timestamp with time zone NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emergency_map_data_source" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"institution" text NOT NULL,
	"info_type" text NOT NULL,
	"access_kind" text NOT NULL,
	"coverage" text NOT NULL,
	"original_url" text,
	"last_published_at" timestamp with time zone,
	"last_successful_fetch_at" timestamp with time zone,
	"health" text NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emergency_map_import_run" (
	"id" text PRIMARY KEY NOT NULL,
	"source_id" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"status" text NOT NULL,
	"processed" integer DEFAULT 0 NOT NULL,
	"duplicates_avoided" integer DEFAULT 0 NOT NULL,
	"error_summary" text,
	"is_demo" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emergency_map_official_notice" (
	"id" text PRIMARY KEY NOT NULL,
	"source_id" text NOT NULL,
	"external_id" text NOT NULL,
	"institution" text NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"severity_level" text,
	"severity_issuer" text,
	"severity_legend" text,
	"url" text,
	"issued_at" timestamp with time zone NOT NULL,
	"valid_from" timestamp with time zone NOT NULL,
	"valid_to" timestamp with time zone,
	"validity" text NOT NULL,
	"geometry" geometry(MultiPolygon,4326),
	"territories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "emergency_map_session" ADD COLUMN "impersonated_by" text;--> statement-breakpoint
ALTER TABLE "emergency_map_user" ADD COLUMN "role" text DEFAULT 'user';--> statement-breakpoint
ALTER TABLE "emergency_map_user" ADD COLUMN "banned" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "emergency_map_user" ADD COLUMN "ban_reason" text;--> statement-breakpoint
ALTER TABLE "emergency_map_user" ADD COLUMN "ban_expires" timestamp;--> statement-breakpoint
ALTER TABLE "emergency_map_activity" ADD CONSTRAINT "emergency_map_activity_event_id_emergency_map_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."emergency_map_event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_map_event" ADD CONSTRAINT "emergency_map_event_author_id_emergency_map_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."emergency_map_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_map_event_version" ADD CONSTRAINT "emergency_map_event_version_event_id_emergency_map_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."emergency_map_event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_map_evidence" ADD CONSTRAINT "emergency_map_evidence_event_id_emergency_map_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."emergency_map_event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_map_evidence" ADD CONSTRAINT "emergency_map_evidence_author_id_emergency_map_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."emergency_map_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_map_collection_point" ADD CONSTRAINT "emergency_map_collection_point_organization_id_emergency_map_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."emergency_map_organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_map_need" ADD CONSTRAINT "emergency_map_need_organization_id_emergency_map_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."emergency_map_organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_map_need" ADD CONSTRAINT "emergency_map_need_event_id_emergency_map_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."emergency_map_event"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_map_need" ADD CONSTRAINT "emergency_map_need_collection_point_id_emergency_map_collection_point_id_fk" FOREIGN KEY ("collection_point_id") REFERENCES "public"."emergency_map_collection_point"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_map_organization_member" ADD CONSTRAINT "emergency_map_organization_member_organization_id_emergency_map_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."emergency_map_organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_map_organization_member" ADD CONSTRAINT "emergency_map_organization_member_user_id_emergency_map_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."emergency_map_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_map_issue_report" ADD CONSTRAINT "emergency_map_issue_report_event_id_emergency_map_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."emergency_map_event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_map_review_decision" ADD CONSTRAINT "emergency_map_review_decision_event_id_emergency_map_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."emergency_map_event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_map_review_queue" ADD CONSTRAINT "emergency_map_review_queue_event_id_emergency_map_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."emergency_map_event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_map_review_queue" ADD CONSTRAINT "emergency_map_review_queue_assigned_to_emergency_map_user_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."emergency_map_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_map_import_run" ADD CONSTRAINT "emergency_map_import_run_source_id_emergency_map_data_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."emergency_map_data_source"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_map_official_notice" ADD CONSTRAINT "emergency_map_official_notice_source_id_emergency_map_data_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."emergency_map_data_source"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_at_idx" ON "emergency_map_activity" USING btree ("at");--> statement-breakpoint
CREATE INDEX "activity_event_idx" ON "emergency_map_activity" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_publication_idx" ON "emergency_map_event" USING btree ("publication_status","last_updated_at");--> statement-breakpoint
CREATE INDEX "event_author_idx" ON "emergency_map_event" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "event_merged_into_idx" ON "emergency_map_event" USING btree ("merged_into_event_id");--> statement-breakpoint
CREATE INDEX "event_private_location_gix" ON "emergency_map_event" USING gist ("private_location");--> statement-breakpoint
CREATE INDEX "event_version_category_idx" ON "emergency_map_event_version" USING btree ("category");--> statement-breakpoint
CREATE INDEX "event_version_territory_idx" ON "emergency_map_event_version" USING btree ("territory_ubigeo");--> statement-breakpoint
CREATE INDEX "event_version_occurred_idx" ON "emergency_map_event_version" USING btree ("occurred_start");--> statement-breakpoint
CREATE INDEX "event_version_place_point_gix" ON "emergency_map_event_version" USING gist ("place_point");--> statement-breakpoint
CREATE INDEX "evidence_event_idx" ON "emergency_map_evidence" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "evidence_file_sha256_idx" ON "emergency_map_evidence" USING btree ("file_sha256");--> statement-breakpoint
CREATE INDEX "collection_point_org_idx" ON "emergency_map_collection_point" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "collection_point_territory_idx" ON "emergency_map_collection_point" USING btree ("territory_ubigeo");--> statement-breakpoint
CREATE INDEX "collection_point_location_gix" ON "emergency_map_collection_point" USING gist ("location");--> statement-breakpoint
CREATE INDEX "need_org_idx" ON "emergency_map_need" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "need_event_idx" ON "emergency_map_need" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "need_destination_idx" ON "emergency_map_need" USING btree ("destination_ubigeo");--> statement-breakpoint
CREATE INDEX "organization_member_user_idx" ON "emergency_map_organization_member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "territory_name_idx" ON "emergency_map_territory" USING btree ("name");--> statement-breakpoint
CREATE INDEX "territory_parent_idx" ON "emergency_map_territory" USING btree ("parent_ubigeo");--> statement-breakpoint
CREATE INDEX "territory_centroid_gix" ON "emergency_map_territory" USING gist ("centroid");--> statement-breakpoint
CREATE INDEX "territory_geometry_gix" ON "emergency_map_territory" USING gist ("geometry");--> statement-breakpoint
CREATE INDEX "issue_report_event_idx" ON "emergency_map_issue_report" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "review_decision_event_idx" ON "emergency_map_review_decision" USING btree ("event_id","decided_at");--> statement-breakpoint
CREATE INDEX "review_queue_entered_idx" ON "emergency_map_review_queue" USING btree ("entered_at");--> statement-breakpoint
CREATE INDEX "import_run_source_started_idx" ON "emergency_map_import_run" USING btree ("source_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "official_notice_source_external_uq" ON "emergency_map_official_notice" USING btree ("source_id","external_id");--> statement-breakpoint
CREATE INDEX "official_notice_validity_idx" ON "emergency_map_official_notice" USING btree ("validity");--> statement-breakpoint
CREATE INDEX "official_notice_geometry_gix" ON "emergency_map_official_notice" USING gist ("geometry");