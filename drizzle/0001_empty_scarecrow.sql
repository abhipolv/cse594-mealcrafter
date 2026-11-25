CREATE TABLE "plan_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"before" jsonb NOT NULL,
	"labels" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"undone_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cook_logs" ADD COLUMN "recipe_ref" text;--> statement-breakpoint
ALTER TABLE "cook_logs" ADD COLUMN "planned_meal_id" uuid;--> statement-breakpoint
ALTER TABLE "cook_logs" ADD COLUMN "extra_cost_cents" integer;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "custom_rules" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "rules_answered_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "goals" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "roommates" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "others_agreed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "plan_changes" ADD CONSTRAINT "plan_changes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cook_logs" ADD CONSTRAINT "cook_logs_planned_meal_id_planned_meals_id_fk" FOREIGN KEY ("planned_meal_id") REFERENCES "public"."planned_meals"("id") ON DELETE set null ON UPDATE no action;