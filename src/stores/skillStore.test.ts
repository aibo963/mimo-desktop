import { describe, it, expect, beforeEach } from 'vitest'
import { useSkillStore } from './skillStore'

beforeEach(() => {
  useSkillStore.setState({ skills: [], isLoading: false })
})

describe('useSkillStore', () => {
  const makeSkill = (id: string, name: string) => ({
    id,
    name,
    description: '',
    category: 'code' as const,
    content: 'prompt',
    tags: [],
    useCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })

  it('sets skills', () => {
    useSkillStore.getState().setSkills([makeSkill('1', 'A'), makeSkill('2', 'B')])
    expect(useSkillStore.getState().skills).toHaveLength(2)
  })

  it('adds a skill', () => {
    useSkillStore.getState().addSkill(makeSkill('1', 'A'))
    expect(useSkillStore.getState().skills).toHaveLength(1)
  })

  it('updates a skill', () => {
    useSkillStore.getState().addSkill(makeSkill('1', 'Old'))
    useSkillStore.getState().updateSkill('1', { name: 'New' })
    expect(useSkillStore.getState().skills[0].name).toBe('New')
  })

  it('removes a skill', () => {
    useSkillStore.getState().addSkill(makeSkill('1', 'A'))
    useSkillStore.getState().addSkill(makeSkill('2', 'B'))
    useSkillStore.getState().removeSkill('1')
    expect(useSkillStore.getState().skills).toHaveLength(1)
    expect(useSkillStore.getState().skills[0].id).toBe('2')
  })

  it('increments use count', () => {
    useSkillStore.getState().addSkill(makeSkill('1', 'A'))
    useSkillStore.getState().incrementUse('1')
    useSkillStore.getState().incrementUse('1')
    expect(useSkillStore.getState().skills[0].useCount).toBe(2)
  })

  it('sets loading state', () => {
    useSkillStore.getState().setLoading(true)
    expect(useSkillStore.getState().isLoading).toBe(true)
  })
})
