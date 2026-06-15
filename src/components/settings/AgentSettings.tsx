import { useState, useEffect } from 'react'
import { useMimo } from '@/hooks/useMimo'
import {
  Bot,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Settings,
  Zap,
  BookOpen,
  Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AgentConfig {
  model?: string
  temperature?: number
  prompt?: string
  steps?: number
  permission?: any
}

interface Agent {
  name: string
  label: string
  icon: any
  config: AgentConfig
}

const defaultAgents: Agent[] = [
  { name: 'build', label: 'Build', icon: Zap, config: {} },
  { name: 'plan', label: 'Plan', icon: BookOpen, config: {} },
  { name: 'general', label: 'General', icon: Bot, config: {} },
  { name: 'explore', label: 'Explore', icon: Search, config: {} },
]

export function AgentSettings() {
  const [agents, setAgents] = useState<Agent[]>(defaultAgents)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, AgentConfig>>({})
  const { invoke } = useMimo()

  useEffect(() => {
    loadAgentConfig()
  }, [])

  const loadAgentConfig = async () => {
    setLoading(true)
    try {
      const config = await invoke({ action: 'get_config' })
      if (config?.agent) {
        setAgents(prev => prev.map(a => ({
          ...a,
          config: config.agent[a.name] || {},
        })))
      }
    } catch (error) {
      console.error('Failed to load agent config:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (name: string, field: string, value: any) => {
    setEditValues(prev => ({
      ...prev,
      [name]: { ...prev[name], [field]: value },
    }))
  }

  const handleSave = async (name: string) => {
    const values = editValues[name]
    if (!values) return

    try {
      await invoke({
        action: 'set_config',
        key: `agent.${name}`,
        value: { ...agents.find(a => a.name === name)?.config, ...values },
      })
      setAgents(prev => prev.map(a =>
        a.name === name ? { ...a, config: { ...a.config, ...values } } : a
      ))
      setEditValues(prev => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    } catch (error) {
      console.error('Failed to save agent config:', error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-zinc-400" />
          <span className="text-sm font-medium text-zinc-300">Agent 配置</span>
        </div>
        <button
          onClick={loadAgentConfig}
          disabled={loading}
          className="p-1 rounded hover:bg-zinc-800 text-zinc-500"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
        </button>
      </div>

      <p className="text-xs text-zinc-500">
        配置不同 Agent 的行为和参数
      </p>

      <div className="space-y-2">
        {agents.map(agent => (
          <div
            key={agent.name}
            className="border border-zinc-800 rounded-lg overflow-hidden"
          >
            <div
              className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-800/50 cursor-pointer"
              onClick={() => setExpanded(expanded === agent.name ? null : agent.name)}
            >
              {expanded === agent.name ? (
                <ChevronDown className="w-3 h-3 text-zinc-500" />
              ) : (
                <ChevronRight className="w-3 h-3 text-zinc-500" />
              )}
              <agent.icon className="w-4 h-4 text-emerald-400" />
              <span className="flex-1 text-sm text-zinc-300">{agent.label}</span>
              {agent.config.model && (
                <span className="text-xs text-zinc-500 font-mono">
                  {agent.config.model.split('/').pop()}
                </span>
              )}
            </div>

            {expanded === agent.name && (
              <div className="px-3 py-3 border-t border-zinc-800 bg-zinc-900/50 space-y-3">
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">模型</label>
                  <input
                    type="text"
                    value={editValues[agent.name]?.model ?? agent.config.model ?? ''}
                    onChange={(e) => handleEdit(agent.name, 'model', e.target.value)}
                    placeholder="provider/model-name"
                    className="w-full px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 font-mono focus:outline-none focus:border-zinc-600"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-500 block mb-1">
                    温度 ({editValues[agent.name]?.temperature ?? agent.config.temperature ?? '默认'})
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={editValues[agent.name]?.temperature ?? agent.config.temperature ?? 0.7}
                    onChange={(e) => handleEdit(agent.name, 'temperature', parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-500 block mb-1">
                    最大步数 ({editValues[agent.name]?.steps ?? agent.config.steps ?? '默认'})
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={editValues[agent.name]?.steps ?? agent.config.steps ?? ''}
                    onChange={(e) => handleEdit(agent.name, 'steps', parseInt(e.target.value) || undefined)}
                    placeholder="不限制"
                    className="w-full px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-500 block mb-1">系统提示词</label>
                  <textarea
                    value={editValues[agent.name]?.prompt ?? agent.config.prompt ?? ''}
                    onChange={(e) => handleEdit(agent.name, 'prompt', e.target.value)}
                    placeholder="可选的自定义系统提示词..."
                    rows={3}
                    className="w-full px-2 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 resize-none focus:outline-none focus:border-zinc-600"
                  />
                </div>

                {editValues[agent.name] && (
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={() => setEditValues(prev => {
                        const next = { ...prev }
                        delete next[agent.name]
                        return next
                      })}
                      className="px-2 py-1 rounded text-xs text-zinc-400 hover:bg-zinc-800"
                    >
                      取消
                    </button>
                    <button
                      onClick={() => handleSave(agent.name)}
                      className="px-2 py-1 rounded text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      保存
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
