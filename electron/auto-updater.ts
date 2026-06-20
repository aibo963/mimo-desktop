import { autoUpdater, UpdateInfo } from 'electron-updater'
import { BrowserWindow } from 'electron'
import { debug } from './debug'
import { sendEventToRenderer } from './utils/event-helper'

export class AutoUpdater {
  private window: BrowserWindow | null = null
  private isChecking = false

  constructor() {
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = true

    autoUpdater.on('checking-for-update', () => {
      this.isChecking = true
      debug.log('[AutoUpdater] Checking for update')
      this.send({
        type: 'session_update',
        data: { action: 'update-checking' },
        timestamp: Date.now(),
      })
    })

    autoUpdater.on('update-available', (info: UpdateInfo) => {
      debug.log('[AutoUpdater] Update available:', info.version)
      this.send({
        type: 'session_update',
        data: { action: 'update-available', version: info.version, releaseDate: info.releaseDate },
        timestamp: Date.now(),
      })
    })

    autoUpdater.on('update-not-available', () => {
      debug.log('[AutoUpdater] No update available')
      this.send({
        type: 'session_update',
        data: { action: 'update-not-available' },
        timestamp: Date.now(),
      })
    })

    autoUpdater.on('download-progress', (progress) => {
      this.send({
        type: 'session_update',
        data: { action: 'update-progress', percent: progress.percent },
        timestamp: Date.now(),
      })
    })

    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      debug.log('[AutoUpdater] Update downloaded:', info.version)
      this.send({
        type: 'session_update',
        data: { action: 'update-downloaded', version: info.version },
        timestamp: Date.now(),
      })
    })

    autoUpdater.on('error', (err) => {
      debug.error('[AutoUpdater] Error:', err.message)
      this.send({
        type: 'error',
        data: { message: `Update error: ${err.message}` },
        timestamp: Date.now(),
      })
    })
  }

  setWindow(window: BrowserWindow) {
    this.window = window
  }

  private send(event: any) {
    if (this.window && !this.window.isDestroyed()) {
      sendEventToRenderer(this.window, event)
    }
  }

  async checkForUpdates() {
    if (this.isChecking) return
    try {
      await autoUpdater.checkForUpdates()
    } catch (err: any) {
      debug.error('[AutoUpdater] Check failed:', err.message)
    } finally {
      this.isChecking = false
    }
  }

  async downloadUpdate() {
    try {
      await autoUpdater.downloadUpdate()
    } catch (err: any) {
      debug.error('[AutoUpdater] Download failed:', err.message)
    }
  }

  quitAndInstall() {
    autoUpdater.quitAndInstall(false, true)
  }
}
