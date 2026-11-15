-- Intern module production schema (SRS-199–214)

DO $$ BEGIN
  ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'INTERN';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "internees" ADD COLUMN IF NOT EXISTS "department" VARCHAR(100);
ALTER TABLE "internees" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "internees" ADD COLUMN IF NOT EXISTS "gender" VARCHAR(20);
ALTER TABLE "internees" ADD COLUMN IF NOT EXISTS "date_of_birth" DATE;
ALTER TABLE "internees" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "internees" ADD COLUMN IF NOT EXISTS "cnic" VARCHAR(20);
ALTER TABLE "internees" ADD COLUMN IF NOT EXISTS "semester" VARCHAR(50);
ALTER TABLE "internees" ADD COLUMN IF NOT EXISTS "emergency_contact" VARCHAR(150);
ALTER TABLE "internees" ADD COLUMN IF NOT EXISTS "skills" TEXT;
ALTER TABLE "internees" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "internees" ADD COLUMN IF NOT EXISTS "application_status" VARCHAR(30) DEFAULT 'ACTIVE';
ALTER TABLE "internees" ADD COLUMN IF NOT EXISTS "required_hours" DECIMAL(7,2) DEFAULT 480;

CREATE TABLE IF NOT EXISTS "intern_audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "intern_id" UUID,
    "action" VARCHAR(50),
    "changed_by" UUID,
    "timestamp" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "previous_data" JSONB,
    "new_data" JSONB,
    CONSTRAINT "intern_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "intern_training_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "intern_id" UUID,
    "hours_worked" DECIMAL(5,2),
    "tasks_completed" TEXT,
    "learning_notes" TEXT,
    "skills_learned" TEXT,
    "challenges" TEXT,
    "mentor_remarks" TEXT,
    "log_type" VARCHAR(20) DEFAULT 'daily',
    "status" VARCHAR(20) DEFAULT 'submitted',
    "log_date" DATE,
    "created_by" UUID,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "intern_training_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "intern_attendance" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "intern_id" UUID,
    "record_date" DATE,
    "check_in" VARCHAR(10),
    "check_out" VARCHAR(10),
    "hours_worked" DECIMAL(5,2),
    "status" VARCHAR(20),
    "remarks" TEXT,
    "created_by" UUID,
    "approved_by" UUID,
    "approved_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "intern_attendance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "intern_evaluations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "intern_id" UUID,
    "mentor_id" UUID,
    "rating" INTEGER,
    "comments" TEXT,
    "criteria" JSONB,
    "evaluated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    CONSTRAINT "intern_evaluations_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "intern_audit_logs" ADD CONSTRAINT "intern_audit_logs_intern_id_fkey"
    FOREIGN KEY ("intern_id") REFERENCES "internees"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "intern_training_logs" ADD CONSTRAINT "intern_training_logs_intern_id_fkey"
    FOREIGN KEY ("intern_id") REFERENCES "internees"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "intern_attendance" ADD CONSTRAINT "intern_attendance_intern_id_fkey"
    FOREIGN KEY ("intern_id") REFERENCES "internees"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "intern_evaluations" ADD CONSTRAINT "intern_evaluations_intern_id_fkey"
    FOREIGN KEY ("intern_id") REFERENCES "internees"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "intern_evaluations" ADD CONSTRAINT "intern_evaluations_mentor_id_fkey"
    FOREIGN KEY ("mentor_id") REFERENCES "doctors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "intern_attendance_intern_id_record_date_idx" ON "intern_attendance"("intern_id", "record_date");
CREATE INDEX IF NOT EXISTS "intern_evaluations_intern_id_idx" ON "intern_evaluations"("intern_id");

-- Extend existing training log table if it was created without new columns
ALTER TABLE "intern_training_logs" ADD COLUMN IF NOT EXISTS "skills_learned" TEXT;
ALTER TABLE "intern_training_logs" ADD COLUMN IF NOT EXISTS "challenges" TEXT;
ALTER TABLE "intern_training_logs" ADD COLUMN IF NOT EXISTS "mentor_remarks" TEXT;
ALTER TABLE "intern_training_logs" ADD COLUMN IF NOT EXISTS "log_type" VARCHAR(20) DEFAULT 'daily';
ALTER TABLE "intern_training_logs" ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) DEFAULT 'submitted';
ALTER TABLE "intern_training_logs" ADD COLUMN IF NOT EXISTS "reviewed_by" UUID;
ALTER TABLE "intern_training_logs" ADD COLUMN IF NOT EXISTS "reviewed_at" TIMESTAMP(6);
