import { useState, useCallback } from 'react'
import { useToastStore } from '@/stores/toastStore'

export function useClipboard(timeout: number = 2000) {
  const [copied, setCopied] = useState(false)
  const addToast = useToastStore((state) => state.addToast)

  const copy = useCallback(
    async (text: string, successMessage?: string) => {
      try {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        if (successMessage) {
          addToast(successMessage, 'success')
        }
        setTimeout(() => setCopied(false), timeout)
        return true
      } catch (err) {
        addToast('复制失败', 'error')
        return false
      }
    },
    [addToast, timeout]
  )

  return { copied, copy }
}
