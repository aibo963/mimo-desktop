import { useState, useEffect } from 'react'
import { useMimo } from '@/hooks/useMimo'
import {
  FileText,
  RefreshCw,
  Plus,
  Trash2,
  Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function InstructionsSettings() {
  const [instructions, setInstructions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [newInstruction, setNewInstruction] = useState('')
  const { invoke } = useMimo()

  useEffect(() => {
    loadInstructions()
  }, [])

  const loadInstructions = async () => {
    setLoading(true)
    try {
      const config = await invoke({ action: 'get_config' })
      if (config?.instructions) {
        setInstructions(Array.isArray(config.instructions) ? config.instructions : [])
      }
    } catch (error) {
      console.error('Failed to load instructions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!newInstruction.trim()) return
    const updated = [...instructions, newInstruction.trim()]
    try {
      await invoke({ action: 'set_config', key: 'instructions', value: updated })
      setInstructions(updated)
      setNewInstruction('')
    } catch (error) {
      console.error('Failed to add instruction:', error)
    }
  }

  const handleRemove = async (index: number) => {
    const updated = instructions.filter((_, i) => i !== index)
    try {
      await invoke({ action: 'set_config', key: 'instructions', value: updated })
      setInstructions(updated)
    } catch (error) {
      console.error('Failed to remove instruction:', error)
    }
  }

  const handleEdit = async (index: number, value: string) => {
    const updated = [...instructions]
    updated[index] = value
    setInstructions(updated)
  }

  const handleSaveEdit = async () => {
    try {
      await invoke({ action: 'set_config', key: 'instructions', value: instructions })
    } catch (error) {
      console.error('Failed to save instructions:', error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-zinc-400" />
          <span className="text-sm font-medium text-zinc-300">指令文件</span>
        </div>
        <button
          onClick={loadInstructions}
          disabled={loading}
          className="p-1 rounded hover:bg-zinc-800 text-zinc-500"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
        </button>
      </div>

      <div className="p-3 rounded-lg bg-blue-950/20 border border-blue-900/50">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-400/80">
            指令文件会在每次对话时自动加载，用于提供额外的上下文或规则。支持 glob 模式匹配。
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {instructions.map((inst, i) => (
          <div key={i} className="flex items-start gap-2">
            <textarea
              value={inst}
              onChange={(e) => handleEdit(i, e.target.value)}
              onBlur={handleSaveEdit}
              rows={2}
              className="flex-1 px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 font-mono resize-none focus:outline-none focus:border-zinc-600"
            />
            <button
              onClick={() => handleRemove(i)}
              className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 shrink-0"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-1">
        <input
          type="text"
          value={newInstruction}
          onChange={(e) => setNewInstruction(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="添加指令文件路径或 glob 模式..."
          className="flex-1 px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600"
        />
        <button
          onClick={handleAdd}
          disabled={!newInstruction.trim()}
          className="px-2 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-400 disabled:opacity-50"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      <div className="text-[10px] text-zinc-600 space-y-1">
        <p>示例:</p>
        <p className="font-mono">.cursorrules</p>
        <p className="font-mono">CLAUDE.md</p>
        <p className="font-mono">**/*.instructions.md</p>
      </div>
    </div>
  )
}
