import path from 'path'
import fs from 'fs'
import { exec } from 'child_process'
import { promisify } from 'util'
import { debug } from '../debug'

const execAsync = promisify(exec)

let cachedPath: string | null = null
let cachedSpawnConfig: { command: string; args: string[] } | null = null

export function getMimoPath(): string {
  if (cachedPath) return cachedPath

  const npmGlobalPath = process.env.APPDATA
    ? path.join(process.env.APPDATA, 'npm', 'mimo.cmd')
    : 'mimo'

  cachedPath = fs.existsSync(npmGlobalPath) ? npmGlobalPath : 'mimo'
  return cachedPath
}

function findNodeExe(): string {
  const candidates = [
    path.join(process.env.ProgramFiles || '', 'nodejs', 'node.exe'),
    path.join(process.env['ProgramFiles(x86)'] || '', 'nodejs', 'node.exe'),
    path.join(process.env.APPDATA || '', '..', 'Local', 'Programs', 'nodejs', 'node.exe'),
    'D:\\nodejs\\node.exe',
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }
  return 'node'
}

export function getMimoSpawnArgs(): { command: string; args: string[] } {
  if (cachedSpawnConfig) return cachedSpawnConfig

  const mimoCmd = getMimoPath()
  if (mimoCmd.endsWith('.cmd') && fs.existsSync(mimoCmd)) {
    const realScript = path.join(
      path.dirname(mimoCmd),
      'node_modules',
      '@mimo-ai',
      'cli',
      'bin',
      'mimo'
    )
    if (fs.existsSync(realScript)) {
      const nodeExe = findNodeExe()
      debug.log(`[mimo-path] node=${nodeExe} script=${realScript}`)
      cachedSpawnConfig = { command: nodeExe, args: [realScript] }
      return cachedSpawnConfig
    }
  }

  cachedSpawnConfig = { command: mimoCmd, args: [] }
  return cachedSpawnConfig
}

export async function execMimo(args: string, timeout = 10000): Promise<string> {
  const spawnArgs = getMimoSpawnArgs()
  const cmd = spawnArgs.command
  const fullArgs = [...spawnArgs.args, ...args.split(' ')]
  const quoted = fullArgs.map((a) => `"${a}"`).join(' ')
  debug.log(`[execMimo] ${cmd} ${quoted}`)
  const { stdout } = await execAsync(`${cmd} ${quoted}`, { timeout })
  debug.log(`[execMimo] stdout:`, stdout?.substring(0, 500))
  return stdout
}
