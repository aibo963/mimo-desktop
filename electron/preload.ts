import { contextBridge, ipcRenderer } from 'electron'
import { MimoAPI, MimoCommand, MimoEvent } from './types/ipc'

let eventHandler: ((event: any, ...args: any[]) => void) | null = null

const mimoAPI: MimoAPI = {
  invoke: (command: MimoCommand) => ipcRenderer.invoke('mimo:command', command),
  onEvent: (callback: (event: MimoEvent) => void) => {
    if (eventHandler) {
      ipcRenderer.removeListener('mimo:event', eventHandler)
    }
    const handler = (_event: any, event: MimoEvent) => callback(event)
    eventHandler = handler
    ipcRenderer.on('mimo:event', handler)
  },
  offEvent: () => {
    if (eventHandler) {
      ipcRenderer.removeListener('mimo:event', eventHandler)
      eventHandler = null
    }
  },
}

const ALLOWED_CHANNELS = [
  'window:minimize',
  'window:maximize',
  'window:close',
  'dialog:openDirectory',
  'global-shortcuts:get',
  'global-shortcuts:update',
  'global-shortcuts:toggle',
  'global-shortcuts:reset',
  'tray:getSettings',
  'tray:setSettings',
] as const

const electronAPI = {
  invoke: (channel: string, ...args: any[]) => {
    if (!(ALLOWED_CHANNELS as readonly string[]).includes(channel)) {
      console.error(`Blocked IPC call to unauthorized channel: ${channel}`)
      return Promise.reject(new Error(`Unauthorized channel: ${channel}`))
    }
    return ipcRenderer.invoke(channel, ...args)
  },
}

contextBridge.exposeInMainWorld('mimoAPI', mimoAPI)
contextBridge.exposeInMainWorld('electronAPI', electronAPI)
