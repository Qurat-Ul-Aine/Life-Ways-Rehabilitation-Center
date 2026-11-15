-- AlterTable
ALTER TABLE "staff" ADD COLUMN     "base_salary" DECIMAL(10,2),
ADD COLUMN     "currency" VARCHAR(10) DEFAULT 'PKR',
ADD COLUMN     "phone" VARCHAR(20),
ADD COLUMN     "status" VARCHAR(20) DEFAULT 'active';
