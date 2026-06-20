import { MimoAPI } from '../electron/types/ipc'

declare global {
  interface Window {
    mimoAPI: MimoAPI
    electronAPI: {
      invoke: (channel: string, ...args: any[]) => Promise<any>
    }
  }
}
