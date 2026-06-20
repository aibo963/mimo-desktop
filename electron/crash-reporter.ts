import { crashReporter, app } from 'electron'
import { debug } from './debug'
import fs from 'fs'
import path from 'path'

export function initCrashReporter() {
  const crashesDir = path.join(app.getPath('userData'), 'crashes')

  if (!fs.existsSync(crashesDir)) {
    fs.mkdirSync(crashesDir, { recursive: true })
  }

  crashReporter.start({
    submitURL: '',
    productName: 'MimoDesktop',
    compress: true,
    uploadToServer: false,
    extra: {
      version: app.getVersion(),
      platform: process.platform,
    },
  })

  debug.log('[CrashReporter] Initialized, crashes dir:', crashesDir)
}

export function getCrashLogs(): string[] {
  const crashesDir = path.join(app.getPath('userData'), 'crashes')
  try {
    if (!fs.existsSync(crashesDir)) return []
    return fs
      .readdirSync(crashesDir)
      .filter((f) => f.endsWith('.dmp'))
      .sort()
      .slice(-10)
  } catch {
    return []
  }
}
