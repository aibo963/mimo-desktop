import { useCallback } from 'react'
import { useToastStore } from '@/stores/toastStore'

export function useSafeInvoke() {
  const addToast = useToastStore((state) => state.addToast)

  const invoke = useCallback(
    async <T>(
      action: string,
      params?: Record<string, any>,
      options?: { silent?: boolean; successMsg?: string; errorMsg?: string }
    ): Promise<T | null> => {
      try {
        const result = await window.mimoAPI.invoke({ action, ...params })
        if (options?.successMsg) addToast(options.successMsg, 'success')
        return result as T
      } catch (err: any) {
        if (!options?.silent) {
          addToast(options?.errorMsg || `操作失败: ${err.message}`, 'error')
        }
        return null
      }
    },
    [addToast]
  )

  return { invoke }
}
