import fs from 'fs'
import path from 'path'
import { app } from 'electron'

export interface MemoryEntry {
  id: string
  content: string
  category: 'fact' | 'preference' | 'skill' | 'context' | 'knowledge'
  source?: string
  tags: string[]
  createdAt: number
  updatedAt: number
}

interface KnowledgeIndex {
  filePath: string
  content: string
  indexedAt: number
}

interface MemoryData {
  entries: MemoryEntry[]
  knowledgeIndex: KnowledgeIndex[]
  lastCleanup: number
}

export class MemoryManager {
  private filePath: string
  private data: MemoryData

  constructor() {
    const userDataPath = app.getPath('userData')
    this.filePath = path.join(userDataPath, 'memory.json')
    this.data = this.load()
  }

  private load(): MemoryData {
    try {
      if (fs.existsSync(this.filePath)) {
        const content = fs.readFileSync(this.filePath, 'utf-8')
        const parsed = JSON.parse(content)
        return {
          entries: parsed.entries || [],
          knowledgeIndex: parsed.knowledgeIndex || [],
          lastCleanup: parsed.lastCleanup || Date.now(),
        }
      }
    } catch (err) {
      console.error('[MemoryManager] Failed to load memory:', err)
    }
    return { entries: [], knowledgeIndex: [], lastCleanup: Date.now() }
  }

  private save(): void {
    try {
      const dir = path.dirname(this.filePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8')
    } catch (err) {
      console.error('[MemoryManager] Failed to save memory:', err)
    }
  }

  getAll(): MemoryEntry[] {
    return this.data.entries
  }

  getById(id: string): MemoryEntry | undefined {
    return this.data.entries.find((e) => e.id === id)
  }

  search(query: string): MemoryEntry[] {
    const q = query.toLowerCase()
    return this.data.entries.filter(
      (e) => e.content.toLowerCase().includes(q) || e.tags.some((t) => t.toLowerCase().includes(q))
    )
  }

  add(entry: Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt'>): MemoryEntry {
    const newEntry: MemoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    this.data.entries.unshift(newEntry)
    this.save()
    return newEntry
  }

  update(
    id: string,
    updates: Partial<Pick<MemoryEntry, 'content' | 'category' | 'tags'>>
  ): MemoryEntry | undefined {
    const entry = this.data.entries.find((e) => e.id === id)
    if (!entry) return undefined
    if (updates.content !== undefined) entry.content = updates.content
    if (updates.category !== undefined) entry.category = updates.category
    if (updates.tags !== undefined) entry.tags = updates.tags
    entry.updatedAt = Date.now()
    this.save()
    return entry
  }

  remove(id: string): boolean {
    const idx = this.data.entries.findIndex((e) => e.id === id)
    if (idx === -1) return false
    this.data.entries.splice(idx, 1)
    this.save()
    return true
  }

  clear(): void {
    this.data.entries = []
    this.save()
  }

  extractFromConversation(
    messages: Array<{ role: string; content: string }>
  ): Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt'>[] {
    const extracted: Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt'>[] = []

    for (const msg of messages) {
      if (msg.role !== 'user') continue
      const content = msg.content.trim()

      if (content.length < 10 || content.length > 500) continue

      if (content.includes('我叫') || content.includes('我是') || content.includes('我的名字')) {
        extracted.push({
          content,
          category: 'fact',
          tags: ['个人信息'],
        })
      } else if (
        content.includes('我喜欢') ||
        content.includes('我讨厌') ||
        content.includes('偏好') ||
        content.includes('习惯')
      ) {
        extracted.push({
          content,
          category: 'preference',
          tags: ['偏好'],
        })
      } else if (
        content.includes('帮我记住') ||
        content.includes('记一下') ||
        content.includes('请记住')
      ) {
        extracted.push({
          content: content.replace(/^(帮我记住|记一下|请记住)[：:]\s*/, ''),
          category: 'context',
          tags: ['用户要求'],
        })
      }
    }

    return extracted
  }

  autoExtractAndSave(messages: Array<{ role: string; content: string }>): MemoryEntry[] {
    const extracted = this.extractFromConversation(messages)
    const saved: MemoryEntry[] = []
    for (const item of extracted) {
      const exists = this.data.entries.some((e) => e.content === item.content)
      if (!exists) {
        saved.push(this.add(item))
      }
    }
    return saved
  }

  indexFile(filePath: string, content: string): void {
    const existing = this.data.knowledgeIndex.findIndex((k) => k.filePath === filePath)
    const entry: KnowledgeIndex = {
      filePath,
      content,
      indexedAt: Date.now(),
    }
    if (existing >= 0) {
      this.data.knowledgeIndex[existing] = entry
    } else {
      this.data.knowledgeIndex.push(entry)
    }
    this.save()
  }

  removeFileIndex(filePath: string): boolean {
    const idx = this.data.knowledgeIndex.findIndex((k) => k.filePath === filePath)
    if (idx === -1) return false
    this.data.knowledgeIndex.splice(idx, 1)
    this.save()
    return true
  }

  getIndexedFiles(): KnowledgeIndex[] {
    return this.data.knowledgeIndex
  }

  searchKnowledge(query: string, maxResults = 5): Array<KnowledgeIndex & { relevance: number }> {
    const q = query.toLowerCase()
    const results: Array<KnowledgeIndex & { relevance: number }> = []

    for (const item of this.data.knowledgeIndex) {
      const contentLower = item.content.toLowerCase()
      const filePathLower = item.filePath.toLowerCase()

      let relevance = 0
      if (filePathLower.includes(q)) relevance += 10
      if (contentLower.includes(q)) relevance += 5

      const words = q.split(/\s+/)
      for (const word of words) {
        if (word.length < 2) continue
        if (contentLower.includes(word)) relevance += 2
      }

      if (relevance > 0) {
        results.push({ ...item, relevance })
      }
    }

    return results.sort((a, b) => b.relevance - a.relevance).slice(0, maxResults)
  }

  getKnowledgeContext(query: string, maxTokens = 2000): string {
    const results = this.searchKnowledge(query, 3)
    if (results.length === 0) return ''

    const contextParts: string[] = []
    let totalLength = 0

    for (const result of results) {
      const preview = result.content.slice(0, 500)
      const part = `文件: ${result.filePath}\n${preview}${result.content.length > 500 ? '...' : ''}`

      if (totalLength + part.length > maxTokens) break
      contextParts.push(part)
      totalLength += part.length
    }

    return contextParts.join('\n\n---\n\n')
  }
}
