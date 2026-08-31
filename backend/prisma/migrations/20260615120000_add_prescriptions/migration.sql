-- CreateEnum
CREATE TYPE "prescription_status" AS ENUM ('ACTIVE', 'COMPLETED', 'DISCONTINUED', 'ON_HOLD', 'INVALID');

-- CreateEnum
CREATE TYPE "dose_period" AS ENUM ('MORNING', 'AFTERNOON', 'NIGHT');

-- CreateTable
CREATE TABLE "prescriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "prescribed_by" UUID NOT NULL,
    "medication_name" VARCHAR(255) NOT NULL,
    "dosage" VARCHAR(100) NOT NULL,
    "frequency" VARCHAR(100) NOT NULL,
    "duration_days" INTEGER,
    "schedule" JSONB,
    "instructions" TEXT,
    "notes" TEXT,
    "status" "prescription_status" NOT NULL DEFAULT 'ACTIVE',
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "document_id" UUID,
    "is_invalid" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medication_dose_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "prescription_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "dose_period" "dose_period" NOT NULL,
    "log_date" DATE NOT NULL,
    "taken_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medication_dose_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "prescriptions_patient_id_status_idx" ON "prescriptions"("patient_id", "status");

-- CreateIndex
CREATE INDEX "prescriptions_prescribed_by_idx" ON "prescriptions"("prescribed_by");

-- CreateIndex
CREATE INDEX "prescriptions_deleted_at_idx" ON "prescriptions"("deleted_at");

-- CreateIndex
CREATE INDEX "medication_dose_logs_patient_id_log_date_idx" ON "medication_dose_logs"("patient_id", "log_date");

-- CreateIndex
CREATE UNIQUE INDEX "medication_dose_logs_prescription_id_dose_period_log_date_key" ON "medication_dose_logs"("prescription_id", "dose_period", "log_date");

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_prescribed_by_fkey" FOREIGN KEY ("prescribed_by") REFERENCES "doctors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "patient_documents"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "medication_dose_logs" ADD CONSTRAINT "medication_dose_logs_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "medication_dose_logs" ADD CONSTRAINT "medication_dose_logs_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
