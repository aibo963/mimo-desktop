import { test, expect } from './fixtures/electron-fixture'

test.describe('Theme Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.waitForSelector('[class*="bg-zinc-950"]', { timeout: 10000 })
  })

  test('should toggle theme', async ({ page }) => {
    // Find theme toggle button
    const themeButton = page.locator('button[title*="切换"]').first()
    await expect(themeButton).toBeVisible()

    // Check initial state
    const html = page.locator('html')
    const initialClass = await html.getAttribute('class')

    // Click toggle
    await themeButton.click()
    await page.waitForTimeout(300)

    // Check class changed
    const newClass = await html.getAttribute('class')
    expect(newClass).not.toBe(initialClass)
  })

  test('should persist theme across reload', async ({ page }) => {
    const themeButton = page.locator('button[title*="切换"]').first()
    await themeButton.click()
    await page.waitForTimeout(300)

    const html = page.locator('html')
    const classAfterToggle = await html.getAttribute('class')

    // Reload page
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)

    // Theme should persist
    const classAfterReload = await html.getAttribute('class')
    expect(classAfterReload).toBe(classAfterToggle)
  })
})
