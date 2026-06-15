export interface ToolCall {
  id: string
  name: string
  input: Record<string, any>
  output?: string
  status: 'pending' | 'running' | 'done' | 'error' | 'denied'
  permission?: 'pending' | 'approved' | 'denied'
  duration?: number
  timestamp?: number
}

export interface ToolCallCardProps {
  tool: ToolCall
  onApprove?: (id: string) => void
  onDeny?: (id: string) => void
}

export type ToolType = 
  | 'bash'
  | 'read'
  | 'write'
  | 'edit'
  | 'grep'
  | 'glob'
  | 'webfetch'
  | 'websearch'
  | 'actor'
  | 'skill'
  | 'memory'
  | 'task'
  | 'unknown'
