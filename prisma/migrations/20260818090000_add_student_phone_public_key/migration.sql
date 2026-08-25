-- Safe for populated production databases: both columns are nullable and no
-- existing student row is changed. Run the backfill command after migration.
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "public_key" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "students_public_key_key"
  ON "students"("public_key");
