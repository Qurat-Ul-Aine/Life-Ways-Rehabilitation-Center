-- SRS-21: Family member role for patient portal access
ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'FAMILY';

CREATE TABLE IF NOT EXISTS "family_members" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "patient_id" UUID NOT NULL,
  "relationship" VARCHAR(50),
  "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "family_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "family_members_user_id_key" ON "family_members"("user_id");

DO $$ BEGIN
  ALTER TABLE "family_members"
    ADD CONSTRAINT "family_members_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "family_members"
    ADD CONSTRAINT "family_members_patient_id_fkey"
    FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
