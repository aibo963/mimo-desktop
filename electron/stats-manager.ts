import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'

const execAsync = promisify(exec)

function getMimoPath(): string {
  const npmGlobalPath = process.env.APPDATA
    ? path.join(process.env.APPDATA, 'npm', 'mimo.cmd')
    : 'mimo'
  
  if (fs.existsSync(npmGlobalPath)) {
    return npmGlobalPath
  }
  return 'mimo'
}

export interface Stats {
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

export class StatsManager {
  private mimoPath: string

  constructor() {
    this.mimoPath = getMimoPath()
  }

  async getOverview(): Promise<Stats> {
    try {
      const { stdout } = await execAsync(`${this.mimoPath} stats --days 30`, {
        timeout: 15000,
      })
      return this.parseStatsOutput(stdout)
    } catch (error: any) {
      console.error('Failed to get stats:', error.message)
      return this.getEmptyStats()
    }
  }

  private parseStatsOutput(output: string): Stats {
    const lines = output.split('\n')
    const stats: Stats = this.getEmptyStats()

    for (const line of lines) {
      const trimmed = line.trim()
      
      if (trimmed.startsWith('Sessions')) {
        const match = trimmed.match(/(\d+)\s*$/)
        if (match) stats.sessionCount = parseInt(match[1])
      }
      if (trimmed.startsWith('Total Cost')) {
        const match = trimmed.match(/\$([0-9.]+)/)
        if (match) stats.totalCost = parseFloat(match[1])
      }
      if (trimmed.startsWith('Input')) {
        const match = trimmed.match(/([0-9.]+)([MKT])/)
        if (match) {
          const val = parseFloat(match[1])
          const unit = match[2]
          stats.inputTokens = unit === 'M' ? Math.round(val * 1000000) : 
                              unit === 'K' ? Math.round(val * 1000) : val
        }
      }
      if (trimmed.startsWith('Output')) {
        const match = trimmed.match(/([0-9.]+)([MKT])/)
        if (match) {
          const val = parseFloat(match[1])
          const unit = match[2]
          stats.outputTokens = unit === 'M' ? Math.round(val * 1000000) : 
                               unit === 'K' ? Math.round(val * 1000) : val
        }
      }
      if (trimmed.startsWith('Cache Read')) {
        const match = trimmed.match(/([0-9.]+)([MKT])/)
        if (match) {
          const val = parseFloat(match[1])
          const unit = match[2]
          stats.totalTokens = unit === 'M' ? Math.round(val * 1000000) : 
                              unit === 'K' ? Math.round(val * 1000) : val
        }
      }
    }

    stats.todayTokens = stats.inputTokens + stats.outputTokens
    stats.todayCost = stats.totalCost

    return stats
  }

  private getEmptyStats(): Stats {
    return {
      totalTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalCost: 0,
      sessionCount: 0,
      todayTokens: 0,
      todayCost: 0,
      byModel: [],
      byDate: [],
    }
  }
}
