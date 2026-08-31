-- Link appointments to therapy plans at booking time (nullable, no backfill).
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "therapy_plan_id" UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'appointments_therapy_plan_id_fkey'
  ) THEN
    ALTER TABLE "appointments"
      ADD CONSTRAINT "appointments_therapy_plan_id_fkey"
      FOREIGN KEY ("therapy_plan_id") REFERENCES "therapy_plans"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "appointments_therapy_plan_id_idx" ON "appointments"("therapy_plan_id");
