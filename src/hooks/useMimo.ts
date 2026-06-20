import { useEffect, useCallback } from 'react'
import { MimoEvent, MimoCommand } from '../../electron/types/ipc'
import { debug } from '@/lib/debug'

let globalListenerRegistered = false
const globalListeners = new Set<(e: MimoEvent) => void>()

export function useMimo() {
  useEffect(() => {
    if (!globalListenerRegistered) {
      window.mimoAPI.onEvent((event: MimoEvent) => {
        debug.log(`[useMimo] event received type=${event.type} listeners=${globalListeners.size}`)
        globalListeners.forEach((cb) => cb(event))
      })
      globalListenerRegistered = true
    }

    return () => {}
  }, [])

  const invoke = useCallback((cmd: MimoCommand) => window.mimoAPI.invoke(cmd), [])

  const subscribe = useCallback((cb: (e: MimoEvent) => void) => {
    globalListeners.add(cb)
    debug.log(`[useMimo] subscribe, total listeners: ${globalListeners.size}`)
    return () => {
      globalListeners.delete(cb)
    }
  }, [])

  return { invoke, subscribe }
}
