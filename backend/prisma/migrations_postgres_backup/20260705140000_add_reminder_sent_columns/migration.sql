-- Add reminder tracking for appointment and therapy session notification jobs

ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "reminder_sent" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "therapy_sessions" ADD COLUMN IF NOT EXISTS "reminder_sent" BOOLEAN NOT NULL DEFAULT false;
