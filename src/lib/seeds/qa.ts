import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function seedQAData() {
  console.log('🌱 Seeding Q&A data...')

  // Get users and events
  const users = await prisma.user.findMany({ take: 6 })
  const pastEvents = await prisma.event.findMany({
    where: {
      recordingUrl: { not: null }
    },
    take: 2
  })

  if (users.length === 0 || pastEvents.length === 0) {
    console.log('No users or past events found. Please run user and event seeds first.')
    return
  }

  const event = pastEvents[0] // Use the first past event
  const admin = users.find(u => u.role === 'admin') || users[0]
  const members = users.filter(u => u.role === 'member' || u.role === 'editor')

  // Create questions
  const questions = [
    {
      body: "What's your outlook on Bitcoin for the next 6 months?",
      userId: members[0].id,
      answeredAt: new Date(),
      answer: "Based on current market conditions and technical analysis, I expect Bitcoin to continue its upward trend with potential resistance around $75,000-$80,000. The key factors to watch are institutional adoption and regulatory clarity.",
      answeredBy: admin.id
    },
    {
      body: "How should I position my portfolio for the upcoming halving?",
      userId: members[1].id,
      answeredAt: new Date(),
      answer: "The halving typically creates supply shock effects 6-12 months after the event. I recommend accumulating quality projects during any dips and maintaining a diversified portfolio across different sectors.",
      answeredBy: admin.id
    },
    {
      body: "What are the biggest risks to the current bull market?",
      userId: members[2].id,
      answeredAt: new Date(),
      answer: "The main risks include regulatory crackdowns, macroeconomic headwinds, and potential market manipulation. However, the underlying fundamentals remain strong with increasing institutional adoption.",
      answeredBy: admin.id
    },
    {
      body: "Do you think DeFi will outperform Bitcoin this cycle?",
      userId: members[0].id,
      answeredAt: null,
      answer: null,
      answeredBy: null
    },
    {
      body: "What's your take on the recent ETF approvals?",
      userId: members[1].id,
      answeredAt: null,
      answer: null,
      answeredBy: null
    },
    {
      body: "How do you manage risk in volatile markets?",
      userId: members[2].id,
      answeredAt: null,
      answer: null,
      answeredBy: null
    }
  ]

  const createdQuestions = []
  for (const questionData of questions) {
    const question = await prisma.question.create({
      data: {
        eventId: event.id,
        userId: questionData.userId,
        body: questionData.body,
        answeredAt: questionData.answeredAt,
        answer: questionData.answer,
        answeredBy: questionData.answeredBy
      }
    })
    createdQuestions.push(question)
  }

  // Create votes for questions
  const voteData = [
    { questionId: createdQuestions[0].id, userIds: [members[1].id, members[2].id, admin.id] },
    { questionId: createdQuestions[1].id, userIds: [members[0].id, members[2].id] },
    { questionId: createdQuestions[2].id, userIds: [members[0].id, members[1].id, members[2].id] },
    { questionId: createdQuestions[3].id, userIds: [members[1].id] },
    { questionId: createdQuestions[4].id, userIds: [members[0].id, members[2].id] },
    { questionId: createdQuestions[5].id, userIds: [members[0].id, members[1].id] }
  ]

  for (const vote of voteData) {
    for (const userId of vote.userIds) {
      await prisma.vote.create({
        data: {
          userId,
          questionId: vote.questionId
        }
      })
    }
  }

  // Create chapters
  const chapters = [
    { title: 'Introduction & Welcome', startMs: 0 },
    { title: 'Bitcoin Trend Analysis', startMs: 2 * 60 * 1000 + 15 * 1000 }, // 2:15
    { title: 'Risk Management Discussion', startMs: 8 * 60 * 1000 + 40 * 1000 }, // 8:40
    { title: 'Q&A Session', startMs: 15 * 60 * 1000 + 10 * 1000 }, // 15:10
    { title: 'Wrap-up & Next Steps', startMs: 22 * 60 * 1000 + 30 * 1000 } // 22:30
  ]

  for (const chapterData of chapters) {
    await prisma.chapter.create({
      data: {
        eventId: event.id,
        title: chapterData.title,
        startMs: chapterData.startMs
      }
    })
  }

  // Create transcript
  const transcript = await prisma.transcript.upsert({
    where: {
      eventId: event.id
    },
    update: {
      source: 'manual',
      uploadedBy: admin.id
    },
    create: {
      eventId: event.id,
      source: 'manual',
      uploadedBy: admin.id
    }
  })

  // Create transcript segments
  const segments = [
    { startMs: 0, endMs: 5000, text: "Welcome everyone to today's Bitcoin trend analysis session. I'm excited to dive into the current market conditions with you." },
    { startMs: 5000, endMs: 15000, text: "Let's start by looking at the current price action. Bitcoin has been showing strong momentum above the $60,000 level, which is a key psychological resistance." },
    { startMs: 15000, endMs: 25000, text: "The technical indicators are pointing to continued bullish sentiment. The RSI is in healthy territory, and we're seeing strong volume support." },
    { startMs: 25000, endMs: 35000, text: "Moving on to risk management, it's crucial to have a clear exit strategy. Never invest more than you can afford to lose." },
    { startMs: 35000, endMs: 45000, text: "Diversification is key. While Bitcoin is the flagship cryptocurrency, consider allocating some portion to other quality projects." },
    { startMs: 45000, endMs: 55000, text: "Now let's address some of your questions. First, regarding the 6-month outlook for Bitcoin..." },
    { startMs: 55000, endMs: 65000, text: "The halving event typically creates supply shock effects. Historical data shows that the biggest gains often come 6-12 months after the halving." },
    { startMs: 65000, endMs: 75000, text: "Regarding DeFi performance, it's important to understand that different sectors perform differently in various market cycles." },
    { startMs: 75000, endMs: 85000, text: "The recent ETF approvals have been a game-changer for institutional adoption. We're seeing significant inflows from traditional finance." },
    { startMs: 85000, endMs: 95000, text: "Risk management in volatile markets requires discipline. Set clear stop-losses and take profits at predetermined levels." },
    { startMs: 95000, endMs: 105000, text: "To wrap up, the fundamentals remain strong. Institutional adoption is accelerating, and regulatory clarity is improving." },
    { startMs: 105000, endMs: 115000, text: "Thank you all for joining today's session. Remember to stay informed, manage your risk, and invest responsibly." },
    { startMs: 115000, endMs: 120000, text: "We'll be back next week with more market analysis. Until then, keep an eye on the key levels we discussed." }
  ]

  for (const segmentData of segments) {
    await prisma.transcriptSegment.create({
      data: {
        transcriptId: transcript.id,
        startMs: segmentData.startMs,
        endMs: segmentData.endMs,
        text: segmentData.text
      }
    })
  }

  console.log(`✅ Created Q&A data for event: ${event.title}`)
  console.log(`- ${createdQuestions.length} questions (${questions.filter(q => q.answeredAt).length} answered)`)
  console.log(`- ${chapters.length} chapters`)
  console.log(`- ${segments.length} transcript segments`)
  console.log(`- ${voteData.reduce((sum, v) => sum + v.userIds.length, 0)} votes`)
}
