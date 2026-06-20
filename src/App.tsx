import { useState, useCallback, useRef, lazy, Suspense } from 'react'
import { ConfirmDialog } from './components/ConfirmDialog'
import { ChatPanel } from './components/chat/ChatPanel'
import { TabBar } from './components/chat/TabBar'
import { SearchPanel } from './components/chat/SearchPanel'
import { HistoryPanel } from './components/chat/HistoryPanel'
import { SettingsPanel } from './components/settings/SettingsPanel'
import { FileTreePanel } from './components/file-tree/FileTreePanel'
import { FilePreview } from './components/file-tree/FilePreview'
import { SnippetPanel } from './components/snippets/SnippetPanel'
import { OnboardingWizard, shouldShowOnboarding } from './components/onboarding/OnboardingWizard'

const MemoryPanel = lazy(() =>
  import('./components/memory/MemoryPanel').then((m) => ({ default: m.MemoryPanel }))
)
const SkillPanel = lazy(() =>
  import('./components/skills/SkillPanel').then((m) => ({ default: m.SkillPanel }))
)
const DiagnosticsPanel = lazy(() =>
  import('./components/lsp/DiagnosticsPanel').then((m) => ({ default: m.DiagnosticsPanel }))
)
const MCPPanel = lazy(() =>
  import('./components/mcp/MCPPanel').then((m) => ({ default: m.MCPPanel }))
)
const TTSPanel = lazy(() =>
  import('./components/tts/TTSPanel').then((m) => ({ default: m.TTSPanel }))
)
const ImagePanel = lazy(() =>
  import('./components/image/ImagePanel').then((m) => ({ default: m.ImagePanel }))
)
import { useTabStore } from './stores/tabStore'
import { useThemeStore } from './stores/themeStore'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import {
  Settings,
  FolderTree,
  BookOpen,
  Volume2,
  Search,
  Brain,
  Wrench,
  AlertCircle,
  History,
  Minus,
  Square,
  X,
  Plug,
  Paintbrush,
} from 'lucide-react'
import { cn } from './lib/utils'
import { ToastContainer } from './components/Toast'

function getLanguageFromFile(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || ''
  const langMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    py: 'python',
    json: 'json',
    md: 'markdown',
    css: 'css',
    html: 'html',
  }
  return langMap[ext] || 'plaintext'
}

