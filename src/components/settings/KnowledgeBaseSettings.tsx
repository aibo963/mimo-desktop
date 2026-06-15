import { useState, useEffect } from 'react'
import { useMimo } from '@/hooks/useMimo'
import {
  Database,
  RefreshCw,
  Plus,
  Trash2,
  FolderOpen,
  FileText,
  Globe,
  Search,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Loader2,
  HardDrive,
  Link,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface KnowledgeSource {
  id: string
  name: string
  type: 'file' | 'folder' | 'url' | 'text'
  path?: string
  url?: string
  content?: string
  enabled: boolean
  indexed: boolean
  lastIndexed?: string
  documentCount?: number
}

interface KnowledgeBase {
  id: string
  name: string
  description: string
  sources: KnowledgeSource[]
  embeddingModel?: string
  chunkSize?: number
  chunkOverlap?: number
}

export function KnowledgeBaseSettings() {
  const [bases, setBases] = useState<KnowledgeBase[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [newSource, setNewSource] = useState({ type: 'folder' as const, path: '', url: '' })
  const [addingSource, setAddingSource] = useState<string | null>(null)
  const { invoke } = useMimo()

  useEffect(() => {
    loadKnowledgeBases()
  }, [])

  const loadKnowledgeBases = async () => {
    setLoading(true)
    try {
      const config = await invoke({ action: 'get_config' })
      if (config?.knowledge) {
        setBases(Array.isArray(config.knowledge) ? config.knowledge : [])
      }
    } catch (error) {
      console.error('Failed to load knowledge bases:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddBase = async () => {
    const newBase: KnowledgeBase = {
      id: crypto.randomUUID(),
      name: '新知识库',
      description: '',
      sources: [],
      chunkSize: 1000,
      chunkOverlap: 200,
    }
    const updated = [...bases, newBase]
    try {
      await invoke({ action: 'set_config', key: 'knowledge', value: updated })
      setBases(updated)
      setExpanded(newBase.id)
    } catch (error) {
      console.error('Failed to add knowledge base:', error)
    }
  }

  const handleDeleteBase = async (id: string) => {
    const updated = bases.filter(b => b.id !== id)
    try {
      await invoke({ action: 'set_config', key: 'knowledge', value: updated })
      setBases(updated)
    } catch (error) {
      console.error('Failed to delete knowledge base:', error)
    }
  }

  const handleUpdateBase = async (id: string, updates: Partial<KnowledgeBase>) => {
    const updated = bases.map(b => b.id === id ? { ...b, ...updates } : b)
    try {
      await invoke({ action: 'set_config', key: 'knowledge', value: updated })
      setBases(updated)
    } catch (error) {
      console.error('Failed to update knowledge base:', error)
    }
  }

  const handleAddSource = async (baseId: string) => {
    const source: KnowledgeSource = {
      id: crypto.randomUUID(),
      name: newSource.type === 'folder' ? newSource.path.split(/[/\\]/).pop() || '' : 
            newSource.type === 'url' ? new URL(newSource.url).hostname : '',
      type: newSource.type,
      path: newSource.path || undefined,
      url: newSource.url || undefined,
      enabled: true,
      indexed: false,
    }

    const base = bases.find(b => b.id === baseId)
    if (!base) return

    const updated = bases.map(b => 
      b.id === baseId ? { ...b, sources: [...b.sources, source] } : b
    )

    try {
      await invoke({ action: 'set_config', key: 'knowledge', value: updated })
      setBases(updated)
      setAddingSource(null)
      setNewSource({ type: 'folder', path: '', url: '' })
    } catch (error) {
      console.error('Failed to add source:', error)
    }
  }

  const handleDeleteSource = async (baseId: string, sourceId: string) => {
    const updated = bases.map(b => 
      b.id === baseId ? { ...b, sources: b.sources.filter(s => s.id !== sourceId) } : b
    )
    try {
      await invoke({ action: 'set_config', key: 'knowledge', value: updated })
      setBases(updated)
    } catch (error) {
      console.error('Failed to delete source:', error)
    }
  }

  const handleToggleSource = async (baseId: string, sourceId: string, enabled: boolean) => {
    const updated = bases.map(b => 
      b.id === baseId ? { 
        ...b, 
        sources: b.sources.map(s => s.id === sourceId ? { ...s, enabled } : s) 
      } : b
    )
    try {
      await invoke({ action: 'set_config', key: 'knowledge', value: updated })
      setBases(updated)
    } catch (error) {
      console.error('Failed to toggle source:', error)
    }
  }

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'file': return FileText
      case 'folder': return FolderOpen
      case 'url': return Globe
      default: return FileText
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-zinc-400" />
          <span className="text-sm font-medium text-zinc-300">知识库管理</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={loadKnowledgeBases}
            disabled={loading}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-500"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          </button>
          <button
            onClick={handleAddBase}
            className="px-2 py-1 rounded bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 text-xs"
          >
            <Plus className="w-3 h-3 inline mr-1" />
            新建
          </button>
        </div>
      </div>

      <p className="text-xs text-zinc-500">
        管理 AI 可以参考的知识库，支持本地文件、文件夹和网页
      </p>

      {bases.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-zinc-800 rounded-lg">
          <Database className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
          <p className="text-xs text-zinc-500">暂无知识库</p>
          <p className="text-[10px] text-zinc-600 mt-1">点击"新建"创建知识库</p>
        </div>
      ) : (
        <div className="space-y-2">
          {bases.map(base => (
            <div key={base.id} className="border border-zinc-800 rounded-lg overflow-hidden">
              <div
                className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-800/50 cursor-pointer"
                onClick={() => setExpanded(expanded === base.id ? null : base.id)}
              >
                {expanded === base.id ? (
                  <ChevronDown className="w-3 h-3 text-zinc-500" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-zinc-500" />
                )}
                <Database className="w-4 h-4 text-purple-400" />
                <span className="flex-1 text-sm text-zinc-300">{base.name}</span>
                <span className="text-[10px] text-zinc-500">
                  {base.sources.length} 个来源
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteBase(base.id)
                  }}
                  className="p-1 rounded hover:bg-zinc-800 text-zinc-500"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              {expanded === base.id && (
                <div className="px-3 py-3 border-t border-zinc-800 bg-zinc-900/50 space-y-3">
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">名称</label>
                    <input
                      type="text"
                      value={base.name}
                      onChange={(e) => handleUpdateBase(base.id, { name: e.target.value })}
                      className="w-full px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">描述</label>
                    <textarea
                      value={base.description}
                      onChange={(e) => handleUpdateBase(base.id, { description: e.target.value })}
                      placeholder="可选的描述..."
                      rows={2}
                      className="w-full px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 resize-none focus:outline-none focus:border-zinc-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-zinc-500 block mb-1">分块大小</label>
                      <input
                        type="number"
                        value={base.chunkSize || 1000}
                        onChange={(e) => handleUpdateBase(base.id, { chunkSize: parseInt(e.target.value) })}
                        className="w-full px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 block mb-1">分块重叠</label>
                      <input
                        type="number"
                        value={base.chunkOverlap || 200}
                        onChange={(e) => handleUpdateBase(base.id, { chunkOverlap: parseInt(e.target.value) })}
                        className="w-full px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs text-zinc-500">知识来源</label>
                      <button
                        onClick={() => setAddingSource(base.id)}
                        className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] text-zinc-400"
                      >
                        <Plus className="w-3 h-3 inline mr-1" />
                        添加
                      </button>
                    </div>

                    {addingSource === base.id && (
                      <div className="mb-2 p-2 rounded bg-zinc-800 border border-zinc-700 space-y-2">
                        <div className="flex gap-1">
                          {(['folder', 'file', 'url'] as const).map(type => (
                            <button
                              key={type}
                              onClick={() => setNewSource(prev => ({ ...prev, type }))}
                              className={cn(
                                'px-2 py-1 rounded text-[10px] transition-colors',
                                newSource.type === type
                                  ? 'bg-zinc-700 text-white'
                                  : 'text-zinc-500 hover:text-zinc-300'
                              )}
                            >
                              {type === 'folder' ? '文件夹' : type === 'file' ? '文件' : '网址'}
                            </button>
                          ))}
                        </div>

                        {newSource.type === 'url' ? (
                          <input
                            type="text"
                            value={newSource.url}
                            onChange={(e) => setNewSource(prev => ({ ...prev, url: e.target.value }))}
                            placeholder="https://..."
                            className="w-full px-2 py-1.5 rounded bg-zinc-900 border border-zinc-700 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600"
                          />
                        ) : (
                          <input
                            type="text"
                            value={newSource.path}
                            onChange={(e) => setNewSource(prev => ({ ...prev, path: e.target.value }))}
                            placeholder={newSource.type === 'folder' ? 'C:\\path\\to\\folder' : 'C:\\path\\to\\file.md'}
                            className="w-full px-2 py-1.5 rounded bg-zinc-900 border border-zinc-700 text-xs text-zinc-300 font-mono focus:outline-none focus:border-zinc-600"
                          />
                        )}

                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => setAddingSource(null)}
                            className="px-2 py-1 rounded text-xs text-zinc-400 hover:bg-zinc-700"
                          >
                            取消
                          </button>
                          <button
                            onClick={() => handleAddSource(base.id)}
                            disabled={!newSource.path && !newSource.url}
                            className="px-2 py-1 rounded text-xs bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                          >
                            添加
                          </button>
                        </div>
                      </div>
                    )}

                    {base.sources.length === 0 ? (
                      <p className="text-[10px] text-zinc-600 text-center py-2">
                        暂无来源，点击"添加"开始
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {base.sources.map(source => {
                          const Icon = getSourceIcon(source.type)
                          return (
                            <div
                              key={source.id}
                              className="flex items-center gap-2 px-2 py-1.5 rounded bg-zinc-800/50"
                            >
                              <Icon className="w-3.5 h-3.5 text-zinc-400" />
                              <span className="flex-1 text-xs text-zinc-300 truncate">
                                {source.name || source.path || source.url}
                              </span>
                              <button
                                onClick={() => handleToggleSource(base.id, source.id, !source.enabled)}
                                className={cn(
                                  'p-0.5 rounded',
                                  source.enabled ? 'text-emerald-400' : 'text-zinc-500'
                                )}
                              >
                                {source.enabled ? (
                                  <Check className="w-3 h-3" />
                                ) : (
                                  <X className="w-3 h-3" />
                                )}
                              </button>
                              <button
                                onClick={() => handleDeleteSource(base.id, source.id)}
                                className="p-0.5 rounded hover:bg-zinc-700 text-zinc-500"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="p-3 rounded-lg bg-blue-950/20 border border-blue-900/50">
        <p className="text-[10px] text-blue-400/80">
          知识库会为 AI 提供额外的上下文信息。支持的文件格式：txt, md, json, csv, pdf 等。
        </p>
      </div>
    </div>
  )
}
