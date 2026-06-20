import type { Meta, StoryObj } from '@storybook/react'
import { ToolCallCard } from '../ToolCallCard'
import type { ToolCall } from '@/types/tool'

const meta: Meta<typeof ToolCallCard> = {
  title: 'Tools/ToolCallCard',
  component: ToolCallCard,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof ToolCallCard>

const bashTool: ToolCall = {
  id: 'tc1',
  name: 'bash',
  input: { command: 'ls -la' },
  output:
    'total 48\ndrwxr-xr-x  6 user  staff  192 Jun 20 19:00 .\ndrwxr-xr-x  3 user  staff   96 Jun 20 19:00 ..',
  status: 'done',
  duration: 120,
}

const readTool: ToolCall = {
  id: 'tc2',
  name: 'read',
  input: { filePath: '/src/App.tsx' },
  output:
    'import React from "react";\n\nexport default function App() {\n  return <div>Hello</div>;\n}',
  status: 'done',
}

const runningTool: ToolCall = {
  id: 'tc3',
  name: 'bash',
  input: { command: 'npm test' },
  status: 'running',
}

const errorTool: ToolCall = {
  id: 'tc4',
  name: 'edit',
  input: { filePath: '/src/test.ts', oldString: 'foo', newString: 'bar' },
  output: 'File not found',
  status: 'error',
}

export const BashDone: Story = { args: { tool: bashTool } }
export const ReadFile: Story = { args: { tool: readTool } }
export const Running: Story = { args: { tool: runningTool } }
export const Error: Story = { args: { tool: errorTool } }
