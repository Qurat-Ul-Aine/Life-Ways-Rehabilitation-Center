-- Link appointments to the AI assessment that led to the booking (nullable).
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "analysis_id" UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'appointments_analysis_id_fkey'
  ) THEN
    ALTER TABLE "appointments"
      ADD CONSTRAINT "appointments_analysis_id_fkey"
      FOREIGN KEY ("analysis_id") REFERENCES "ai_analysis"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "appointments_analysis_id_idx" ON "appointments"("analysis_id");
