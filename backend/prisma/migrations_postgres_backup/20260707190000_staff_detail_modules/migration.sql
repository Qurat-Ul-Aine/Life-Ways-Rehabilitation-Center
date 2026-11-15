-- Staff profile modules: attendance, tasks, notes, shift info
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "shift_type" VARCHAR(20);
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "shift_timing" VARCHAR(50);

CREATE TABLE IF NOT EXISTS "staff_attendance" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "staff_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "check_in" VARCHAR(10),
    "check_out" VARCHAR(10),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_attendance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "staff_tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "staff_id" UUID NOT NULL,
    "task_description" TEXT NOT NULL,
    "assigned_by" VARCHAR(100) NOT NULL,
    "assigned_by_id" UUID,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "date" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_tasks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "staff_notes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "staff_id" UUID NOT NULL,
    "note_text" TEXT NOT NULL,
    "added_by" VARCHAR(100) NOT NULL,
    "added_by_id" UUID,
    "added_by_role" VARCHAR(20),
    "date" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_notes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "staff_attendance_staff_id_date_key"
    ON "staff_attendance"("staff_id", "date");

CREATE INDEX IF NOT EXISTS "staff_attendance_staff_id_date_idx"
    ON "staff_attendance"("staff_id", "date" DESC);

CREATE INDEX IF NOT EXISTS "staff_tasks_staff_id_date_idx"
    ON "staff_tasks"("staff_id", "date" DESC);

CREATE INDEX IF NOT EXISTS "staff_notes_staff_id_date_idx"
    ON "staff_notes"("staff_id", "date" DESC);

DO $$ BEGIN
    ALTER TABLE "staff_attendance"
        ADD CONSTRAINT "staff_attendance_staff_id_fkey"
        FOREIGN KEY ("staff_id") REFERENCES "staff"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "staff_tasks"
        ADD CONSTRAINT "staff_tasks_staff_id_fkey"
        FOREIGN KEY ("staff_id") REFERENCES "staff"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "staff_notes"
        ADD CONSTRAINT "staff_notes_staff_id_fkey"
        FOREIGN KEY ("staff_id") REFERENCES "staff"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
