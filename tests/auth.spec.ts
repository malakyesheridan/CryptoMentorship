import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('guest redirects to login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/login')
  })

  test('demo member login and access', async ({ page }) => {
    await page.goto('/login')
    
    // Click demo member button
    await page.click('text=Sign in as Demo Member')
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard')
    
    // Should see user menu with member role
    await expect(page.locator('text=Demo Member')).toBeVisible()
    
    // Should be able to access unlocked content
    await page.goto('/research')
    await expect(page.locator('text=Research')).toBeVisible()
    
    // Should see locked content with preview badges
    await expect(page.locator('text=PREVIEW')).toBeVisible()
  })

  test('demo admin login and full access', async ({ page }) => {
    await page.goto('/login')
    
    // Click demo admin button
    await page.click('text=Sign in as Demo Admin')
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard')
    
    // Should see user menu with admin role
    await expect(page.locator('text=Demo Admin')).toBeVisible()
    
    // Should be able to access all content
    await page.goto('/research')
    await expect(page.locator('text=Research')).toBeVisible()
    
    // Should see locked content with preview badges
    await expect(page.locator('text=PREVIEW')).toBeVisible()
  })

  test('community chat requires authentication', async ({ page }) => {
    await page.goto('/community')
    await expect(page).toHaveURL('/login')
  })

  test('authenticated user can post in community', async ({ page }) => {
    // Login as demo member
    await page.goto('/login')
    await page.click('text=Sign in as Demo Member')
    await expect(page).toHaveURL('/dashboard')
    
    // Navigate to community
    await page.goto('/community')
    await expect(page.locator('text=Community')).toBeVisible()
    
    // Should be able to send a message
    const messageInput = page.locator('input[placeholder="Type a message..."]')
    await messageInput.fill('Test message from Playwright')
    await page.click('button[type="submit"]')
    
    // Message should appear in the chat
    await expect(page.locator('text=Test message from Playwright')).toBeVisible()
  })

  test('content gating works correctly', async ({ page }) => {
    // Login as demo member
    await page.goto('/login')
    await page.click('text=Sign in as Demo Member')
    await expect(page).toHaveURL('/dashboard')
    
    // Navigate to signals page
    await page.goto('/signals')
    await expect(page.locator('text=MEMBERS ONLY')).toBeVisible()
    
    // Should see upgrade CTA
    await expect(page.locator('text=Upgrade to access')).toBeVisible()
  })

  test('sign out works', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.click('text=Sign in as Demo Member')
    await expect(page).toHaveURL('/dashboard')
    
    // Click user menu
    await page.click('[data-testid="user-menu"]')
    
    // Click sign out
    await page.click('text=Sign Out')
    
    // Should redirect to login
    await expect(page).toHaveURL('/login')
  })
})
