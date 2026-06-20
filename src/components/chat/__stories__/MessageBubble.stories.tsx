import type { Meta, StoryObj } from '@storybook/react'
import { MessageBubble } from '../MessageBubble'
import type { Message } from '@/hooks/useChat'

const meta: Meta<typeof MessageBubble> = {
  title: 'Chat/MessageBubble',
  component: MessageBubble,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof MessageBubble>

const userMessage: Message = {
  id: '1',
  role: 'user',
  content: '请帮我解释一下这段代码的作用',
  status: 'done',
  timestamp: Date.now() - 60000,
}

const assistantMessage: Message = {
  id: '2',
  role: 'assistant',
  content:
    '这段代码实现了一个简单的 HTTP 服务器，监听 3000 端口并返回 "Hello World"。\n\n```javascript\nconst http = require("http");\nconst server = http.createServer((req, res) => {\n  res.end("Hello World");\n});\nserver.listen(3000);\n```',
  status: 'done',
  timestamp: Date.now(),
}

const streamingMessage: Message = {
  id: '3',
  role: 'assistant',
  content: '这是一个',
  status: 'streaming',
  timestamp: Date.now(),
}

const errorMessage: Message = {
  id: '4',
  role: 'assistant',
  content: '连接超时，请检查网络',
  status: 'error',
  timestamp: Date.now(),
}

export const User: Story = {
  args: { message: userMessage },
}

export const Assistant: Story = {
  args: { message: assistantMessage },
}

export const Streaming: Story = {
  args: { message: streamingMessage },
}

export const Error: Story = {
  args: { message: errorMessage },
}
