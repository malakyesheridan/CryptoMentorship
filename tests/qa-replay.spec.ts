import { test, expect } from '@playwright/test'

test.describe('Event Q&A & Replay Features', () => {
  test.describe('Member Q&A Features', () => {
    test.beforeEach(async ({ page }) => {
      // Login as member
      await page.goto('http://localhost:3000/api/auth/signin')
      await page.fill('input[name="email"]', 'member@demo.com')
      await page.fill('input[name="password"]', 'password')
      await page.click('button[type="submit"]')
      await page.waitForURL('http://localhost:3000/dashboard')
    })

    test('member can ask a question on event page', async ({ page }) => {
      // Navigate to a past event with Q&A data
      await page.goto('/events')
      await page.click('button[data-testid="past-tab"]')
      
      // Find and click on an event with recording
      const eventCard = page.locator('[data-testid="event-card"]').first()
      await eventCard.click()
      
      // Wait for event page to load
      await page.waitForLoadState('networkidle')
      
      // Find the questions section
      await expect(page.getByRole('heading', { name: /questions/i })).toBeVisible()
      
      // Ask a question
      const questionText = 'What is your outlook on the next market cycle?'
      await page.fill('textarea[placeholder*="Ask a question"]', questionText)
      await page.click('button:has-text("Ask Question")')
      
      // Verify question appears in the list
      await expect(page.getByText(questionText)).toBeVisible()
    })

    test('member can vote on questions', async ({ page }) => {
      await page.goto('/events')
      await page.click('button[data-testid="past-tab"]')
      
      const eventCard = page.locator('[data-testid="event-card"]').first()
      await eventCard.click()
      
      await page.waitForLoadState('networkidle')
      
      // Find a question with vote button
      const voteButton = page.locator('button:has-text("vote")').first()
      const initialVoteCount = await voteButton.textContent()
      
      // Click vote button
      await voteButton.click()
      
      // Verify vote count increased
      await expect(voteButton).toContainText((parseInt(initialVoteCount!) + 1).toString())
      
      // Click again to remove vote
      await voteButton.click()
      
      // Verify vote count decreased
      await expect(voteButton).toContainText(initialVoteCount!)
    })

    test('member sees answered questions with answers', async ({ page }) => {
      await page.goto('/events')
      await page.click('button[data-testid="past-tab"]')
      
      const eventCard = page.locator('[data-testid="event-card"]').first()
      await eventCard.click()
      
      await page.waitForLoadState('networkidle')
      
      // Check for answered questions
      await expect(page.getByText('Answered')).toBeVisible()
      
      // Check for answer content
      await expect(page.getByText('Answer')).toBeVisible()
    })

    test('questions are sorted by votes', async ({ page }) => {
      await page.goto('/events')
      await page.click('button[data-testid="past-tab"]')
      
      const eventCard = page.locator('[data-testid="event-card"]').first()
      await eventCard.click()
      
      await page.waitForLoadState('networkidle')
      
      // Get all vote counts
      const voteButtons = page.locator('button:has-text("vote")')
      const voteCounts = []
      
      for (let i = 0; i < await voteButtons.count(); i++) {
        const text = await voteButtons.nth(i).textContent()
        const count = parseInt(text!.split(' ')[0])
        voteCounts.push(count)
      }
      
      // Verify votes are in descending order
      for (let i = 1; i < voteCounts.length; i++) {
        expect(voteCounts[i-1]).toBeGreaterThanOrEqual(voteCounts[i])
      }
    })
  })

  test.describe('Replay Features', () => {
    test.beforeEach(async ({ page }) => {
      // Login as member
      await page.goto('http://localhost:3000/api/auth/signin')
      await page.fill('input[name="email"]', 'member@demo.com')
      await page.fill('input[name="password"]', 'password')
      await page.click('button[type="submit"]')
      await page.waitForURL('http://localhost:3000/dashboard')
    })

    test('member can view replay section with player', async ({ page }) => {
      await page.goto('/events')
      await page.click('button[data-testid="past-tab"]')
      
      const eventCard = page.locator('[data-testid="event-card"]').first()
      await eventCard.click()
      
      await page.waitForLoadState('networkidle')
      
      // Check for replay section
      await expect(page.locator('iframe[src*="youtube.com"]')).toBeVisible()
    })

    test('member can click chapters to seek video', async ({ page }) => {
      await page.goto('/events')
      await page.click('button[data-testid="past-tab"]')
      
      const eventCard = page.locator('[data-testid="event-card"]').first()
      await eventCard.click()
      
      await page.waitForLoadState('networkidle')
      
      // Check for chapters section
      await expect(page.getByRole('heading', { name: /chapters/i })).toBeVisible()
      
      // Click on a chapter
      const chapterButton = page.locator('button:has-text("Introduction")').first()
      await chapterButton.click()
      
      // Verify URL updates with time parameter
      await expect(page).toHaveURL(/t=\d+/)
    })

    test('member can search transcript', async ({ page }) => {
      await page.goto('/events')
      await page.click('button[data-testid="past-tab"]')
      
      const eventCard = page.locator('[data-testid="event-card"]').first()
      await eventCard.click()
      
      await page.waitForLoadState('networkidle')
      
      // Check for transcript section
      await expect(page.getByRole('heading', { name: /transcript/i })).toBeVisible()
      
      // Search for text
      await page.fill('input[placeholder*="Search transcript"]', 'Bitcoin')
      
      // Verify filtered results
      await expect(page.getByText('Bitcoin')).toBeVisible()
    })

    test('member can click transcript segments to seek', async ({ page }) => {
      await page.goto('/events')
      await page.click('button[data-testid="past-tab"]')
      
      const eventCard = page.locator('[data-testid="event-card"]').first()
      await eventCard.click()
      
      await page.waitForLoadState('networkidle')
      
      // Click on a transcript segment
      const segmentButton = page.locator('button:has-text("Welcome everyone")').first()
      await segmentButton.click()
      
      // Verify URL updates with time parameter
      await expect(page).toHaveURL(/t=\d+/)
    })

    test('deep link with time parameter seeks video on load', async ({ page }) => {
      // Navigate directly to event with time parameter
      await page.goto('/events')
      await page.click('button[data-testid="past-tab"]')
      
      const eventCard = page.locator('[data-testid="event-card"]').first()
      await eventCard.click()
      
      await page.waitForLoadState('networkidle')
      
      // Get the current URL and add time parameter
      const currentUrl = page.url()
      const urlWithTime = currentUrl + '?t=30'
      
      // Navigate to URL with time parameter
      await page.goto(urlWithTime)
      
      // Verify URL contains time parameter
      await expect(page).toHaveURL(/t=30/)
    })
  })

  test.describe('Admin Q&A Management', () => {
    test.beforeEach(async ({ page }) => {
      // Login as admin
      await page.goto('http://localhost:3000/api/auth/signin')
      await page.fill('input[name="email"]', 'admin@demo.com')
      await page.fill('input[name="password"]', 'password')
      await page.click('button[type="submit"]')
      await page.waitForURL('http://localhost:3000/dashboard')
    })

    test('admin can view questions management page', async ({ page }) => {
      // Navigate to admin events
      await page.goto('/admin/events')
      
      // Find an event and click on it
      const eventRow = page.locator('tr').nth(1) // Skip header row
      await eventRow.click()
      
      // Click on questions tab
      await page.click('a:has-text("Questions")')
      
      // Verify questions page loads
      await expect(page.getByRole('heading', { name: /questions/i })).toBeVisible()
      
      // Check for stats cards
      await expect(page.getByText('Total Questions')).toBeVisible()
      await expect(page.getByText('Open Questions')).toBeVisible()
      await expect(page.getByText('Answered')).toBeVisible()
    })

    test('admin can answer a question', async ({ page }) => {
      await page.goto('/admin/events')
      
      const eventRow = page.locator('tr').nth(1)
      await eventRow.click()
      
      await page.click('a:has-text("Questions")')
      
      // Find an unanswered question
      const answerButton = page.locator('button:has-text("Answer")').first()
      await answerButton.click()
      
      // Fill in answer
      const answerText = 'This is a comprehensive answer to your question.'
      await page.fill('textarea[placeholder*="Write your answer"]', answerText)
      
      // Save answer
      await page.click('button:has-text("Save Answer")')
      
      // Verify answer appears
      await expect(page.getByText(answerText)).toBeVisible()
      await expect(page.getByText('Answered')).toBeVisible()
    })

    test('admin can archive questions', async ({ page }) => {
      await page.goto('/admin/events')
      
      const eventRow = page.locator('tr').nth(1)
      await eventRow.click()
      
      await page.click('a:has-text("Questions")')
      
      // Find archive button
      const archiveButton = page.locator('button:has-text("Archive")').first()
      await archiveButton.click()
      
      // Verify question is archived
      await expect(page.getByText('Archived')).toBeVisible()
    })

    test('admin can export questions as CSV', async ({ page }) => {
      await page.goto('/admin/events')
      
      const eventRow = page.locator('tr').nth(1)
      await eventRow.click()
      
      await page.click('a:has-text("Questions")')
      
      // Click export button
      const downloadPromise = page.waitForEvent('download')
      await page.click('a:has-text("Export CSV")')
      
      const download = await downloadPromise
      
      // Verify download starts
      expect(download.suggestedFilename()).toContain('.csv')
    })

    test('admin can filter questions by status', async ({ page }) => {
      await page.goto('/admin/events')
      
      const eventRow = page.locator('tr').nth(1)
      await eventRow.click()
      
      await page.click('a:has-text("Questions")')
      
      // Click on "Open" filter
      await page.click('a:has-text("Open")')
      
      // Verify only open questions are shown
      await expect(page.getByText('Open')).toBeVisible()
      await expect(page.getByText('Answered')).not.toBeVisible()
    })
  })

  test.describe('Admin Replay Management', () => {
    test.beforeEach(async ({ page }) => {
      // Login as admin
      await page.goto('http://localhost:3000/api/auth/signin')
      await page.fill('input[name="email"]', 'admin@demo.com')
      await page.fill('input[name="password"]', 'password')
      await page.click('button[type="submit"]')
      await page.waitForURL('http://localhost:3000/dashboard')
    })

    test('admin can manage chapters', async ({ page }) => {
      await page.goto('/admin/events')
      
      const eventRow = page.locator('tr').nth(1)
      await eventRow.click()
      
      await page.click('a:has-text("Replay")')
      
      // Check chapters section
      await expect(page.getByRole('heading', { name: /chapters/i })).toBeVisible()
      
      // Add a new chapter
      await page.fill('input[placeholder*="Chapter title"]', 'New Chapter')
      await page.fill('input[placeholder*="MM:SS"]', '5:30')
      await page.click('button:has-text("+")')
      
      // Verify chapter appears
      await expect(page.getByText('New Chapter')).toBeVisible()
    })

    test('admin can upload transcript', async ({ page }) => {
      await page.goto('/admin/events')
      
      const eventRow = page.locator('tr').nth(1)
      await eventRow.click()
      
      await page.click('a:has-text("Replay")')
      
      // Check transcript section
      await expect(page.getByRole('heading', { name: /transcript/i })).toBeVisible()
      
      // Switch to paste mode
      await page.click('button:has-text("Paste Text")')
      
      // Paste transcript content
      const transcriptContent = `0:15 Welcome to today's session
2:30 Let's discuss Bitcoin trends
5:45 Here are the key points`
      
      await page.fill('textarea[placeholder*="Paste transcript"]', transcriptContent)
      await page.click('button:has-text("Upload")')
      
      // Verify transcript appears
      await expect(page.getByText('Welcome to today\'s session')).toBeVisible()
    })

    test('admin can edit chapters', async ({ page }) => {
      await page.goto('/admin/events')
      
      const eventRow = page.locator('tr').nth(1)
      await eventRow.click()
      
      await page.click('a:has-text("Replay")')
      
      // Find edit button for first chapter
      const editButton = page.locator('button:has-text("Edit")').first()
      await editButton.click()
      
      // Modify chapter title
      await page.fill('input[value*="Introduction"]', 'Updated Introduction')
      await page.click('button:has-text("Save")')
      
      // Verify chapter is updated
      await expect(page.getByText('Updated Introduction')).toBeVisible()
    })
  })

  test.describe('Notifications', () => {
    test('member receives notification when question is answered', async ({ page, context }) => {
      // Login as member
      await page.goto('http://localhost:3000/api/auth/signin')
      await page.fill('input[name="email"]', 'member@demo.com')
      await page.fill('input[name="password"]', 'password')
      await page.click('button[type="submit"]')
      await page.waitForURL('http://localhost:3000/dashboard')
      
      // Ask a question
      await page.goto('/events')
      await page.click('button[data-testid="past-tab"]')
      
      const eventCard = page.locator('[data-testid="event-card"]').first()
      await eventCard.click()
      
      await page.waitForLoadState('networkidle')
      
      const questionText = 'Will Bitcoin reach $100k this year?'
      await page.fill('textarea[placeholder*="Ask a question"]', questionText)
      await page.click('button:has-text("Ask Question")')
      
      // Login as admin in new tab
      const adminPage = await context.newPage()
      await adminPage.goto('http://localhost:3000/api/auth/signin')
      await adminPage.fill('input[name="email"]', 'admin@demo.com')
      await adminPage.fill('input[name="password"]', 'password')
      await adminPage.click('button[type="submit"]')
      await adminPage.waitForURL('http://localhost:3000/dashboard')
      
      // Answer the question
      await adminPage.goto('/admin/events')
      const eventRow = adminPage.locator('tr').nth(1)
      await eventRow.click()
      await adminPage.click('a:has-text("Questions")')
      
      const answerButton = adminPage.locator('button:has-text("Answer")').first()
      await answerButton.click()
      
      await adminPage.fill('textarea[placeholder*="Write your answer"]', 'Yes, based on current trends.')
      await adminPage.click('button:has-text("Save Answer")')
      
      // Check for notification in member's page
      await page.goto('/notifications')
      await expect(page.getByText('Your question was answered')).toBeVisible()
    })
  })
})
