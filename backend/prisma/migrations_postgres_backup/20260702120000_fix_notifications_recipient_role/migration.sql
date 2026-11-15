-- Align Prisma schema with existing PostgreSQL column type for notifications.recipient_role.
-- The database already stores user_role enum values (including INTERN); no data changes required.

-- No-op when column is already user_role:
-- ALTER TABLE "notifications" ALTER COLUMN "recipient_role" TYPE "user_role" USING "recipient_role"::"user_role";
