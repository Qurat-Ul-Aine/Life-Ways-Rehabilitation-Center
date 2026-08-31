CREATE TABLE IF NOT EXISTS "therapy_plan_files" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "therapy_plan_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100),
    "file_size" INTEGER,
    "file_type" VARCHAR(20),
    "uploaded_by" VARCHAR(150),
    "uploaded_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "therapy_plan_files_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "therapy_plan_files_therapy_plan_id_uploaded_at_idx"
    ON "therapy_plan_files"("therapy_plan_id", "uploaded_at" DESC);

DO $$ BEGIN
    ALTER TABLE "therapy_plan_files"
        ADD CONSTRAINT "therapy_plan_files_therapy_plan_id_fkey"
        FOREIGN KEY ("therapy_plan_id") REFERENCES "therapy_plans"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
