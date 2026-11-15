-- Payments module + screening tables (production deploy)

DO $$ BEGIN
  CREATE TYPE "payment_status" AS ENUM ('PENDING', 'SUCCESS', 'OVERDUE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "payment_status" NOT NULL DEFAULT 'PENDING',
    "reference_number" VARCHAR(100),
    "due_date" DATE,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "payments_patient_id_idx" ON "payments"("patient_id");
CREATE INDEX IF NOT EXISTS "payments_status_idx" ON "payments"("status");
CREATE INDEX IF NOT EXISTS "payments_created_at_idx" ON "payments"("created_at");

DO $$ BEGIN
  ALTER TABLE "payments" ADD CONSTRAINT "payments_patient_id_fkey"
    FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "screening_conditions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "icon" VARCHAR(50),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "risk_threshold_medium" INTEGER NOT NULL DEFAULT 20,
    "risk_threshold_high" INTEGER NOT NULL DEFAULT 40,
    CONSTRAINT "screening_conditions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "screening_conditions_slug_key" ON "screening_conditions"("slug");
CREATE INDEX IF NOT EXISTS "screening_conditions_slug_idx" ON "screening_conditions"("slug");
CREATE INDEX IF NOT EXISTS "screening_conditions_is_active_idx" ON "screening_conditions"("is_active");

CREATE TABLE IF NOT EXISTS "screening_questions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "condition_id" UUID NOT NULL,
    "section_title" VARCHAR(150),
    "question_text" TEXT NOT NULL,
    "question_type" VARCHAR(30) NOT NULL DEFAULT 'single_choice',
    "options" JSONB NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "scoring_weight" DECIMAL(5,2) NOT NULL DEFAULT 1,
    "skip_logic" JSONB,
    CONSTRAINT "screening_questions_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "screening_questions" ADD CONSTRAINT "screening_questions_condition_id_fkey"
    FOREIGN KEY ("condition_id") REFERENCES "screening_conditions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "screening_risk_guidance" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "condition_id" UUID NOT NULL,
    "risk_level" "risk_level" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "explanation" TEXT,
    "recommendations" JSONB NOT NULL,
    CONSTRAINT "screening_risk_guidance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "screening_risk_guidance_condition_id_risk_level_key"
  ON "screening_risk_guidance"("condition_id", "risk_level");

DO $$ BEGIN
  ALTER TABLE "screening_risk_guidance" ADD CONSTRAINT "screening_risk_guidance_condition_id_fkey"
    FOREIGN KEY ("condition_id") REFERENCES "screening_conditions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "screening_config" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" VARCHAR(100) NOT NULL,
    "value" JSONB NOT NULL,
    CONSTRAINT "screening_config_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "screening_config_key_key" ON "screening_config"("key");

CREATE TABLE IF NOT EXISTS "screening_tests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID,
    "condition_id" UUID,
    "test_type" VARCHAR(50),
    "assessment_type" VARCHAR(20),
    "age" INTEGER,
    "gender" VARCHAR(20),
    "score" DECIMAL(5,2),
    "risk_level" "risk_level",
    "status" VARCHAR(20) DEFAULT 'completed',
    "explanation" TEXT,
    "recommendations" JSONB,
    "assigned_doctor_id" UUID,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "follow_up_date" DATE,
    "test_date" DATE,
    CONSTRAINT "screening_tests_pkey" PRIMARY KEY ("id")
);

-- Extend legacy screening_tests table (created before this migration)
ALTER TABLE "screening_tests" ADD COLUMN IF NOT EXISTS "condition_id" UUID;
ALTER TABLE "screening_tests" ADD COLUMN IF NOT EXISTS "assessment_type" VARCHAR(20);
ALTER TABLE "screening_tests" ADD COLUMN IF NOT EXISTS "age" INTEGER;
ALTER TABLE "screening_tests" ADD COLUMN IF NOT EXISTS "gender" VARCHAR(20);
ALTER TABLE "screening_tests" ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) DEFAULT 'completed';
ALTER TABLE "screening_tests" ADD COLUMN IF NOT EXISTS "explanation" TEXT;
ALTER TABLE "screening_tests" ADD COLUMN IF NOT EXISTS "recommendations" JSONB;
ALTER TABLE "screening_tests" ADD COLUMN IF NOT EXISTS "assigned_doctor_id" UUID;
ALTER TABLE "screening_tests" ADD COLUMN IF NOT EXISTS "flagged" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "screening_tests" ADD COLUMN IF NOT EXISTS "follow_up_date" DATE;

CREATE INDEX IF NOT EXISTS "screening_tests_patient_id_idx" ON "screening_tests"("patient_id");
CREATE INDEX IF NOT EXISTS "screening_tests_risk_level_idx" ON "screening_tests"("risk_level");
CREATE INDEX IF NOT EXISTS "screening_tests_condition_id_idx" ON "screening_tests"("condition_id");
CREATE INDEX IF NOT EXISTS "screening_tests_assigned_doctor_id_idx" ON "screening_tests"("assigned_doctor_id");

DO $$ BEGIN
  ALTER TABLE "screening_tests" ADD CONSTRAINT "screening_tests_patient_id_fkey"
    FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "screening_tests" ADD CONSTRAINT "screening_tests_condition_id_fkey"
    FOREIGN KEY ("condition_id") REFERENCES "screening_conditions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "screening_tests" ADD CONSTRAINT "screening_tests_assigned_doctor_id_fkey"
    FOREIGN KEY ("assigned_doctor_id") REFERENCES "doctors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "screening_answers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "screening_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "answer_value" TEXT NOT NULL,
    "score" DECIMAL(5,2),
    CONSTRAINT "screening_answers_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "screening_answers" ADD CONSTRAINT "screening_answers_screening_id_fkey"
    FOREIGN KEY ("screening_id") REFERENCES "screening_tests"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "screening_answers" ADD CONSTRAINT "screening_answers_question_id_fkey"
    FOREIGN KEY ("question_id") REFERENCES "screening_questions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
