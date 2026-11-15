-- CreateEnum
CREATE TYPE "appointment_status" AS ENUM ('BOOKED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "appointment_type" AS ENUM ('ONLINE', 'PHYSICAL');

-- CreateEnum
CREATE TYPE "availability_status" AS ENUM ('AVAILABLE', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "notification_type" AS ENUM ('EMAIL', 'WHATSAPP', 'SYSTEM');

-- CreateEnum
CREATE TYPE "risk_level" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "session_status" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "therapy_status" AS ENUM ('ACTIVE', 'COMPLETED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('ADMIN', 'DOCTOR', 'STAFF', 'PATIENT');

-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID,
    "doctor_id" UUID,
    "appointment_date" DATE,
    "appointment_time" TIME(6),
    "type" "appointment_type",
    "status" "appointment_status",
    "notes" TEXT,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor_patient" (
    "doctor_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,

    CONSTRAINT "doctor_patient_pkey" PRIMARY KEY ("doctor_id","patient_id")
);

-- CreateTable
CREATE TABLE "doctor_recommendations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID,
    "doctor_id" UUID,
    "condition_type" VARCHAR(100),
    "severity_level" "risk_level",
    "match_score" DECIMAL(5,2),

    CONSTRAINT "doctor_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "license_no" VARCHAR(50) NOT NULL,
    "experience_years" INTEGER,
    "specialization" VARCHAR(100),
    "qualification" VARCHAR(100),
    "availability" "availability_status",
    "consultation_fee" DECIMAL(10,2),
    "rating" DECIMAL(3,2),

    CONSTRAINT "doctors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID,
    "doctor_id" UUID,
    "rating" INTEGER,
    "comments" TEXT,
    "feedback_date" DATE,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internee_degrees" (
    "id" SERIAL NOT NULL,
    "internee_id" UUID,
    "degree_program" VARCHAR(100),

    CONSTRAINT "internee_degrees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internee_universities" (
    "id" SERIAL NOT NULL,
    "internee_id" UUID,
    "university_name" VARCHAR(150),

    CONSTRAINT "internee_universities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internees" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "internship_start" DATE,
    "internship_end" DATE,
    "mentor_id" UUID,

    CONSTRAINT "internees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "type" "notification_type",
    "message" TEXT,
    "status" VARCHAR(20),
    "sent_date" TIMESTAMP(6),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_addresses" (
    "id" SERIAL NOT NULL,
    "patient_id" UUID,
    "address" TEXT,

    CONSTRAINT "patient_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_admissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID,
    "admission_date" DATE,
    "discharge_date" DATE,
    "condition" TEXT,

    CONSTRAINT "patient_admissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_medical_history" (
    "id" SERIAL NOT NULL,
    "patient_id" UUID,
    "history" TEXT,

    CONSTRAINT "patient_medical_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_phones" (
    "id" SERIAL NOT NULL,
    "patient_id" UUID,
    "phone" VARCHAR(20),

    CONSTRAINT "patient_phones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "age" INTEGER,
    "gender" VARCHAR(10),
    "nationality" VARCHAR(50),
    "condition" VARCHAR(100),

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID,
    "generated_by" UUID,
    "report_type" VARCHAR(50),
    "report_data" TEXT,
    "generated_date" TIMESTAMP(6),

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "screening_tests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID,
    "test_type" VARCHAR(50),
    "score" DECIMAL(5,2),
    "risk_level" "risk_level",
    "test_date" DATE,

    CONSTRAINT "screening_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telehealth_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "appointment_id" UUID,
    "meeting_link" TEXT,
    "start_time" TIMESTAMP(6),
    "end_time" TIMESTAMP(6),
    "notes" TEXT,

    CONSTRAINT "telehealth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "therapy_exercises" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "therapy_plan_id" UUID,
    "title" VARCHAR(150),
    "description" TEXT,
    "media_url" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "therapy_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "therapy_plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID,
    "doctor_id" UUID,
    "therapy_type" VARCHAR(100),
    "description" TEXT,
    "start_date" DATE,
    "end_date" DATE,
    "status" "therapy_status",

    CONSTRAINT "therapy_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "therapy_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "therapy_plan_id" UUID,
    "session_date" DATE,
    "duration" INTEGER,
    "progress_notes" TEXT,
    "status" "session_status",

    CONSTRAINT "therapy_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_phones" (
    "id" SERIAL NOT NULL,
    "user_id" UUID,
    "phone" VARCHAR(20) NOT NULL,

    CONSTRAINT "user_phones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "password" TEXT NOT NULL,
    "role" "user_role" NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "department" VARCHAR(100),
    "position" VARCHAR(100),
    "joined_at" DATE,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(6) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "doctors_user_id_key" ON "doctors"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "doctors_license_no_key" ON "doctors"("license_no");

-- CreateIndex
CREATE UNIQUE INDEX "patients_user_id_key" ON "patients"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "staff_user_id_key" ON "staff"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "doctor_patient" ADD CONSTRAINT "doctor_patient_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "doctor_patient" ADD CONSTRAINT "doctor_patient_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "doctor_recommendations" ADD CONSTRAINT "doctor_recommendations_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "doctor_recommendations" ADD CONSTRAINT "doctor_recommendations_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "internee_degrees" ADD CONSTRAINT "internee_degrees_internee_id_fkey" FOREIGN KEY ("internee_id") REFERENCES "internees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "internee_universities" ADD CONSTRAINT "internee_universities_internee_id_fkey" FOREIGN KEY ("internee_id") REFERENCES "internees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "internees" ADD CONSTRAINT "internees_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "doctors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "internees" ADD CONSTRAINT "internees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "patient_addresses" ADD CONSTRAINT "patient_addresses_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "patient_admissions" ADD CONSTRAINT "patient_admissions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "patient_medical_history" ADD CONSTRAINT "patient_medical_history_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "patient_phones" ADD CONSTRAINT "patient_phones_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "screening_tests" ADD CONSTRAINT "screening_tests_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "telehealth_sessions" ADD CONSTRAINT "telehealth_sessions_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "therapy_exercises" ADD CONSTRAINT "therapy_exercises_therapy_plan_id_fkey" FOREIGN KEY ("therapy_plan_id") REFERENCES "therapy_plans"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "therapy_plans" ADD CONSTRAINT "therapy_plans_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "therapy_plans" ADD CONSTRAINT "therapy_plans_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "therapy_sessions" ADD CONSTRAINT "therapy_sessions_therapy_plan_id_fkey" FOREIGN KEY ("therapy_plan_id") REFERENCES "therapy_plans"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_phones" ADD CONSTRAINT "user_phones_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
