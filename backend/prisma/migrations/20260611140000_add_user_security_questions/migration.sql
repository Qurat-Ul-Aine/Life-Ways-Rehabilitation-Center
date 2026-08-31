-- SRS-19: Security questions for password reset verification
CREATE TABLE IF NOT EXISTS "user_security_questions" (
  "id" SERIAL NOT NULL,
  "user_id" UUID NOT NULL,
  "question_key" VARCHAR(100) NOT NULL,
  "answer_hash" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_security_questions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_security_questions_user_id_question_key_key"
  ON "user_security_questions"("user_id", "question_key");

DO $$ BEGIN
  ALTER TABLE "user_security_questions"
    ADD CONSTRAINT "user_security_questions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
