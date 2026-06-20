import { test, expect } from './fixtures/electron-fixture'

test.describe('Settings Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.waitForSelector('[class*="bg-zinc-950"]', { timeout: 10000 })
    // Open settings
    await page.locator('button[aria-label="设置"]').click()
    await page.waitForTimeout(500)
  })

  test('should open settings panel', async ({ page }) => {
    await expect(page.locator('text=设置').first()).toBeVisible()
  })

  test('should show all settings tabs', async ({ page }) => {
    const tabs = ['通用', '模型', '供应商', 'Agent', '配置']
    for (const tab of tabs) {
      const button = page.locator(`button:has-text("${tab}")`).first()
      await expect(button).toBeVisible()
    }
  })

  test('should switch between settings tabs', async ({ page }) => {
    // Click on model tab
    await page.locator('button:has-text("模型")').first().click()
    await page.waitForTimeout(500)

    // Click on provider tab
    await page.locator('button:has-text("供应商")').first().click()
    await page.waitForTimeout(500)
    await expect(page.getByText('模型供应商', { exact: true })).toBeVisible()

    // Click back to general
    await page.locator('button:has-text("通用")').first().click()
    await page.waitForTimeout(500)
    await expect(page.getByText('通用设置', { exact: true })).toBeVisible()
  })

  test('should show close button', async ({ page }) => {
    const closeBtn = page.locator('button[aria-label="关闭设置"]')
    await expect(closeBtn).toBeVisible()
    await closeBtn.click()
    await page.waitForTimeout(300)
  })
})
