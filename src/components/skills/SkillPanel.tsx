import { useState, useEffect, useCallback } from 'react'
import { Wrench, Search, Plus, Trash2, X, Zap, Code, Pen, BarChart3, Tag } from 'lucide-react'
import { useSkill, Skill } from '@/hooks/useSkill'
import { useConfirm } from '@/hooks/useConfirm'
import { cn } from '@/lib/utils'

interface SkillPanelProps {
  onClose?: () => void
  onUseSkill?: (content: string) => void
}

const CATEGORY_LABELS: Record<Skill['category'], string> = {
  code: '代码',
  writing: '写作',
  analysis: '分析',
  general: '通用',
}

const CATEGORY_ICONS: Record<Skill['category'], typeof Code> = {
  code: Code,
  writing: Pen,
  analysis: BarChart3,
  general: Zap,
}

const CATEGORY_COLORS: Record<Skill['category'], string> = {
  code: 'bg-blue-900/30 text-blue-400',
  writing: 'bg-purple-900/30 text-purple-400',
  analysis: 'bg-amber-900/30 text-amber-400',
  general: 'bg-emerald-900/30 text-emerald-400',
}

export function SkillPanel({ onClose, onUseSkill }: SkillPanelProps) {
  const { skills, isLoading, loadAll, add, remove, use: useSkillAction } = useSkill()
  const { confirm } = useConfirm()
  const [searchQuery, setSearchQuery] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newCategory, setNewCategory] = useState<Skill['category']>('general')
  const [newContent, setNewContent] = useState('')
  const [newTags, setNewTags] = useState('')
  const [filteredSkills, setFilteredSkills] = useState<Skill[]>([])
  const [selectedCategory, setSelectedCategory] = useState<Skill['category'] | 'all'>('all')
  const [previewSkill, setPreviewSkill] = useState<Skill | null>(null)

  useEffect(() => {
    loadAll()
  }, [loadAll])

  useEffect(() => {
    let result = skills
    if (selectedCategory !== 'all') {
      result = result.filter((s) => s.category === selectedCategory)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.tags.some((t) => t.toLowerCase().includes(q))
      )
    }
    setFilteredSkills(result)
  }, [skills, searchQuery, selectedCategory])

  const handleAdd = useCallback(async () => {
    if (!newName.trim() || !newContent.trim()) return
    const tags = newTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    await add(newName.trim(), newDesc.trim(), newCategory, newContent.trim(), tags)
    setNewName('')
    setNewDesc('')
    setNewContent('')
    setNewTags('')
    setShowAdd(false)
  }, [newName, newDesc, newCategory, newContent, newTags, add])

  const handleUse = useCallback(
    async (skill: Skill) => {
      if (onUseSkill) {
        await useSkillAction(skill.id)
        onUseSkill(skill.content)
      }
    },
    [useSkillAction, onUseSkill]
  )

  const handlePreview = useCallback((skill: Skill) => {
    setPreviewSkill(skill)
  }, [])

  return (
    <div className="flex flex-col h-full bg-zinc-900 dark:bg-zinc-900 bg-gray-50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 dark:border-zinc-800 border-gray-200">
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-zinc-400" />
          <span className="text-sm font-medium text-zinc-200 dark:text-zinc-200 text-gray-800">
            技能
          </span>
          <span className="text-[10px] text-zinc-500">{skills.length} 个</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="p-1 rounded hover:bg-zinc-800 dark:hover:bg-zinc-800 hover:bg-gray-200 text-zinc-500 hover:text-zinc-300 transition-colors"
            title="添加技能"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-zinc-800 dark:hover:bg-zinc-800 hover:bg-gray-200 text-zinc-500 hover:text-zinc-300 transition-colors"
            aria-label="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="px-3 py-2 border-b border-zinc-800/50 dark:border-zinc-800/50 border-gray-200/50 space-y-2">
        <div className="flex items-center gap-2 bg-zinc-800 dark:bg-zinc-800 bg-gray-100 rounded-lg px-3 py-1.5">
          <Search className="w-3.5 h-3.5 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索技能..."
            className="flex-1 bg-transparent text-xs text-zinc-200 dark:text-zinc-200 text-gray-800 placeholder-zinc-500 focus:outline-none"
          />
        </div>
        <div className="flex gap-1">
          {(['all', 'code', 'writing', 'analysis', 'general'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'px-2 py-0.5 text-[10px] rounded transition-colors',
                selectedCategory === cat
                  ? 'bg-zinc-700 text-zinc-200'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
              )}
            >
              {cat === 'all' ? '全部' : CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      {showAdd && (
        <div className="px-3 py-2 border-b border-zinc-800/50 dark:border-zinc-800/50 border-gray-200/50 space-y-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="技能名称"
            className="w-full bg-zinc-800 dark:bg-zinc-800 bg-gray-100 rounded px-3 py-1.5 text-xs text-zinc-200 dark:text-zinc-200 text-gray-800 placeholder-zinc-500 focus:outline-none"
            autoFocus
          />
          <input
            type="text"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="描述 (可选)"
            className="w-full bg-zinc-800 dark:bg-zinc-800 bg-gray-100 rounded px-3 py-1.5 text-xs text-zinc-200 dark:text-zinc-200 text-gray-800 placeholder-zinc-500 focus:outline-none"
          />
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="提示词内容..."
            className="w-full min-h-[60px] bg-zinc-800 dark:bg-zinc-800 bg-gray-100 rounded px-3 py-2 text-xs text-zinc-200 dark:text-zinc-200 text-gray-800 placeholder-zinc-500 focus:outline-none resize-none"
          />
          <div className="flex items-center gap-2">
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as Skill['category'])}
              className="bg-zinc-800 dark:bg-zinc-800 bg-gray-100 rounded px-2 py-1 text-xs text-zinc-200 dark:text-zinc-200 text-gray-800 focus:outline-none"
            >
              <option value="code">代码</option>
              <option value="writing">写作</option>
              <option value="analysis">分析</option>
              <option value="general">通用</option>
            </select>
            <input
              type="text"
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              placeholder="标签 (逗号分隔)"
              className="flex-1 bg-zinc-800 dark:bg-zinc-800 bg-gray-100 rounded px-2 py-1 text-xs text-zinc-200 dark:text-zinc-200 text-gray-800 placeholder-zinc-500 focus:outline-none"
            />
            <button
              onClick={handleAdd}
              disabled={!newName.trim() || !newContent.trim()}
              className="px-3 py-1 text-xs rounded bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              添加
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="text-center py-12 text-zinc-500 text-sm">加载中...</div>
        ) : filteredSkills.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 text-sm">
            {searchQuery ? '未找到匹配的技能' : '暂无技能'}
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredSkills.map((skill) => {
              const Icon = CATEGORY_ICONS[skill.category]
              return (
                <div
                  key={skill.id}
                  className="group p-2.5 rounded-lg hover:bg-zinc-800/50 dark:hover:bg-zinc-800/50 hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => handlePreview(skill)}
                >
                  <div className="flex items-start gap-2">
                    <Icon className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium text-zinc-200 dark:text-zinc-200 text-gray-800">
                          {skill.name}
                        </p>
                        <span
                          className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded',
                            CATEGORY_COLORS[skill.category]
                          )}
                        >
                          {CATEGORY_LABELS[skill.category]}
                        </span>
                        {skill.useCount > 0 && (
                          <span className="text-[10px] text-zinc-600">
                            使用 {skill.useCount} 次
                          </span>
                        )}
                      </div>
                      {skill.description && (
                        <p className="text-[10px] text-zinc-500 mt-0.5">{skill.description}</p>
                      )}
                      <p className="text-[10px] text-zinc-600 mt-1 line-clamp-2">{skill.content}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm(`确定删除技能「${skill.name}」？`)) {
                          remove(skill.id)
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-all shrink-0"
                      title="删除"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {previewSkill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md mx-4 bg-zinc-900 rounded-xl border border-zinc-800 shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                {(() => {
                  const Icon = CATEGORY_ICONS[previewSkill.category]
                  return <Icon className="w-4 h-4 text-zinc-400" />
                })()}
                <span className="text-sm font-medium text-white">{previewSkill.name}</span>
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded',
                    CATEGORY_COLORS[previewSkill.category]
                  )}
                >
                  {CATEGORY_LABELS[previewSkill.category]}
                </span>
              </div>
              <button
                onClick={() => setPreviewSkill(null)}
                className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {previewSkill.description && (
                <p className="text-xs text-zinc-400">{previewSkill.description}</p>
              )}
              <div className="p-3 bg-zinc-800 rounded-lg">
                <pre className="text-xs text-zinc-300 whitespace-pre-wrap break-words font-mono">
                  {previewSkill.content}
                </pre>
              </div>
              {previewSkill.tags.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  <Tag className="w-3 h-3 text-zinc-600" />
                  {previewSkill.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
              <span className="text-[10px] text-zinc-600">使用 {previewSkill.useCount} 次</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPreviewSkill(null)}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
                >
                  取消
                </button>
                {onUseSkill && (
                  <button
                    onClick={() => handleUse(previewSkill)}
                    className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                  >
                    使用技能
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
