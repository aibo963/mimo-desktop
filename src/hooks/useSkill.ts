import { useCallback } from 'react'
import { useSkillStore, Skill } from '@/stores/skillStore'
import { useMimo } from './useMimo'
import { useToastStore } from '@/stores/toastStore'
import { debug } from '@/lib/debug'

export type { Skill } from '@/stores/skillStore'

export function useSkill() {
  const {
    skills,
    isLoading,
    setSkills,
    addSkill,
    updateSkill,
    removeSkill,
    incrementUse,
    setLoading,
  } = useSkillStore()
  const { invoke } = useMimo()
  const addToast = useToastStore((state) => state.addToast)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const result = (await invoke({ action: 'skill_get_all' })) as Skill[]
      setSkills(result)
    } catch (err: any) {
      debug.error('[useSkill] Failed to load:', err)
      addToast('加载技能失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [invoke, setSkills, setLoading, addToast])

  const search = useCallback(
    async (query: string): Promise<Skill[]> => {
      try {
        return (await invoke({ action: 'skill_search', query })) as Skill[]
      } catch (err) {
        debug.error('[useSkill] Failed to search:', err)
        return []
      }
    },
    [invoke]
  )

  const getByCategory = useCallback(
    async (category: string): Promise<Skill[]> => {
      try {
        return (await invoke({ action: 'skill_get_by_category', category })) as Skill[]
      } catch (err) {
        debug.error('[useSkill] Failed to get by category:', err)
        return []
      }
    },
    [invoke]
  )

  const add = useCallback(
    async (
      name: string,
      description: string,
      category: string,
      content: string,
      tags: string[]
    ): Promise<Skill | null> => {
      try {
        const result = (await invoke({
          action: 'skill_add',
          name,
          description,
          category,
          content,
          tags,
        })) as Skill
        addSkill(result)
        addToast('技能已添加', 'success')
        return result
      } catch (err: any) {
        debug.error('[useSkill] Failed to add:', err)
        addToast(`添加技能失败: ${err.message}`, 'error')
        return null
      }
    },
    [invoke, addSkill, addToast]
  )

  const update = useCallback(
    async (
      id: string,
      updates: Partial<Pick<Skill, 'name' | 'description' | 'category' | 'content' | 'tags'>>
    ): Promise<Skill | null> => {
      try {
        const result = (await invoke({ action: 'skill_update', id, ...updates })) as Skill
        updateSkill(id, updates)
        addToast('技能已更新', 'success')
        return result
      } catch (err: any) {
        debug.error('[useSkill] Failed to update:', err)
        addToast(`更新技能失败: ${err.message}`, 'error')
        return null
      }
    },
    [invoke, updateSkill, addToast]
  )

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await invoke({ action: 'skill_remove', id })
        removeSkill(id)
        addToast('技能已删除', 'success')
        return true
      } catch (err: any) {
        debug.error('[useSkill] Failed to remove:', err)
        addToast(`删除技能失败: ${err.message}`, 'error')
        return false
      }
    },
    [invoke, removeSkill, addToast]
  )

  const use = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await invoke({ action: 'skill_use', id })
        incrementUse(id)
        return true
      } catch (err) {
        debug.error('[useSkill] Failed to use:', err)
        return false
      }
    },
    [invoke, incrementUse]
  )

  const getMostUsed = useCallback(
    async (limit?: number): Promise<Skill[]> => {
      try {
        return (await invoke({ action: 'skill_get_most_used', limit })) as Skill[]
      } catch (err) {
        debug.error('[useSkill] Failed to get most used:', err)
        return []
      }
    },
    [invoke]
  )

  return {
    skills,
    isLoading,
    loadAll,
    search,
    getByCategory,
    add,
    update,
    remove,
    use,
    getMostUsed,
  }
}
