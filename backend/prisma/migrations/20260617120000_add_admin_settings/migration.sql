-- Admin profile avatar
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" VARCHAR(500);

-- Admin notification preferences
ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "doctor_registration_notifications" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "patient_registration_notifications" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "telehealth_notifications" BOOLEAN NOT NULL DEFAULT true;

-- Hospital branding (singleton)
CREATE TABLE IF NOT EXISTS "hospital_settings" (
    "id" VARCHAR(50) NOT NULL DEFAULT 'default',
    "hospital_name" VARCHAR(200) NOT NULL DEFAULT 'Life Ways Rehab',
    "logo_url" VARCHAR(500),
    "contact_email" VARCHAR(150),
    "contact_phone" VARCHAR(30),
    "address" TEXT,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    CONSTRAINT "hospital_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "hospital_settings" ("id")
VALUES ('default')
ON CONFLICT ("id") DO NOTHING;

-- System preferences (singleton)
CREATE TABLE IF NOT EXISTS "system_preferences" (
    "id" VARCHAR(50) NOT NULL DEFAULT 'default',
    "default_appointment_duration" INTEGER NOT NULL DEFAULT 30,
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'Asia/Karachi',
    "date_format" VARCHAR(30) NOT NULL DEFAULT 'dd MMM yyyy',
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    CONSTRAINT "system_preferences_pkey" PRIMARY KEY ("id")
);

INSERT INTO "system_preferences" ("id")
VALUES ('default')
ON CONFLICT ("id") DO NOTHING;
