import fs from 'fs'
import path from 'path'
import { app } from 'electron'

export interface Skill {
  id: string
  name: string
  description: string
  category: 'code' | 'writing' | 'analysis' | 'general'
  content: string
  tags: string[]
  useCount: number
  createdAt: number
  updatedAt: number
}

interface SkillData {
  skills: Skill[]
}

const DEFAULT_SKILLS: Omit<Skill, 'id' | 'createdAt' | 'updatedAt' | 'useCount'>[] = [
  {
    name: '代码审查',
    description: '审查代码质量、安全性和最佳实践',
    category: 'code',
    content:
      '请审查以下代码，关注：1) 代码质量和可读性 2) 潜在bug 3) 性能问题 4) 安全漏洞 5) 最佳实践建议',
    tags: ['代码', '审查', 'review'],
  },
  {
    name: '代码重构',
    description: '重构代码以提高可维护性',
    category: 'code',
    content: '请重构以下代码，目标：1) 提取重复逻辑 2) 改善命名 3) 简化复杂度 4) 保持功能不变',
    tags: ['代码', '重构', 'refactor'],
  },
  {
    name: '文档生成',
    description: '为代码生成文档和注释',
    category: 'writing',
    content: '请为以下代码生成：1) 函数/模块的JSDoc注释 2) 使用示例 3) 参数说明 4) 返回值说明',
    tags: ['文档', '注释', 'documentation'],
  },
  {
    name: 'Bug分析',
    description: '分析bug原因并提供修复方案',
    category: 'analysis',
    content: '请分析这个bug：1) 复现步骤 2) 预期行为 vs 实际行为 3) 可能的原因 4) 修复方案',
    tags: ['bug', '调试', 'debug'],
  },
  {
    name: '性能优化',
    description: '分析和优化代码性能',
    category: 'analysis',
    content: '请分析以下代码的性能：1) 时间复杂度 2) 空间复杂度 3) 瓶颈点 4) 优化建议',
    tags: ['性能', '优化', 'performance'],
  },
  {
    name: '单元测试',
    description: '为代码编写单元测试',
    category: 'code',
    content:
      '请为以下代码编写单元测试：1) 覆盖正常路径 2) 覆盖边界情况 3) 覆盖错误处理 4) 使用合适的测试框架',
    tags: ['测试', '单元测试', 'test'],
  },
  {
    name: '翻译',
    description: '翻译文本到指定语言',
    category: 'writing',
    content:
      '请将以下文本翻译成{targetLanguage}，要求：1) 保持原意 2) 符合目标语言习惯 3) 保持专业术语准确',
    tags: ['翻译', 'translate'],
  },
  {
    name: '摘要提取',
    description: '从长文本中提取关键信息',
    category: 'analysis',
    content: '请从以下文本中提取：1) 核心观点（3-5个）2) 关键数据 3) 行动建议 4) 一句话总结',
    tags: ['摘要', '总结', 'summary'],
  },
]

export class SkillManager {
  private filePath: string
  private data: SkillData

  constructor() {
    const userDataPath = app.getPath('userData')
    this.filePath = path.join(userDataPath, 'skills.json')
    this.data = this.load()
    this.ensureDefaults()
  }

  private load(): SkillData {
    try {
      if (fs.existsSync(this.filePath)) {
        const content = fs.readFileSync(this.filePath, 'utf-8')
        return JSON.parse(content)
      }
    } catch (err) {
      console.error('[SkillManager] Failed to load skills:', err)
    }
    return { skills: [] }
  }

  private save(): void {
    try {
      const dir = path.dirname(this.filePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8')
    } catch (err) {
      console.error('[SkillManager] Failed to save skills:', err)
    }
  }

  private ensureDefaults(): void {
    let changed = false
    for (const def of DEFAULT_SKILLS) {
      const exists = this.data.skills.some((s) => s.name === def.name)
      if (!exists) {
        this.data.skills.push({
          ...def,
          id: crypto.randomUUID(),
          useCount: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
        changed = true
      }
    }
    if (changed) this.save()
  }

  getAll(): Skill[] {
    return this.data.skills
  }

  getById(id: string): Skill | undefined {
    return this.data.skills.find((s) => s.id === id)
  }

  search(query: string): Skill[] {
    const q = query.toLowerCase()
    return this.data.skills.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q))
    )
  }

  getByCategory(category: Skill['category']): Skill[] {
    return this.data.skills.filter((s) => s.category === category)
  }

  add(skill: Omit<Skill, 'id' | 'createdAt' | 'updatedAt' | 'useCount'>): Skill {
    const newSkill: Skill = {
      ...skill,
      id: crypto.randomUUID(),
      useCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    this.data.skills.push(newSkill)
    this.save()
    return newSkill
  }

  update(
    id: string,
    updates: Partial<Pick<Skill, 'name' | 'description' | 'category' | 'content' | 'tags'>>
  ): Skill | undefined {
    const skill = this.data.skills.find((s) => s.id === id)
    if (!skill) return undefined
    if (updates.name !== undefined) skill.name = updates.name
    if (updates.description !== undefined) skill.description = updates.description
    if (updates.category !== undefined) skill.category = updates.category
    if (updates.content !== undefined) skill.content = updates.content
    if (updates.tags !== undefined) skill.tags = updates.tags
    skill.updatedAt = Date.now()
    this.save()
    return skill
  }

  incrementUse(id: string): void {
    const skill = this.data.skills.find((s) => s.id === id)
    if (skill) {
      skill.useCount++
      skill.updatedAt = Date.now()
      this.save()
    }
  }

  remove(id: string): boolean {
    const idx = this.data.skills.findIndex((s) => s.id === id)
    if (idx === -1) return false
    this.data.skills.splice(idx, 1)
    this.save()
    return true
  }

  getMostUsed(limit: number = 10): Skill[] {
    return [...this.data.skills].sort((a, b) => b.useCount - a.useCount).slice(0, limit)
  }
}
