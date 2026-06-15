import { useState, useEffect } from 'react'
import { useMimo } from '@/hooks/useMimo'
import { TokenChart } from './TokenChart'
import { CostChart } from './CostChart'
import {
  Coins,
  Cpu,
  MessageSquare,
  Zap,
  RefreshCw,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Stats {
  totalTokens: number
  inputTokens: number
  outputTokens: number
  totalCost: number
  sessionCount: number
  todayTokens: number
  todayCost: number
  byModel: { model: string; tokens: number; cost: number }[]
  byDate: { date: string; tokens: number; cost: number }[]
}

export function StatsDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(false)
  const { invoke } = useMimo()

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    setLoading(true)
    try {
      const result = await invoke({ action: 'get_stats' })
      if (result && typeof result === 'object') {
        setStats(result)
      }
    } catch (error) {
      console.error('Failed to load stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toLocaleString()
  }

  const formatCost = (cost: number) => `$${cost.toFixed(4)}`

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-zinc-400" />
          <span className="text-sm font-medium text-zinc-300">统计</span>
        </div>
        <button
          onClick={loadStats}
          disabled={loading}
          className="p-1 rounded hover:bg-zinc-800 text-zinc-500"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
        </button>
      </div>

      <div className="flex-1 overflow-auto px-3 pb-3 space-y-3">
        {loading && !stats ? (
          <div className="text-center text-zinc-600 text-xs py-8">加载中...</div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <MiniStat icon={Cpu} label="Tokens" value={formatNumber(stats.totalTokens)} />
              <MiniStat icon={Coins} label="费用" value={formatCost(stats.totalCost)} />
              <MiniStat icon={MessageSquare} label="会话" value={stats.sessionCount.toString()} />
              <MiniStat icon={Zap} label="今日" value={formatNumber(stats.todayTokens)} />
            </div>

            <div className="bg-zinc-900 rounded-lg p-3">
              <p className="text-[10px] text-zinc-500 mb-2">Token 趋势</p>
              <TokenChart data={stats.byDate} />
            </div>

            <div className="bg-zinc-900 rounded-lg p-3">
              <p className="text-[10px] text-zinc-500 mb-2">费用分布</p>
              <CostChart data={stats.byModel} />
            </div>

            {stats.byModel.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] text-zinc-500 px-1">模型详情</p>
                {stats.byModel.map((m, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-1.5 px-2 rounded text-xs"
                  >
                    <span className="text-zinc-400 truncate">
                      {m.model.split('/').pop()}
                    </span>
                    <span className="text-zinc-500 ml-2 shrink-0">
                      {formatNumber(m.tokens)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-zinc-600 text-xs py-8">
            无法加载数据
          </div>
        )}
      </div>
    </div>
  )
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: any
  label: string
  value: string
}) {
  return (
    <div className="bg-zinc-900 rounded-lg p-2">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3 h-3 text-zinc-500" />
        <span className="text-[10px] text-zinc-500">{label}</span>
      </div>
      <p className="text-sm font-semibold text-zinc-200">{value}</p>
    </div>
  )
}
