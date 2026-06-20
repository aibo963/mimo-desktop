import { test as base, _electron as electron, ElectronApplication, Page } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import os from 'os'

export { expect } from '@playwright/test'

function getTestDataDir(): string {
  const dir = path.join(
    os.tmpdir(),
    `mimo-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`
  )
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

type TestFixtures = {
  electronApp: ElectronApplication
  page: Page
  userDataDir: string
}

export const test = base.extend<TestFixtures>({
  // eslint-disable-next-line no-empty-pattern
  userDataDir: async ({}, use) => {
    const dir = getTestDataDir()
    await use(dir)
    // Cleanup
    try {
      fs.rmSync(dir, { recursive: true, force: true })
    } catch (_e) {
      // ignore cleanup errors
    }
  },

  electronApp: async ({ userDataDir }, use) => {
    const app = await electron.launch({
      args: [
        path.join(__dirname, '..', '..', '..'),
        '--no-sandbox',
        `--user-data-dir=${userDataDir}`,
      ],
      env: {
        ...process.env,
        NODE_ENV: 'test',
      },
    })
    await use(app)
    await app.close()
  },

  page: async ({ electronApp }, use) => {
    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')
    await use(page)
  },
})
