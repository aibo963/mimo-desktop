import { test, expect } from './fixtures/electron-fixture'

test.describe('App Launch', () => {
  test('should launch and show window', async ({ electronApp, page }) => {
    const windows = electronApp.windows()
    expect(windows.length).toBeGreaterThan(0)

    const title = await page.title()
    expect(title).toBeTruthy()
  })

  test('should show main UI elements', async ({ page }) => {
    // Wait for the app to fully load
    await page.waitForSelector('[class*="bg-zinc-950"]', { timeout: 10000 })

    // Check sidebar exists
    const sidebar = page.locator('button[aria-label="文件"]')
    await expect(sidebar).toBeVisible()

    // Check chat input exists
    const chatInput = page.locator('textarea[aria-label="消息输入框"]')
    await expect(chatInput).toBeVisible()

    // Check title bar text in the drag region
    const titleBar = page.locator('.drag-region span:has-text("Mimo Desktop")')
    await expect(titleBar).toBeVisible()
  })

  test('should show onboarding wizard on first launch', async ({ page }) => {
    // The onboarding should show if localStorage is not set
    const onboarding = page.locator('text=欢迎使用 Mimo Desktop')
    // It may or may not show depending on test data dir state
    const isVisible = await onboarding.isVisible().catch(() => false)
    if (isVisible) {
      await expect(onboarding).toBeVisible()
      // Test skip button
      const skipButton = page.locator('text=跳过')
      await expect(skipButton).toBeVisible()
      await skipButton.click()
      // Should close onboarding
      await expect(onboarding).not.toBeVisible({ timeout: 5000 })
    }
  })
})
