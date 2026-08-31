-- AlterTable
ALTER TABLE "ai_analysis" ADD COLUMN IF NOT EXISTS "assessment_data" JSONB;

-- CreateTable
CREATE TABLE IF NOT EXISTS "doctor_match_notes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "doctor_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "analysis_id" UUID NOT NULL,
    "assessment_notes" TEXT,
    "treatment_notes" TEXT,
    "progress_notes" TEXT,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doctor_match_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "doctor_match_notes_doctor_id_patient_id_analysis_id_key"
ON "doctor_match_notes"("doctor_id", "patient_id", "analysis_id");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "doctor_match_notes"
    ADD CONSTRAINT "doctor_match_notes_doctor_id_fkey"
    FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "doctor_match_notes"
    ADD CONSTRAINT "doctor_match_notes_patient_id_fkey"
    FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "doctor_match_notes"
    ADD CONSTRAINT "doctor_match_notes_analysis_id_fkey"
    FOREIGN KEY ("analysis_id") REFERENCES "ai_analysis"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
