import { contextBridge, ipcRenderer } from 'electron'
import { MimoAPI, MimoCommand, MimoEvent } from './types/ipc'

const mimoAPI: MimoAPI = {
  invoke: (command: MimoCommand) => ipcRenderer.invoke('mimo:command', command),
  onEvent: (callback: (event: MimoEvent) => void) => {
    const handler = (_: any, event: MimoEvent) => callback(event)
    ipcRenderer.on('mimo:event', handler)
  },
  offEvent: () => {
    ipcRenderer.removeAllListeners('mimo:event')
  },
}

const electronAPI = {
  invoke: (channel: string) => ipcRenderer.invoke(channel),
}

contextBridge.exposeInMainWorld('mimoAPI', mimoAPI)
contextBridge.exposeInMainWorld('electronAPI', electronAPI)
