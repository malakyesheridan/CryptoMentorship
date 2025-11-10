-- Add Stripe-related columns to Membership table if they don't exist
DO $$ 
BEGIN
  -- Add stripeCustomerId if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Membership' AND column_name = 'stripeCustomerId'
  ) THEN
    ALTER TABLE "Membership" ADD COLUMN "stripeCustomerId" TEXT;
    CREATE INDEX IF NOT EXISTS "Membership_stripeCustomerId_idx" ON "Membership"("stripeCustomerId");
  END IF;

  -- Add stripeSubscriptionId if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Membership' AND column_name = 'stripeSubscriptionId'
  ) THEN
    ALTER TABLE "Membership" ADD COLUMN "stripeSubscriptionId" TEXT;
    CREATE INDEX IF NOT EXISTS "Membership_stripeSubscriptionId_idx" ON "Membership"("stripeSubscriptionId");
  END IF;

  -- Add stripePriceId if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Membership' AND column_name = 'stripePriceId'
  ) THEN
    ALTER TABLE "Membership" ADD COLUMN "stripePriceId" TEXT;
  END IF;

  -- Add currentPeriodStart if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Membership' AND column_name = 'currentPeriodStart'
  ) THEN
    ALTER TABLE "Membership" ADD COLUMN "currentPeriodStart" TIMESTAMP(3);
  END IF;

  -- Add currentPeriodEnd if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Membership' AND column_name = 'currentPeriodEnd'
  ) THEN
    ALTER TABLE "Membership" ADD COLUMN "currentPeriodEnd" TIMESTAMP(3);
  END IF;

  -- Add cancelAtPeriodEnd if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Membership' AND column_name = 'cancelAtPeriodEnd'
  ) THEN
    ALTER TABLE "Membership" ADD COLUMN "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

