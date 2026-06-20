import { useCallback } from 'react'
import { useMemoryStore, MemoryEntry } from '@/stores/memoryStore'
import { useMimo } from './useMimo'
import { useToastStore } from '@/stores/toastStore'
import { debug } from '@/lib/debug'

export function useMemory() {
  const { entries, isLoading, setEntries, addEntry, updateEntry, removeEntry, setLoading } =
    useMemoryStore()
  const { invoke } = useMimo()
  const addToast = useToastStore((state) => state.addToast)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const result = (await invoke({ action: 'memory_get_all' })) as MemoryEntry[]
      setEntries(result)
    } catch (err: any) {
      debug.error('[useMemory] Failed to load:', err)
      addToast('加载记忆失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [invoke, setEntries, setLoading, addToast])

  const search = useCallback(
    async (query: string): Promise<MemoryEntry[]> => {
      try {
        return (await invoke({ action: 'memory_search', query })) as MemoryEntry[]
      } catch (err) {
        debug.error('[useMemory] Failed to search:', err)
        return []
      }
    },
    [invoke]
  )

  const add = useCallback(
    async (
      content: string,
      category: string,
      tags: string[],
      source?: string
    ): Promise<MemoryEntry | null> => {
      try {
        const result = (await invoke({
          action: 'memory_add',
          content,
          category,
          tags,
          source,
        })) as MemoryEntry
        addEntry(result)
        addToast('记忆已添加', 'success')
        return result
      } catch (err: any) {
        debug.error('[useMemory] Failed to add:', err)
        addToast(`添加记忆失败: ${err.message}`, 'error')
        return null
      }
    },
    [invoke, addEntry, addToast]
  )

  const update = useCallback(
    async (
      id: string,
      updates: Partial<Pick<MemoryEntry, 'content' | 'category' | 'tags'>>
    ): Promise<MemoryEntry | null> => {
      try {
        const result = (await invoke({ action: 'memory_update', id, ...updates })) as MemoryEntry
        updateEntry(id, updates)
        addToast('记忆已更新', 'success')
        return result
      } catch (err: any) {
        debug.error('[useMemory] Failed to update:', err)
        addToast(`更新记忆失败: ${err.message}`, 'error')
        return null
      }
    },
    [invoke, updateEntry, addToast]
  )

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await invoke({ action: 'memory_remove', id })
        removeEntry(id)
        addToast('记忆已删除', 'success')
        return true
      } catch (err: any) {
        debug.error('[useMemory] Failed to remove:', err)
        addToast(`删除记忆失败: ${err.message}`, 'error')
        return false
      }
    },
    [invoke, removeEntry, addToast]
  )

  const clear = useCallback(async (): Promise<boolean> => {
    try {
      await invoke({ action: 'memory_clear' })
      setEntries([])
      addToast('记忆已清空', 'success')
      return true
    } catch (err: any) {
      debug.error('[useMemory] Failed to clear:', err)
      addToast(`清空记忆失败: ${err.message}`, 'error')
      return false
    }
  }, [invoke, setEntries, addToast])

  const extractFromConversation = useCallback(
    async (messages: Array<{ role: string; content: string }>): Promise<MemoryEntry[]> => {
      try {
        return (await invoke({ action: 'memory_extract', messages })) as MemoryEntry[]
      } catch (err) {
        debug.error('[useMemory] Failed to extract:', err)
        return []
      }
    },
    [invoke]
  )

  return {
    entries,
    isLoading,
    loadAll,
    search,
    add,
    update,
    remove,
    clear,
    extractFromConversation,
  }
}
