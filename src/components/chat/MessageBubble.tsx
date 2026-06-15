import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CodeBlock } from './CodeBlock'
import { ToolCallCard } from '../tools/ToolCallCard'
import { Message } from '@/hooks/useChat'
import { cn } from '@/lib/utils'

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex gap-3 px-4 py-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-sm font-bold shrink-0">
          M
        </div>
      )}
      <div
        className={cn(
          'max-w-[80%] rounded-xl px-4 py-3',
          isUser ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-100',
          message.status === 'error' && 'border border-red-500/50'
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '')
                  const isInline = !match && !String(children).includes('\n')

                  if (isInline) {
                    return (
                      <code
                        className="bg-zinc-700 px-1.5 py-0.5 rounded text-sm"
                        {...props}
                      >
                        {children}
                      </code>
                    )
                  }

                  return (
                    <CodeBlock
                      language={match?.[1] || 'text'}
                      value={String(children).replace(/\n$/, '')}
                    />
                  )
                },
                p({ children }) {
                  return <p className="mb-2 last:mb-0">{children}</p>
                },
                ul({ children }) {
                  return <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
                },
                ol({ children }) {
                  return <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
                },
                a({ href, children }) {
                  return (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:underline"
                    >
                      {children}
                    </a>
                  )
                },
                h1({ children }) {
                  return <h1 className="text-xl font-bold mb-2 mt-4">{children}</h1>
                },
                h2({ children }) {
                  return <h2 className="text-lg font-bold mb-2 mt-3">{children}</h2>
                },
                h3({ children }) {
                  return <h3 className="text-base font-bold mb-2 mt-2">{children}</h3>
                },
                blockquote({ children }) {
                  return (
                    <blockquote className="border-l-4 border-zinc-600 pl-4 italic text-zinc-400 my-2">
                      {children}
                    </blockquote>
                  )
                },
                table({ children }) {
                  return (
                    <div className="overflow-x-auto my-2">
                      <table className="min-w-full border border-zinc-700">{children}</table>
                    </div>
                  )
                },
                th({ children }) {
                  return (
                    <th className="border border-zinc-700 px-3 py-2 bg-zinc-900 text-left">
                      {children}
                    </th>
                  )
                },
                td({ children }) {
                  return (
                    <td className="border border-zinc-700 px-3 py-2">{children}</td>
                  )
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-3 pt-3 border-t border-zinc-700">
            {message.toolCalls.map(tc => (
              <ToolCallCard key={tc.id} tool={tc} />
            ))}
          </div>
        )}

        {message.status === 'streaming' && (
          <span className="inline-block w-2 h-4 bg-zinc-400 animate-pulse ml-1" />
        )}
      </div>
    </div>
  )
}
