-- CreateTable
CREATE TABLE "UserSystemRecommendation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "systemSlug" TEXT NOT NULL,
    "fitScore" INTEGER NOT NULL,
    "fitLabel" TEXT NOT NULL,
    "reasons" JSONB NOT NULL,
    "recommended" BOOLEAN NOT NULL,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "declined" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "quizVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSystemRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSystemRecommendation_userId_systemSlug_key" ON "UserSystemRecommendation"("userId", "systemSlug");

-- CreateIndex
CREATE INDEX "UserSystemRecommendation_userId_idx" ON "UserSystemRecommendation"("userId");

-- CreateIndex
CREATE INDEX "UserSystemRecommendation_systemSlug_idx" ON "UserSystemRecommendation"("systemSlug");

-- AddForeignKey
ALTER TABLE "UserSystemRecommendation" ADD CONSTRAINT "UserSystemRecommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
