-- Track last edit time on intern attendance and training logs

ALTER TABLE "intern_attendance" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(6);
ALTER TABLE "intern_training_logs" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(6);
