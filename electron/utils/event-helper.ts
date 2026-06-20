import { BrowserWindow } from 'electron'
import { MimoEvent } from '../types/ipc'
import { debug } from '../debug'

export function sendEventToRenderer(window: BrowserWindow, event: MimoEvent): void {
  if (!window.isDestroyed()) {
    debug.log(`[sendEventToRenderer] sending type=${event.type} to webContents`)
    window.webContents.send('mimo:event', event)
  } else {
    debug.log(`[sendEventToRenderer] window is destroyed, cannot send type=${event.type}`)
  }
}

export function createSessionUpdateEvent(action: string, data?: Record<string, any>): MimoEvent {
  return {
    type: 'session_update',
    data: { action, ...data },
    timestamp: Date.now(),
  }
}
