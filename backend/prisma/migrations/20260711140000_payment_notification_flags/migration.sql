-- Payment notification tracking flags for notification cron jobs

ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "invoice_notified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "success_notified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "overdue_notified" BOOLEAN NOT NULL DEFAULT false;
