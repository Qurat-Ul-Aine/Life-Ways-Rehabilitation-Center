-- CreateEnum
CREATE TYPE "online_therapy_session_status" AS ENUM ('SCHEDULED', 'APPROVED', 'COMPLETED', 'CANCELLED', 'MISSED');

-- CreateTable
CREATE TABLE "online_therapy_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "doctor_id" UUID NOT NULL,
    "appointment_id" UUID,
    "session_date" DATE NOT NULL,
    "session_time" TIME NOT NULL,
    "duration" INTEGER DEFAULT 45,
    "status" "online_therapy_session_status" NOT NULL DEFAULT 'SCHEDULED',
    "meeting_link" TEXT,
    "meeting_room" VARCHAR(255),
    "doctor_notes" TEXT,
    "notes_visible_to_patient" BOOLEAN NOT NULL DEFAULT false,
    "follow_up_required" BOOLEAN NOT NULL DEFAULT false,
    "follow_up_date" DATE,
    "cancelled_reason" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "online_therapy_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "online_therapy_sessions_patient_id_idx" ON "online_therapy_sessions"("patient_id");

-- CreateIndex
CREATE INDEX "online_therapy_sessions_doctor_id_idx" ON "online_therapy_sessions"("doctor_id");

-- CreateIndex
CREATE INDEX "online_therapy_sessions_status_idx" ON "online_therapy_sessions"("status");

-- CreateIndex
CREATE INDEX "online_therapy_sessions_session_date_idx" ON "online_therapy_sessions"("session_date");

-- AddForeignKey
ALTER TABLE "online_therapy_sessions" ADD CONSTRAINT "online_therapy_sessions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "online_therapy_sessions" ADD CONSTRAINT "online_therapy_sessions_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "online_therapy_sessions" ADD CONSTRAINT "online_therapy_sessions_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
