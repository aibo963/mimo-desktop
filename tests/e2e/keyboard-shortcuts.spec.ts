import { test, expect } from './fixtures/electron-fixture'

test.describe('Keyboard Shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await page.waitForSelector('[class*="bg-zinc-950"]', { timeout: 10000 })
  })

  test('should open search with Ctrl+K', async ({ page }) => {
    await page.keyboard.press('Control+k')
    await page.waitForTimeout(500)

    const searchInput = page.locator('input[placeholder*="搜索"]')
    await expect(searchInput).toBeVisible()
  })

  test('should open settings with Ctrl+,', async ({ page }) => {
    await page.keyboard.press('Control+,')
    await page.waitForTimeout(500)

    await expect(page.locator('text=通用设置')).toBeVisible()
  })

  test('should toggle theme with Ctrl+Shift+T', async ({ page }) => {
    const html = page.locator('html')
    const initialClass = await html.getAttribute('class')

    await page.keyboard.press('Control+Shift+t')
    await page.waitForTimeout(500)

    const newClass = await html.getAttribute('class')
    expect(newClass).not.toBe(initialClass)
  })
})
