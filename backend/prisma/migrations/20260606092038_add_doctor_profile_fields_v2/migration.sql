-- AlterTable
ALTER TABLE "doctors" ADD COLUMN     "about" TEXT,
ADD COLUMN     "availability_schedule" JSONB,
ADD COLUMN     "doctor_role" VARCHAR(50),
ADD COLUMN     "image_url" TEXT;
