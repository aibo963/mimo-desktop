import { useState } from 'react'
import { useTemplateStore, Template } from '@/stores/templateStore'
import { FileText, Plus, Trash2, Save, X } from 'lucide-react'

export function TemplateSettings() {
  const { templates, addTemplate, removeTemplate, updateTemplate } = useTemplateStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Template>>({})
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    content: '',
    category: '通用',
    icon: '',
  })

  const categories = Array.from(new Set(templates.map((t) => t.category)))

  const handleStartEdit = (template: Template) => {
    setEditingId(template.id)
    setEditForm({
      name: template.name,
      content: template.content,
      category: template.category,
      icon: template.icon,
    })
  }

  const handleSaveEdit = () => {
    if (editingId && editForm.name && editForm.content) {
      updateTemplate(editingId, editForm)
      setEditingId(null)
      setEditForm({})
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditForm({})
  }

  const handleAdd = () => {
    if (newTemplate.name && newTemplate.content) {
      addTemplate({
        name: newTemplate.name,
        content: newTemplate.content,
        category: newTemplate.category || '通用',
        icon: newTemplate.icon || undefined,
      })
      setNewTemplate({ name: '', content: '', category: '通用', icon: '' })
      setShowAddForm(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-zinc-400" />
          <span className="text-sm font-medium text-zinc-300">提示模板</span>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-400"
        >
          <Plus className="w-3 h-3" />
          添加模板
        </button>
      </div>

      {showAddForm && (
        <div className="p-3 rounded-lg border border-zinc-700 bg-zinc-900 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-300">新建模板</span>
            <button
              onClick={() => setShowAddForm(false)}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-500"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <input
            type="text"
            value={newTemplate.name}
            onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
            placeholder="模板名称"
            className="w-full px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600"
          />
          <input
            type="text"
            value={newTemplate.category}
            onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
            placeholder="分类"
            className="w-full px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600"
          />
          <textarea
            value={newTemplate.content}
            onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
            placeholder="模板内容（支持 {code}、{content} 等占位符）"
            rows={4}
            className="w-full px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 font-mono resize-none focus:outline-none focus:border-zinc-600"
          />
          <button
            onClick={handleAdd}
            disabled={!newTemplate.name || !newTemplate.content}
            className="flex items-center gap-1 px-2 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-xs text-white disabled:opacity-50"
          >
            <Save className="w-3 h-3" />
            保存
          </button>
        </div>
      )}

      <div className="space-y-3">
        {categories.map((category) => (
          <div key={category}>
            <div className="text-xs font-medium text-zinc-500 mb-2">{category}</div>
            <div className="space-y-1">
              {templates
                .filter((t) => t.category === category)
                .map((template) => (
                  <div key={template.id} className="flex items-start gap-2">
                    {editingId === template.id ? (
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={editForm.name || ''}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="flex-1 px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600"
                          />
                          <input
                            type="text"
                            value={editForm.category || ''}
                            onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                            className="w-24 px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600"
                          />
                        </div>
                        <textarea
                          value={editForm.content || ''}
                          onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                          rows={3}
                          className="w-full px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 font-mono resize-none focus:outline-none focus:border-zinc-600"
                        />
                        <div className="flex gap-1">
                          <button
                            onClick={handleSaveEdit}
                            className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-xs text-white"
                          >
                            <Save className="w-3 h-3" />
                            保存
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-400"
                          >
                            <X className="w-3 h-3" />
                            取消
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700">
                          <div className="text-xs text-zinc-300 font-medium">{template.name}</div>
                          <div className="text-[10px] text-zinc-500 truncate font-mono mt-0.5">
                            {template.content.slice(0, 60)}...
                          </div>
                        </div>
                        <button
                          onClick={() => handleStartEdit(template)}
                          className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 shrink-0"
                        >
                          <FileText className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => removeTemplate(template.id)}
                          className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 shrink-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      <div className="text-[10px] text-zinc-600 space-y-1">
        <p>占位符说明:</p>
        <p className="font-mono">{'{code}'}</p>
        <p className="font-mono">{'{content}'}</p>
        <p className="font-mono">{'{language}'}</p>
      </div>
    </div>
  )
}
