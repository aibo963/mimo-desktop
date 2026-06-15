import { useEffect, useCallback, useRef } from 'react'
import { MimoEvent, MimoCommand } from '../../electron/types/ipc'

export function useMimo() {
  const listeners = useRef<Set<(e: MimoEvent) => void>>(new Set())

  useEffect(() => {
    window.mimoAPI.onEvent((event) => {
      listeners.current.forEach(cb => cb(event))
    })
    return () => window.mimoAPI.offEvent()
  }, [])

  const invoke = useCallback((cmd: MimoCommand) => window.mimoAPI.invoke(cmd), [])

  const subscribe = useCallback((cb: (e: MimoEvent) => void) => {
    listeners.current.add(cb)
    return () => { listeners.current.delete(cb) }
  }, [])

  return { invoke, subscribe }
}
