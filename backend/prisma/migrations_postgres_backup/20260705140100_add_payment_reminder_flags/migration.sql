-- Payment reminder tracking for notification cron jobs

ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "reminder_before_due_sent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "reminder_on_due_sent" BOOLEAN NOT NULL DEFAULT false;
