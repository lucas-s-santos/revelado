-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "highlight" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hint" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "missing" JSONB;
