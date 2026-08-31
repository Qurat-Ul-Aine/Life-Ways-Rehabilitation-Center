-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "date_of_birth" DATE,
ADD COLUMN     "emergency_contact_name" VARCHAR(100),
ADD COLUMN     "emergency_contact_phone" VARCHAR(20),
ADD COLUMN     "status" VARCHAR(20);
