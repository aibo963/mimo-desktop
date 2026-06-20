import { useState } from 'react'
import { ModelSelector } from './ModelSelector'
import { ConfigEditor } from './ConfigEditor'
import { AgentSettings } from './AgentSettings'
import { PermissionSettings } from './PermissionSettings'
import { SkillsSettings } from './SkillsSettings'
import { InstructionsSettings } from './InstructionsSettings'
import { CompactionSettings } from './CompactionSettings'
import { ExperimentalSettings } from './ExperimentalSettings'
import { GeneralSettings } from './GeneralSettings'
import { ProviderSettings } from './ProviderSettings'
import { TemplateSettings } from './TemplateSettings'
import {
  Settings,
  Cpu,
  FileText,
  Bot,
  Shield,
  BookOpen,
  FileCode,
  Layers,
  Beaker,
  Sliders,
  Globe,
  ClipboardList,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type SettingsTab =
  | 'general'
  | 'model'
  | 'provider'
  | 'agent'
  | 'skills'
  | 'instructions'
  | 'templates'
  | 'permissions'
  | 'compaction'
  | 'experimental'
  | 'config'

const tabs = [
  { id: 'general' as const, label: '通用', icon: Sliders },
  { id: 'model' as const, label: '模型', icon: Cpu },
  { id: 'provider' as const, label: '供应商', icon: Globe },
  { id: 'agent' as const, label: 'Agent', icon: Bot },
  { id: 'skills' as const, label: 'Skills', icon: BookOpen },
  { id: 'instructions' as const, label: '指令', icon: FileCode },
  { id: 'templates' as const, label: '模板', icon: ClipboardList },
  { id: 'permissions' as const, label: '权限', icon: Shield },
  { id: 'compaction' as const, label: '压缩', icon: Layers },
  { id: 'experimental' as const, label: '实验', icon: Beaker },
  { id: 'config' as const, label: '配置', icon: FileText },
]

interface SettingsPanelProps {
  onClose?: () => void
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-zinc-400" />
            <span className="text-sm font-medium text-zinc-300">设置</span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
              aria-label="关闭设置"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-0.5 bg-zinc-900 rounded-lg p-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-md text-[10px] transition-colors',
                activeTab === tab.id
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              )}
              title={tab.label}
            >
              <tab.icon className="w-3 h-3" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3">
        {activeTab === 'general' && <GeneralSettings />}
        {activeTab === 'model' && <ModelSelector />}
        {activeTab === 'provider' && <ProviderSettings />}
        {activeTab === 'agent' && <AgentSettings />}
        {activeTab === 'skills' && <SkillsSettings />}
        {activeTab === 'instructions' && <InstructionsSettings />}
        {activeTab === 'templates' && <TemplateSettings />}
        {activeTab === 'permissions' && <PermissionSettings />}
        {activeTab === 'compaction' && <CompactionSettings />}
        {activeTab === 'experimental' && <ExperimentalSettings />}
        {activeTab === 'config' && <ConfigEditor />}
      </div>
    </div>
  )
}
