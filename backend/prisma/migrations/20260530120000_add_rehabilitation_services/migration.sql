-- Rehabilitation services and doctor/patient/appointment links

CREATE TABLE "rehabilitation_services" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(100) NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "rehabilitation_services_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "rehabilitation_services_slug_key" ON "rehabilitation_services"("slug");

CREATE TABLE "doctor_service" (
    "doctor_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,

    CONSTRAINT "doctor_service_pkey" PRIMARY KEY ("doctor_id","service_id")
);

CREATE TABLE "patient_services" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "sub_service" VARCHAR(150),
    "selected_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_services_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "patient_services_patient_id_key" ON "patient_services"("patient_id");

ALTER TABLE "appointments" ADD COLUMN "service_id" UUID;

ALTER TABLE "doctor_service" ADD CONSTRAINT "doctor_service_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "doctor_service" ADD CONSTRAINT "doctor_service_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "rehabilitation_services"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "patient_services" ADD CONSTRAINT "patient_services_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "patient_services" ADD CONSTRAINT "patient_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "rehabilitation_services"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "rehabilitation_services"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
