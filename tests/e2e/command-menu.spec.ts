import { test, expect } from './fixtures/electron-fixture'

test.describe('Command Menu', () => {
  test.beforeEach(async ({ page }) => {
    await page.waitForSelector('[class*="bg-zinc-950"]', { timeout: 10000 })
  })

  test('should show command menu when typing /', async ({ page }) => {
    const input = page.locator('textarea[aria-label="消息输入框"]')
    await input.fill('/')
    await page.waitForTimeout(300)

    const menu = page.locator('[role="menu"]')
    await expect(menu).toBeVisible()
  })

  test('should list all commands', async ({ page }) => {
    const input = page.locator('textarea[aria-label="消息输入框"]')
    await input.fill('/')
    await page.waitForTimeout(300)

    const commands = ['/clear', '/export', '/model', '/agent', '/help']
    for (const cmd of commands) {
      const item = page.locator(`text=${cmd}`).first()
      await expect(item).toBeVisible()
    }
  })

  test('should filter commands by input', async ({ page }) => {
    const input = page.locator('textarea[aria-label="消息输入框"]')
    await input.fill('/he')
    await page.waitForTimeout(300)

    const helpItem = page.locator('text=/help')
    await expect(helpItem).toBeVisible()
  })

  test('should close menu on Escape', async ({ page }) => {
    const input = page.locator('textarea[aria-label="消息输入框"]')
    await input.fill('/')
    await page.waitForTimeout(300)

    // Click outside the menu to close it
    await page.locator('textarea[aria-label="消息输入框"]').click()
    await page.waitForTimeout(500)

    // Clear the input to remove /
    await input.fill('')
    await page.waitForTimeout(500)

    const menu = page.locator('[role="menu"]')
    await expect(menu).not.toBeVisible({ timeout: 3000 })
  })
})
