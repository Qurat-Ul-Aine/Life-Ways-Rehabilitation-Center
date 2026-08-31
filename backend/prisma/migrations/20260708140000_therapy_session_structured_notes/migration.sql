-- Structured therapy session notes (patient-visible + confidential fields)
ALTER TABLE "therapy_sessions" ADD COLUMN IF NOT EXISTS "session_type" VARCHAR(20);
ALTER TABLE "therapy_sessions" ADD COLUMN IF NOT EXISTS "chief_complaint" TEXT;
ALTER TABLE "therapy_sessions" ADD COLUMN IF NOT EXISTS "observations" TEXT;
ALTER TABLE "therapy_sessions" ADD COLUMN IF NOT EXISTS "exercises_discussed" TEXT;
ALTER TABLE "therapy_sessions" ADD COLUMN IF NOT EXISTS "next_steps" TEXT;
ALTER TABLE "therapy_sessions" ADD COLUMN IF NOT EXISTS "confidential_notes" TEXT;
ALTER TABLE "therapy_sessions" ADD COLUMN IF NOT EXISTS "appointment_id" UUID;

CREATE INDEX IF NOT EXISTS "therapy_sessions_appointment_id_idx" ON "therapy_sessions"("appointment_id");

DO $$ BEGIN
  ALTER TABLE "therapy_sessions" ADD CONSTRAINT "therapy_sessions_appointment_id_fkey"
    FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
