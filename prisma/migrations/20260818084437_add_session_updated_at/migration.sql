ALTER TABLE "sessions"
ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3);

UPDATE "sessions"
SET "updated_at" = COALESCE("updated_at", "created_at")
WHERE "updated_at" IS NULL;

ALTER TABLE "sessions"
ALTER COLUMN "updated_at" SET NOT NULL;