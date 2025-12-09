-- CreateTable
CREATE TABLE "ChannelRead" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelRead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChannelRead_userId_idx" ON "ChannelRead"("userId");

-- CreateIndex
CREATE INDEX "ChannelRead_channelId_idx" ON "ChannelRead"("channelId");

-- CreateIndex
CREATE INDEX "ChannelRead_userId_channelId_idx" ON "ChannelRead"("userId", "channelId");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelRead_userId_channelId_key" ON "ChannelRead"("userId", "channelId");

-- AddForeignKey
ALTER TABLE "ChannelRead" ADD CONSTRAINT "ChannelRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelRead" ADD CONSTRAINT "ChannelRead_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

