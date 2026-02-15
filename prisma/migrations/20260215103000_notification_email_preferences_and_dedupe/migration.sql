ALTER TYPE "EmailType" ADD VALUE IF NOT EXISTS 'NOTIFICATION_PORTFOLIO_UPDATE';
ALTER TYPE "EmailType" ADD VALUE IF NOT EXISTS 'NOTIFICATION_CRYPTO_COMPASS';
ALTER TYPE "EmailType" ADD VALUE IF NOT EXISTS 'NOTIFICATION_LEARNING_HUB';
ALTER TYPE "EmailType" ADD VALUE IF NOT EXISTS 'NOTIFICATION_COMMUNITY_MENTION';
ALTER TYPE "EmailType" ADD VALUE IF NOT EXISTS 'NOTIFICATION_COMMUNITY_REPLY';

ALTER TABLE "NotificationPreference"
  ADD COLUMN IF NOT EXISTS "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "portfolioUpdatesEmail" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "cryptoCompassEmail" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "learningHubEmail" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "communityMentionsEmail" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "communityRepliesEmail" BOOLEAN NOT NULL DEFAULT true;

UPDATE "NotificationPreference"
SET
  "inAppEnabled" = COALESCE("inApp", true),
  "emailEnabled" = COALESCE("email", true),
  "portfolioUpdatesEmail" = COALESCE("onSignal", true),
  "cryptoCompassEmail" = COALESCE("onEpisode", true),
  "learningHubEmail" = COALESCE("onResearch", true),
  "communityMentionsEmail" = COALESCE("onMention", true),
  "communityRepliesEmail" = COALESCE("onReply", true);

ALTER TABLE "EmailOutbox"
  ADD COLUMN IF NOT EXISTS "dedupeKey" TEXT;

UPDATE "EmailOutbox"
SET "dedupeKey" = "idempotencyKey"
WHERE "dedupeKey" IS NULL;

ALTER TABLE "EmailOutbox"
  ALTER COLUMN "dedupeKey" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "EmailOutbox_dedupeKey_key" ON "EmailOutbox"("dedupeKey");
