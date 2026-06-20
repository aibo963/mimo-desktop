import type { Meta, StoryObj } from '@storybook/react'
import { CodeBlock } from '../CodeBlock'

const meta: Meta<typeof CodeBlock> = {
  title: 'Chat/CodeBlock',
  component: CodeBlock,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof CodeBlock>

export const JavaScript: Story = {
  args: {
    language: 'javascript',
    value: `function greet(name) {\n  console.log(\`Hello, \${name}!\`);\n  return { name, timestamp: Date.now() };\n}\n\ngreet("World");`,
  },
}

export const TypeScript: Story = {
  args: {
    language: 'typescript',
    value: `interface User {\n  id: string;\n  name: string;\n  email: string;\n}\n\nfunction getUser(id: string): User | null {\n  return users.find(u => u.id === id) || null;\n}`,
  },
}

export const Python: Story = {
  args: {
    language: 'python',
    value: `def fibonacci(n: int) -> list[int]:\n    fib = [0, 1]\n    for i in range(2, n):\n        fib.append(fib[i-1] + fib[i-2])\n    return fib[:n]\n\nprint(fibonacci(10))`,
  },
}

export const LongCode: Story = {
  args: {
    language: 'typescript',
    value: Array.from({ length: 30 }, (_, i) => `const line${i} = "Line ${i} content";`).join('\n'),
  },
}
