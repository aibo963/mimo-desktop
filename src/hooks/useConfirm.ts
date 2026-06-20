import { useCallback } from 'react'
import { useConfirmStore } from '@/stores/confirmStore'

export function useConfirm() {
  const showConfirm = useConfirmStore((s) => s.showConfirm)

  // Synchronous confirm - shows dialog and returns false immediately if already open
  const confirm = useCallback(
    (
      options:
        | string
        | {
            message: string
            title?: string
            confirmText?: string
            cancelText?: string
            danger?: boolean
          }
    ): boolean => {
      const opts = typeof options === 'string' ? { message: options } : options
      const store = useConfirmStore.getState()
      if (store.open) return false
      // For sync usage, use window.confirm
      return window.confirm(opts.message)
    },
    []
  )

  // Async confirm - shows dialog and waits for user response
  const confirmAsync = useCallback(
    async (
      options:
        | string
        | {
            message: string
            title?: string
            confirmText?: string
            cancelText?: string
            danger?: boolean
          }
    ): Promise<boolean> => {
      const opts = typeof options === 'string' ? { message: options } : options
      return showConfirm(opts)
    },
    [showConfirm]
  )

  return { confirm, confirmAsync }
}
