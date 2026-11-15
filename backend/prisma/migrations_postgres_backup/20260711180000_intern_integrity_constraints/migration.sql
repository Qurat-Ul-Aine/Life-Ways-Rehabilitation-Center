-- Intern module integrity constraints (SRS-201, SRS-213)

CREATE UNIQUE INDEX IF NOT EXISTS "internees_user_id_unique"
  ON "internees" ("user_id")
  WHERE "user_id" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "intern_attendance_intern_date_unique"
  ON "intern_attendance" ("intern_id", "record_date")
  WHERE "intern_id" IS NOT NULL AND "record_date" IS NOT NULL;
