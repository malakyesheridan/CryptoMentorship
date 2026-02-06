-- CreateTable
CREATE TABLE "TrialReminderLog" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "reminderType" TEXT NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "digestId" TEXT,

    CONSTRAINT "TrialReminderLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrialReminderLog_membershipId_idx" ON "TrialReminderLog"("membershipId");

-- CreateIndex
CREATE INDEX "TrialReminderLog_periodEnd_idx" ON "TrialReminderLog"("periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "TrialReminderLog_reminderType_membershipId_periodEnd_key" ON "TrialReminderLog"("reminderType", "membershipId", "periodEnd");

-- AddForeignKey
ALTER TABLE "TrialReminderLog" ADD CONSTRAINT "TrialReminderLog_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
