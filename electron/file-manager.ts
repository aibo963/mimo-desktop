import fs from 'fs'
import path from 'path'
import { debug } from './debug'

export interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'dist-electron',
  '.next',
  '__pycache__',
  '.cache',
  '.vite',
  'coverage',
  '.turbo',
  '.nuxt',
  '.output',
  'build',
  'out',
  'vendor',
  '.gradle',
  '.idea',
  '.vscode',
  'target',
  'bin',
  'obj',
  '.svn',
  '.hg',
  'Pods',
  '.expo',
  '.parcel-cache',
])

const IGNORE_FILES = new Set([
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'bun.lockb',
  'Cargo.lock',
  'Gemfile.lock',
  'composer.lock',
  'poetry.lock',
  '.DS_Store',
  'Thumbs.db',
  'desktop.ini',
])

const BINARY_EXTENSIONS = new Set([
  'exe',
  'dll',
  'so',
  'dylib',
  'bin',
  'obj',
  'o',
  'a',
  'lib',
  'png',
  'jpg',
  'jpeg',
  'gif',
  'bmp',
  'ico',
  'svg',
  'webp',
  'mp3',
  'mp4',
  'avi',
  'mov',
  'wmv',
  'flv',
  'webm',
  'zip',
  'tar',
  'gz',
  'rar',
  '7z',
  'bz2',
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'woff',
  'woff2',
  'ttf',
  'eot',
])

const GENERATED_EXTENSIONS = new Set(['min.js', 'min.css', 'chunk.js', 'chunk.css'])

export class FileManager {
  private mode: 'all' | 'source' = 'source'

  setMode(mode: 'all' | 'source') {
    this.mode = mode
  }

  readDirectory(dirPath: string, depth = 0): FileNode[] {
    if (depth > 4) return []

    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true })
      return entries
        .filter((e) => this.shouldInclude(e.name, e.isDirectory(), depth))
        .sort((a, b) => {
          if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1
          return a.name.localeCompare(b.name)
        })
        .map((entry) => ({
          name: entry.name,
          path: path.join(dirPath, entry.name),
          type: entry.isDirectory() ? ('directory' as const) : ('file' as const),
          children: entry.isDirectory()
            ? this.readDirectory(path.join(dirPath, entry.name), depth + 1)
            : undefined,
        }))
    } catch (error: any) {
      debug.error('Failed to read directory:', error.message)
      return []
    }
  }

  private shouldInclude(name: string, isDir: boolean, depth: number): boolean {
    if (name.startsWith('.') && depth > 0) return false
    if (IGNORE_DIRS.has(name)) return false
    if (IGNORE_FILES.has(name)) return false

    if (this.mode === 'source' && !isDir) {
      const ext = path.extname(name).toLowerCase()
      if (BINARY_EXTENSIONS.has(ext.slice(1))) return false

      const lowerName = name.toLowerCase()
      for (const gen of GENERATED_EXTENSIONS) {
        if (lowerName.endsWith(gen)) return false
      }

      if (lowerName.endsWith('.map')) return false
      if (lowerName.endsWith('.d.ts') && depth > 2) return false
    }

    return true
  }

  readFile(filePath: string): string | null {
    try {
      const stats = fs.statSync(filePath)
      if (stats.size > 1024 * 1024) return null
      return fs.readFileSync(filePath, 'utf-8')
    } catch (error: any) {
      debug.error('Failed to read file:', error.message)
      return null
    }
  }

  getFileExtension(filePath: string): string {
    return path.extname(filePath).slice(1).toLowerCase()
  }

  getLanguage(ext: string): string {
    const langMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      py: 'python',
      json: 'json',
      jsonc: 'json',
      md: 'markdown',
      css: 'css',
      scss: 'scss',
      less: 'less',
      html: 'html',
      xml: 'xml',
      yaml: 'yaml',
      yml: 'yaml',
      toml: 'toml',
      sh: 'shell',
      bash: 'shell',
      zsh: 'shell',
      fish: 'shell',
      sql: 'sql',
      rust: 'rust',
      rs: 'rust',
      go: 'go',
      java: 'java',
      c: 'c',
      cpp: 'cpp',
      cc: 'cpp',
      h: 'c',
      hpp: 'cpp',
      cs: 'csharp',
      rb: 'ruby',
      php: 'php',
      swift: 'swift',
      kt: 'kotlin',
      scala: 'scala',
      r: 'r',
      lua: 'lua',
      vim: 'vim',
      dockerfile: 'dockerfile',
      makefile: 'makefile',
      cmake: 'cmake',
      graphql: 'graphql',
      gql: 'graphql',
      prisma: 'prisma',
      proto: 'protobuf',
      tf: 'hcl',
      vue: 'vue',
      svelte: 'svelte',
    }
    return langMap[ext] || 'plaintext'
  }
}
