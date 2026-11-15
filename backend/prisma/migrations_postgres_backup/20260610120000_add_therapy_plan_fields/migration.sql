-- AlterEnum
ALTER TYPE "therapy_status" ADD VALUE IF NOT EXISTS 'CANCELLED';

-- AlterTable
ALTER TABLE "therapy_plans" ADD COLUMN IF NOT EXISTS "diagnosis" TEXT;
ALTER TABLE "therapy_plans" ADD COLUMN IF NOT EXISTS "goals" JSONB;
ALTER TABLE "therapy_plans" ADD COLUMN IF NOT EXISTS "frequency_per_week" INTEGER;

-- AlterTable
ALTER TABLE "therapy_sessions" ADD COLUMN IF NOT EXISTS "pain_level" INTEGER;
ALTER TABLE "therapy_sessions" ADD COLUMN IF NOT EXISTS "outcome" VARCHAR(30);
ALTER TABLE "therapy_sessions" ADD COLUMN IF NOT EXISTS "attendance" VARCHAR(20);