function TitleBar() {
  return (
    <div className="h-8 bg-zinc-950 dark:bg-zinc-950 bg-gray-100 flex items-center justify-between select-none drag-region">
      <div className="flex-1 flex items-center justify-center">
        <span className="text-xs text-zinc-500 dark:text-zinc-500 text-gray-500">Mimo Desktop</span>
      </div>
      <div className="flex no-drag">
        <button
          onClick={() => window.electronAPI?.invoke('window:minimize')}
          className="w-10 h-8 flex items-center justify-center hover:bg-zinc-800 dark:hover:bg-zinc-800 hover:bg-gray-200 text-zinc-400 dark:text-zinc-400 text-gray-500"
          aria-label="最小化"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => window.electronAPI?.invoke('window:maximize')}
          className="w-10 h-8 flex items-center justify-center hover:bg-zinc-800 dark:hover:bg-zinc-800 hover:bg-gray-200 text-zinc-400 dark:text-zinc-400 text-gray-500"
          aria-label="最大化"
        >
          <Square className="w-3 h-3" />
        </button>
        <button
          onClick={() => window.electronAPI?.invoke('window:close')}
          className="w-10 h-8 flex items-center justify-center hover:bg-red-600 text-zinc-400 hover:text-white"
          aria-label="关闭"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

type RightPanel =
  | 'history'
  | 'snippets'
  | 'search'
  | 'memory'
  | 'skills'
  | 'diagnostics'
  | 'mcp'
  | 'tts'
  | 'image'
  | 'settings'

export default function App() {
  const [showFileTree, setShowFileTree] = useState(false)
  const [activePanel, setActivePanel] = useState<RightPanel | null>(null)
  const [previewFile, setPreviewFile] = useState<string | null>(null)
  const [highlightMessageId, setHighlightMessageId] = useState<string | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(shouldShowOnboarding())
  const { setActiveTab } = useTabStore()

  const togglePanel = useCallback((panel: RightPanel) => {
    setActivePanel((prev) => (prev === panel ? null : panel))
  }, [])

  const handleFileSelect = useCallback((path: string) => {
    setPreviewFile(path)
  }, [])

  const themeStore = useThemeStore()
  const clearChatRef = useRef<(() => void) | null>(null)

  useKeyboardShortcuts({
    onClear: () => {
      clearChatRef.current?.()
    },
    onTheme: () => themeStore.toggle(),
    onSearch: () => togglePanel('search'),
    onSettings: () => togglePanel('settings'),
  })

  const handleJumpToMessage = useCallback(
    (tabId: string, messageId: string) => {
      setActiveTab(tabId)
      setActivePanel(null)
      setHighlightMessageId(messageId)
      setTimeout(() => {
        const el = document.getElementById(`message-${messageId}`)
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
      setTimeout(() => setHighlightMessageId(null), 2000)
    },
    [setActiveTab]
  )

  const navItems = [
    {
      id: 'files',
      icon: FolderTree,
      label: '文件',
      active: showFileTree,
      onClick: () => setShowFileTree((prev) => !prev),
    },
    {
      id: 'history',
      icon: History,
      label: '历史',
      active: activePanel === 'history',
      onClick: () => togglePanel('history'),
    },
    {
      id: 'snippets',
      icon: BookOpen,
      label: '收藏',
      active: activePanel === 'snippets',
      onClick: () => togglePanel('snippets'),
    },
    {
      id: 'search',
      icon: Search,
      label: '搜索',
      active: activePanel === 'search',
      onClick: () => togglePanel('search'),
    },
    {
      id: 'memory',
      icon: Brain,
      label: '记忆',
      active: activePanel === 'memory',
      onClick: () => togglePanel('memory'),
    },
    {
      id: 'skills',
      icon: Wrench,
      label: '技能',
      active: activePanel === 'skills',
      onClick: () => togglePanel('skills'),
    },
    {
      id: 'diagnostics',
      icon: AlertCircle,
      label: '诊断',
      active: activePanel === 'diagnostics',
      onClick: () => togglePanel('diagnostics'),
    },
    {
      id: 'mcp',
      icon: Plug,
      label: 'MCP',
      active: activePanel === 'mcp',
      onClick: () => togglePanel('mcp'),
    },
    {
      id: 'tts',
      icon: Volume2,
      label: '语音',
      active: activePanel === 'tts',
      onClick: () => togglePanel('tts'),
    },
    {
      id: 'image',
      icon: Paintbrush,
      label: '绘图',
      active: activePanel === 'image',
      onClick: () => togglePanel('image'),
    },
    {
      id: 'settings',
      icon: Settings,
      label: '设置',
      active: activePanel === 'settings',
      onClick: () => {
        togglePanel('settings')
        setShowFileTree(false)
      },
    },
  ]

  const closePanel = useCallback(() => setActivePanel(null), [])

  return (
    <div className="h-screen flex flex-col bg-zinc-950 dark:bg-zinc-950 bg-white text-zinc-900 dark:text-white">
      {showOnboarding && <OnboardingWizard onComplete={() => setShowOnboarding(false)} />}
      <TitleBar />
      <ToastContainer />
      <ConfirmDialog />
      <div className="flex-1 flex min-h-0">
        <div className="w-14 border-r border-zinc-800/80 dark:border-zinc-800/80 border-gray-200 flex flex-col items-center py-3 gap-1 bg-zinc-950 dark:bg-zinc-950 bg-white shrink-0">
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
              aria-label={item.label}
            >
              <item.icon className="w-4 h-4" />
              <span className="text-[9px]">{item.label}</span>
            </button>
          ))}
        </div>

        {showFileTree && (
          <div className="w-56 border-r border-zinc-800/80 dark:border-zinc-800/80 border-gray-200 flex flex-col bg-zinc-950 dark:bg-zinc-950 bg-white shrink-0">
            <FileTreePanel onFileSelect={handleFileSelect} />
          </div>
        )}

        <div className="flex-1 flex min-w-0 flex-col">
          <TabBar />
          <div className="flex-1 flex min-w-0 min-h-0">
            {previewFile && (
              <div className="w-[400px] border-r border-zinc-800/80 dark:border-zinc-800/80 border-gray-200 shrink-0">
                <FilePreview filePath={previewFile} onClose={() => setPreviewFile(null)} />
              </div>
            )}
            <div className="flex-1 min-w-0 min-h-0">
              <ChatPanel
                highlightMessageId={highlightMessageId}
                clearChatRef={clearChatRef}
                onSearch={() => setActivePanel('search')}
                onHistory={() => setActivePanel('history')}
                onSettings={() => setActivePanel('settings')}
              />
            </div>
            {activePanel === 'history' && (
              <div className="w-[350px] border-l border-zinc-800/80 dark:border-zinc-800/80 border-gray-200 shrink-0">
                <HistoryPanel onClose={closePanel} />
              </div>
            )}
            {activePanel === 'memory' && (
              <div className="w-[350px] border-l border-zinc-800/80 dark:border-zinc-800/80 border-gray-200 shrink-0">
                <Suspense fallback={null}>
                  <MemoryPanel onClose={closePanel} />
                </Suspense>
              </div>
            )}
            {activePanel === 'skills' && (
              <div className="w-[350px] border-l border-zinc-800/80 dark:border-zinc-800/80 border-gray-200 shrink-0">
                <Suspense fallback={null}>
                  <SkillPanel onClose={closePanel} />
                </Suspense>
              </div>
            )}
            {activePanel === 'diagnostics' && (
              <div className="w-[350px] border-l border-zinc-800/80 dark:border-zinc-800/80 border-gray-200 shrink-0">
                <Suspense fallback={null}>
                  <DiagnosticsPanel
                    filePath={previewFile || undefined}
                    language={previewFile ? getLanguageFromFile(previewFile) : undefined}
                    onClose={closePanel}
                  />
                </Suspense>
              </div>
            )}
            {activePanel === 'mcp' && (
              <div className="w-[400px] border-l border-zinc-800/80 dark:border-zinc-800/80 border-gray-200 shrink-0">
                <Suspense fallback={null}>
                  <MCPPanel onClose={closePanel} />
                </Suspense>
              </div>
            )}
            {activePanel === 'snippets' && (
              <div className="w-[350px] border-l border-zinc-800/80 dark:border-zinc-800/80 border-gray-200 shrink-0">
                <SnippetPanel onClose={closePanel} />
              </div>
            )}
            {activePanel === 'search' && (
              <div className="w-[400px] border-l border-zinc-800/80 dark:border-zinc-800/80 border-gray-200 shrink-0">
                <SearchPanel onClose={closePanel} onJumpToMessage={handleJumpToMessage} />
              </div>
            )}
            {activePanel === 'tts' && (
              <div className="w-[350px] border-l border-zinc-800/80 dark:border-zinc-800/80 border-gray-200 shrink-0">
                <Suspense fallback={null}>
                  <TTSPanel />
                </Suspense>
              </div>
            )}
            {activePanel === 'image' && (
              <div className="w-[700px] border-l border-zinc-800/80 dark:border-zinc-800/80 border-gray-200 shrink-0">
                <Suspense fallback={null}>
                  <ImagePanel />
                </Suspense>
              </div>
            )}
            {activePanel === 'settings' && (
              <div className="w-[350px] border-l border-zinc-800/80 dark:border-zinc-800/80 border-gray-200 shrink-0">
                <SettingsPanel onClose={closePanel} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
