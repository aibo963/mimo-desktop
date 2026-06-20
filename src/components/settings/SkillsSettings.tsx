import { useState, useEffect } from 'react'
import { useMimo } from '@/hooks/useMimo'
import { BookOpen, RefreshCw, Plus, Trash2, ExternalLink, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToastStore } from '@/stores/toastStore'
import { debug } from '@/lib/debug'

export function SkillsSettings() {
  const [paths, setPaths] = useState<string[]>([])
  const [urls, setUrls] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [newPath, setNewPath] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const { invoke } = useMimo()
  const addToast = useToastStore((state) => state.addToast)

  useEffect(() => {
    loadSkills()
  }, [])

  const loadSkills = async () => {
    setLoading(true)
    try {
      const config = await invoke({ action: 'get_config' })
      if (config?.skills) {
        setPaths(config.skills.paths || [])
        setUrls(config.skills.urls || [])
      }
    } catch (error) {
      debug.error('Failed to load skills config:', error)
      addToast('加载技能配置失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleAddPath = async () => {
    if (!newPath.trim()) return
    const updated = [...paths, newPath.trim()]
    try {
      await invoke({ action: 'set_config', key: 'skills.paths', value: updated })
      setPaths(updated)
      setNewPath('')
    } catch (error) {
      debug.error('Failed to add skill path:', error)
      addToast('添加技能路径失败', 'error')
    }
  }

  const handleRemovePath = async (index: number) => {
    const updated = paths.filter((_, i) => i !== index)
    try {
      await invoke({ action: 'set_config', key: 'skills.paths', value: updated })
      setPaths(updated)
    } catch (error) {
      debug.error('Failed to remove skill path:', error)
      addToast('删除技能路径失败', 'error')
    }
  }

  const handleAddUrl = async () => {
    if (!newUrl.trim()) return
    const updated = [...urls, newUrl.trim()]
    try {
      await invoke({ action: 'set_config', key: 'skills.urls', value: updated })
      setUrls(updated)
      setNewUrl('')
    } catch (error) {
      debug.error('Failed to add skill URL:', error)
      addToast('添加技能 URL 失败', 'error')
    }
  }

  const handleRemoveUrl = async (index: number) => {
    const updated = urls.filter((_, i) => i !== index)
    try {
      await invoke({ action: 'set_config', key: 'skills.urls', value: updated })
      setUrls(updated)
    } catch (error) {
      debug.error('Failed to remove skill URL:', error)
      addToast('删除技能 URL 失败', 'error')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-zinc-400" />
          <span className="text-sm font-medium text-zinc-300">Skills 配置</span>
        </div>
        <button
          onClick={loadSkills}
          disabled={loading}
          className="p-1 rounded hover:bg-zinc-800 text-zinc-500"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
        </button>
      </div>

      <p className="text-xs text-zinc-500">配置额外的技能文件夹路径和远程技能 URL</p>

      <div>
        <label className="text-xs text-zinc-500 block mb-2">
          <FolderOpen className="w-3 h-3 inline mr-1" />
          本地路径
        </label>
        <div className="space-y-1">
          {paths.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="flex-1 text-xs font-mono text-zinc-300 truncate px-2 py-1.5 bg-zinc-800 rounded">
                {p}
              </span>
              <button
                onClick={() => handleRemovePath(i)}
                className="p-1 rounded hover:bg-zinc-800 text-zinc-500"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-1 mt-2">
          <input
            type="text"
            value={newPath}
            onChange={(e) => setNewPath(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddPath()}
            placeholder="添加技能路径..."
            className="flex-1 px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600"
          />
          <button
            onClick={handleAddPath}
            disabled={!newPath.trim()}
            className="px-2 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-400 disabled:opacity-50"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div>
        <label className="text-xs text-zinc-500 block mb-2">
          <ExternalLink className="w-3 h-3 inline mr-1" />
          远程 URL
        </label>
        <div className="space-y-1">
          {urls.map((u, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="flex-1 text-xs font-mono text-zinc-300 truncate px-2 py-1.5 bg-zinc-800 rounded">
                {u}
              </span>
              <button
                onClick={() => handleRemoveUrl(i)}
                className="p-1 rounded hover:bg-zinc-800 text-zinc-500"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-1 mt-2">
          <input
            type="text"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
            placeholder="https://example.com/.well-known/skills/"
            className="flex-1 px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600"
          />
          <button
            onClick={handleAddUrl}
            disabled={!newUrl.trim()}
            className="px-2 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-400 disabled:opacity-50"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  )
}
