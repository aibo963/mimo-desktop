import { test, expect } from './fixtures/electron-fixture'

test.describe('Chat Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.waitForSelector('[class*="bg-zinc-950"]', { timeout: 10000 })
  })

  test('should have empty chat initially', async ({ page }) => {
    const emptyState = page.locator('text=输入消息开始对话')
    await expect(emptyState).toBeVisible({ timeout: 5000 })
  })

  test('should show chat input', async ({ page }) => {
    const input = page.locator('textarea[aria-label="消息输入框"]')
    await expect(input).toBeVisible()
    await expect(input).toBeEditable()
  })

  test('should type in chat input', async ({ page }) => {
    const input = page.locator('textarea[aria-label="消息输入框"]')
    await input.fill('Hello Mimo')
    const value = await input.inputValue()
    expect(value).toBe('Hello Mimo')
  })

  test('should show send button', async ({ page }) => {
    const sendButton = page.locator('button[aria-label="发送消息"]')
    await expect(sendButton).toBeVisible()
  })

  test('should disable send when empty', async ({ page }) => {
    const sendButton = page.locator('button[aria-label="发送消息"]')
    await expect(sendButton).toBeDisabled()
  })

  test('should enable send when has text', async ({ page }) => {
    const input = page.locator('textarea[aria-label="消息输入框"]')
    await input.fill('Hello')

    const sendButton = page.locator('button[aria-label="发送消息"]')
    await expect(sendButton).toBeEnabled()
  })

  test('should show command menu with /', async ({ page }) => {
    const input = page.locator('textarea[aria-label="消息输入框"]')
    await input.fill('/')
    await page.waitForTimeout(300)

    const commandMenu = page.locator('[role="menu"]')
    await expect(commandMenu).toBeVisible()
  })

  test('should show model selector', async ({ page }) => {
    const modelSelector = page.locator('button[aria-label="选择 AI 模型"]')
    await expect(modelSelector).toBeVisible()
  })

  test('should show agent toggle', async ({ page }) => {
    const agentToggle = page.locator('button[aria-label*="Agent"]')
    await expect(agentToggle).toBeVisible()
  })

  test('should show clear button', async ({ page }) => {
    const clearButton = page.locator('button[aria-label="清空当前对话"]')
    await expect(clearButton).toBeVisible()
  })

  test('should show export button', async ({ page }) => {
    const exportButton = page.locator('button[aria-label="导出对话"]')
    await expect(exportButton).toBeVisible()
  })
})
