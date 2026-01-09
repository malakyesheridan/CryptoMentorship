-- Add PDF resource attachments to tracks and lessons
ALTER TABLE "Track" ADD COLUMN IF NOT EXISTS "pdfResources" JSONB;
ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "pdfResources" JSONB;
