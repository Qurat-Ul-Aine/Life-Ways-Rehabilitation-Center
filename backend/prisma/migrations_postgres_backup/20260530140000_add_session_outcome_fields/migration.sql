-- Session outcome fields for therapy_sessions

ALTER TABLE "therapy_sessions" ADD COLUMN IF NOT EXISTS "mood" VARCHAR(20);

ALTER TABLE "therapy_sessions" ALTER COLUMN "outcome" TYPE VARCHAR(50);
