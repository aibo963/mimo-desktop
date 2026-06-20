import { useState, useEffect, useCallback } from 'react'
import { AlertCircle, AlertTriangle, Info, X, RefreshCw } from 'lucide-react'
import { useMimo } from '@/hooks/useMimo'
import { cn } from '@/lib/utils'
import { useToastStore } from '@/stores/toastStore'
import { debug } from '@/lib/debug'

interface Diagnostic {
  range: {
    start: { line: number; character: number }
    end: { line: number; character: number }
  }
  severity: 1 | 2 | 3 | 4
  message: string
  source: string
  code?: string
}

interface DiagnosticsPanelProps {
  filePath?: string
  language?: string
  onClose?: () => void
  onGoToLine?: (line: number) => void
}

const SEVERITY_CONFIG: Record<number, { icon: typeof AlertCircle; color: string; label: string }> =
  {
    1: { icon: AlertCircle, color: 'text-red-400', label: '错误' },
    2: { icon: AlertTriangle, color: 'text-amber-400', label: '警告' },
    3: { icon: Info, color: 'text-blue-400', label: '信息' },
    4: { icon: Info, color: 'text-zinc-500', label: '提示' },
  }

export function DiagnosticsPanel({
  filePath,
  language,
  onClose,
  onGoToLine,
}: DiagnosticsPanelProps) {
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { invoke } = useMimo()
  const addToast = useToastStore((state) => state.addToast)
  const [filter, setFilter] = useState<number | null>(null)

  const checkStatus = useCallback(async () => {
    if (!language) return
    try {
      const result = (await invoke({ action: 'lsp_is_running', language })) as { running: boolean }
      setIsRunning(result.running)
    } catch (err) {
      debug.error('[DiagnosticsPanel] Failed to check status:', err)
      addToast('检查 LSP 服务器状态失败', 'error')
    }
  }, [invoke, language])

  const loadDiagnostics = useCallback(async () => {
    if (!filePath) return
    try {
      const result = (await invoke({ action: 'lsp_get_diagnostics', filePath })) as Diagnostic[]
      setDiagnostics(result)
    } catch (err) {
      debug.error('[DiagnosticsPanel] Failed to load diagnostics:', err)
      addToast('加载诊断信息失败', 'error')
    }
  }, [invoke, filePath])

  const startServer = useCallback(async () => {
    if (!language) return
    setIsLoading(true)
    try {
      await invoke({ action: 'lsp_start', language })
      setIsRunning(true)
    } catch (err) {
      debug.error('[DiagnosticsPanel] Failed to start server:', err)
      addToast('启动 LSP 服务器失败', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [invoke, language])

  const stopServer = useCallback(async () => {
    if (!language) return
    try {
      await invoke({ action: 'lsp_stop', language })
      setIsRunning(false)
      setDiagnostics([])
    } catch (err) {
      debug.error('[DiagnosticsPanel] Failed to stop server:', err)
      addToast('停止 LSP 服务器失败', 'error')
    }
  }, [invoke, language])

  useEffect(() => {
    checkStatus()
  }, [checkStatus])

  useEffect(() => {
    if (isRunning && filePath) {
      loadDiagnostics()
    }
  }, [isRunning, filePath, loadDiagnostics])

  const filteredDiagnostics =
    filter !== null ? diagnostics.filter((d) => d.severity === filter) : diagnostics

  const counts = diagnostics.reduce(
    (acc, d) => {
      acc[d.severity] = (acc[d.severity] || 0) + 1
      return acc
    },
    {} as Record<number, number>
  )

  if (!language) {
    return (
      <div className="flex flex-col h-full bg-zinc-900 dark:bg-zinc-900 bg-gray-50">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 dark:border-zinc-800 border-gray-200">
          <span className="text-sm font-medium text-zinc-200">诊断</span>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
          请打开一个代码文件
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-zinc-900 dark:bg-zinc-900 bg-gray-50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 dark:border-zinc-800 border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-200">诊断</span>
          <span
            className={cn(
              'text-[10px] px-1.5 py-0.5 rounded',
              isRunning ? 'bg-emerald-900/30 text-emerald-400' : 'bg-zinc-800 text-zinc-500'
            )}
          >
            {isRunning ? '运行中' : '未启动'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {!isRunning ? (
            <button
              onClick={startServer}
              disabled={isLoading}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 disabled:opacity-30"
              title="启动 LSP 服务器"
            >
              <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
            </button>
          ) : (
            <button
              onClick={stopServer}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300"
              title="停止 LSP 服务器"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isRunning && diagnostics.length > 0 && (
        <div className="px-3 py-2 border-b border-zinc-800/50 dark:border-zinc-800/50 border-gray-200/50">
          <div className="flex gap-1">
            <button
              onClick={() => setFilter(null)}
              className={cn(
                'px-2 py-0.5 text-[10px] rounded transition-colors',
                filter === null ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              全部 ({diagnostics.length})
            </button>
            {[1, 2, 3, 4].map((sev) =>
              counts[sev] ? (
                <button
                  key={sev}
                  onClick={() => setFilter(filter === sev ? null : sev)}
                  className={cn(
                    'px-2 py-0.5 text-[10px] rounded transition-colors',
                    filter === sev
                      ? 'bg-zinc-700 text-zinc-200'
                      : 'text-zinc-500 hover:text-zinc-300'
                  )}
                >
                  {SEVERITY_CONFIG[sev].label} ({counts[sev]})
                </button>
              ) : null
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {!isRunning ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 text-sm space-y-2">
            <p>LSP 服务器未启动</p>
            <button
              onClick={startServer}
              disabled={isLoading}
              className="px-3 py-1.5 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-30"
            >
              {isLoading ? '启动中...' : `启动 ${language} 服务器`}
            </button>
          </div>
        ) : filteredDiagnostics.length === 0 ? (
          <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
            {diagnostics.length === 0 ? '无诊断信息' : '无匹配的诊断'}
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredDiagnostics.map((diag, index) => {
              const config = SEVERITY_CONFIG[diag.severity]
              const Icon = config.icon
              return (
                <button
                  key={index}
                  onClick={() => onGoToLine?.(diag.range.start.line)}
                  className="w-full text-left p-2 rounded-lg hover:bg-zinc-800/50 dark:hover:bg-zinc-800/50 hover:bg-gray-100 transition-colors group"
                >
                  <div className="flex items-start gap-2">
                    <Icon className={cn('w-3.5 h-3.5 shrink-0 mt-0.5', config.color)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-200 dark:text-zinc-200 text-gray-800 line-clamp-2">
                        {diag.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-zinc-600">
                          第 {diag.range.start.line + 1} 行，第 {diag.range.start.character + 1} 列
                        </span>
                        {diag.source && (
                          <span className="text-[10px] text-zinc-600">{diag.source}</span>
                        )}
                        {diag.code && (
                          <span className="text-[10px] text-zinc-600">{diag.code}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
