import { test, expect } from './fixtures/electron-fixture'

test.describe('Search Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.waitForSelector('[class*="bg-zinc-950"]', { timeout: 10000 })
    // Ensure no panel is open by clicking an already-active panel button
    // or just wait a bit
    await page.waitForTimeout(300)
  })

  test('should open search panel', async ({ page }) => {
    const searchBtn = page.locator('button[aria-label="搜索"]')
    await searchBtn.click()
    await page.waitForTimeout(800)

    const searchInput = page.locator('input[placeholder*="搜索所有对话"]')
    await expect(searchInput).toBeVisible({ timeout: 5000 })
  })

  test('should show empty state', async ({ page }) => {
    await page.locator('button[aria-label="搜索"]').click()
    await page.waitForTimeout(800)

    const emptyState = page.locator('text=输入关键词搜索所有对话')
    await expect(emptyState).toBeVisible({ timeout: 5000 })
  })

  test('should close on close button', async ({ page }) => {
    await page.locator('button[aria-label="搜索"]').click()
    await page.waitForTimeout(800)

    const closeBtn = page.locator('button[aria-label="关闭搜索"]')
    await expect(closeBtn).toBeVisible({ timeout: 5000 })
    await closeBtn.click()
    await page.waitForTimeout(300)
  })
})
