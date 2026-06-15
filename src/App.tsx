import { useState } from 'react'
import { SessionPanel } from './components/session/SessionPanel'
import { ChatPanel } from './components/chat/ChatPanel'
import { SettingsPanel } from './components/settings/SettingsPanel'
import { FileTreePanel } from './components/file-tree/FileTreePanel'
import { FilePreview } from './components/file-tree/FilePreview'
import { StatsDashboard } from './components/stats/StatsDashboard'
import { useSessionStore } from './stores/sessionStore'
import {
  Settings,
  FolderTree,
  TrendingUp,
  MessageSquare,
  Minus,
  Square,
  X,
} from 'lucide-react'
import { cn } from './lib/utils'

type View = 'chat' | 'settings' | 'files' | 'stats'
type SidePanel = 'sessions' | 'files'

function TitleBar() {
  return (
    <div className="h-8 bg-zinc-950 flex items-center justify-between select-none drag-region">
      <div className="flex-1 flex items-center justify-center">
        <span className="text-xs text-zinc-500">Mimo Desktop</span>
      </div>
      <div className="flex no-drag">
        <button
          onClick={() => window.electronAPI?.invoke('window:minimize')}
          className="w-10 h-8 flex items-center justify-center hover:bg-zinc-800 text-zinc-400"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => window.electronAPI?.invoke('window:maximize')}
          className="w-10 h-8 flex items-center justify-center hover:bg-zinc-800 text-zinc-400"
        >
          <Square className="w-3 h-3" />
        </button>
        <button
          onClick={() => window.electronAPI?.invoke('window:close')}
          className="w-10 h-8 flex items-center justify-center hover:bg-red-600 text-zinc-400 hover:text-white"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const { activeSessionId } = useSessionStore()
  const [view, setView] = useState<View>('chat')
  const [sidePanel, setSidePanel] = useState<SidePanel>('sessions')
  const [previewFile, setPreviewFile] = useState<string | null>(null)

  const handleFileSelect = (path: string) => {
    setPreviewFile(path)
  }

  const navItems = [
    {
      id: 'sessions',
      icon: MessageSquare,
      label: '会话',
      active: sidePanel === 'sessions' && view === 'chat',
      onClick: () => {
        setSidePanel('sessions')
        setView('chat')
      },
    },
    {
      id: 'files',
      icon: FolderTree,
      label: '文件',
      active: sidePanel === 'files',
      onClick: () => {
        setSidePanel('files')
        if (view !== 'chat') setView('chat')
      },
    },
    {
      id: 'stats',
      icon: TrendingUp,
      label: '统计',
      active: view === 'stats',
      onClick: () => setView(view === 'stats' ? 'chat' : 'stats'),
    },
    {
      id: 'settings',
      icon: Settings,
      label: '设置',
      active: view === 'settings',
      onClick: () => setView(view === 'settings' ? 'chat' : 'settings'),
    },
  ]

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-white">
      <TitleBar />
      <div className="flex-1 flex min-h-0">
        <div className="w-14 border-r border-zinc-800/80 flex flex-col items-center py-3 gap-1 bg-zinc-950 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-xs font-bold mb-3">
            M
          </div>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={item.onClick}
              className={cn(
                'w-10 h-10 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors',
                item.active
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
              )}
              title={item.label}
            >
              <item.icon className="w-4 h-4" />
              <span className="text-[9px]">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="w-56 border-r border-zinc-800/80 flex flex-col bg-zinc-950 shrink-0">
          {view === 'settings' ? (
            <SettingsPanel />
          ) : view === 'stats' ? (
            <StatsDashboard />
          ) : sidePanel === 'files' ? (
            <FileTreePanel onFileSelect={handleFileSelect} />
          ) : (
            <SessionPanel />
          )}
        </div>

        <div className="flex-1 flex min-w-0">
          {view === 'settings' || view === 'stats' ? null : (
            <>
              {previewFile && (
                <div className="w-[400px] border-r border-zinc-800/80 shrink-0">
                  <FilePreview
                    filePath={previewFile}
                    onClose={() => setPreviewFile(null)}
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <ChatPanel sessionId={activeSessionId} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
