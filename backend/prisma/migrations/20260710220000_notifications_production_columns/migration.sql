-- Align notifications table with Prisma schema (title, is_read, created_at, recipient_role, related_id, failure_reason)

ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "title" VARCHAR(200);
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "is_read" BOOLEAN DEFAULT false;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "recipient_role" "user_role";
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "related_id" UUID;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "failure_reason" TEXT;

CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "notifications"("user_id");
CREATE INDEX IF NOT EXISTS "notifications_status_idx" ON "notifications"("status");
