-- AlterTable
ALTER TABLE "ai_analysis" ADD COLUMN IF NOT EXISTS "medical_history_summary" TEXT;
ALTER TABLE "ai_analysis" ADD COLUMN IF NOT EXISTS "selected_doctor_id" UUID;

-- AlterTable
ALTER TABLE "recommendation_log" ADD COLUMN IF NOT EXISTS "analysis_id" UUID;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "recommendation_log" ADD CONSTRAINT "recommendation_log_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "ai_analysis"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ai_analysis" ADD CONSTRAINT "ai_analysis_selected_doctor_id_fkey" FOREIGN KEY ("selected_doctor_id") REFERENCES "doctors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
