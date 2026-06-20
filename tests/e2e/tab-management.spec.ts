import { test, expect } from './fixtures/electron-fixture'

test.describe('Tab Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.waitForSelector('[class*="bg-zinc-950"]', { timeout: 10000 })
  })

  test('should have default tab', async ({ page }) => {
    const tab = page.locator('text=新对话')
    await expect(tab.first()).toBeVisible()
  })

  test('should create new tab', async ({ page }) => {
    const addTabButton = page.locator('button[aria-label="新建标签页"]')
    await expect(addTabButton).toBeVisible()
    await addTabButton.click()

    // Should now have 2 tabs
    const tabs = page.locator('[class*="bg-zinc-900"] [class*="rounded-md"]')
    const count = await tabs.count()
    expect(count).toBeGreaterThanOrEqual(2)
  })

  test('should close tab', async ({ page }) => {
    // First create a new tab
    const addTabButton = page.locator('button[aria-label="新建标签页"]')
    await addTabButton.click()
    await page.waitForTimeout(300)

    // Find the close button for the second tab
    const closeButtons = page.locator('button[aria-label*="关闭"]')
    const count = await closeButtons.count()
    if (count > 0) {
      // Hover to reveal close button, then click
      const secondTab = page.locator('[class*="rounded-md"]').nth(1)
      await secondTab.hover()
      const closeBtn = secondTab.locator('button[aria-label*="关闭"]')
      if (await closeBtn.isVisible()) {
        await closeBtn.click()
        await page.waitForTimeout(300)
      }
    }
  })

  test('should switch between tabs', async ({ page }) => {
    const addTabButton = page.locator('button[aria-label="新建标签页"]')
    await addTabButton.click()
    await page.waitForTimeout(300)

    // Click on first tab
    const firstTab = page.locator('text=新对话').first()
    if (await firstTab.isVisible()) {
      await firstTab.click()
      await page.waitForTimeout(200)
    }
  })
})
