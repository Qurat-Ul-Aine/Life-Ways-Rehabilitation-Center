CREATE TABLE IF NOT EXISTS "staff_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "staff_id" UUID NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100),
    "file_size" INTEGER,
    "uploaded_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "staff_documents_staff_id_uploaded_at_idx"
    ON "staff_documents"("staff_id", "uploaded_at" DESC);

DO $$ BEGIN
    ALTER TABLE "staff_documents"
        ADD CONSTRAINT "staff_documents_staff_id_fkey"
        FOREIGN KEY ("staff_id") REFERENCES "staff"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
