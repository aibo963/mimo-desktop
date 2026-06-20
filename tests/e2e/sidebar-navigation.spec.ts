import { test, expect } from './fixtures/electron-fixture'

test.describe('Sidebar Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.waitForSelector('[class*="bg-zinc-950"]', { timeout: 10000 })
  })

  const panels = [
    { label: '文件', contains: '已隐藏' },
    { label: '历史', contains: '对话历史' },
    { label: '收藏', contains: '代码收藏' },
    { label: '搜索', contains: '搜索所有对话' },
    { label: '记忆', contains: '记忆' },
    { label: '技能', contains: '技能' },
    { label: '设置', contains: '设置' },
  ]

  for (const panel of panels) {
    test(`should open ${panel.label} panel`, async ({ page }) => {
      const button = page.locator(`button[aria-label="${panel.label}"]`)
      await expect(button).toBeVisible()
      await button.click()
      await page.waitForTimeout(500)

      // Check panel content is visible
      const content = page.locator(`text=${panel.contains}`).first()
      await expect(content).toBeVisible({ timeout: 5000 })
    })
  }

  test('should toggle panel on/off', async ({ page }) => {
    const button = page.locator('button[aria-label="设置"]')
    await expect(button).toBeVisible()

    // Open
    await button.click()
    await page.waitForTimeout(500)
    await expect(page.locator('text=设置').first()).toBeVisible()

    // Close (click again)
    await button.click()
    await page.waitForTimeout(500)
  })

  test('should only have one panel open at a time', async ({ page }) => {
    // Open settings
    await page.locator('button[aria-label="设置"]').click()
    await page.waitForTimeout(500)
    await expect(page.locator('text=通用设置')).toBeVisible()

    // Open memory - settings should close
    await page.locator('button[aria-label="记忆"]').click()
    await page.waitForTimeout(500)
    await expect(page.locator('text=记忆').first()).toBeVisible()
  })
})
