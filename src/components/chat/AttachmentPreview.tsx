import { X, FileText } from 'lucide-react'

interface Attachment {
  name: string
  type: string
  size: number
  dataUrl?: string
}

interface AttachmentPreviewProps {
  attachments: Attachment[]
  onRemove: (index: number) => void
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function AttachmentPreview({ attachments, onRemove }: AttachmentPreviewProps) {
  if (attachments.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 mb-2">
      {attachments.map((attachment, index) => (
        <div
          key={`${attachment.name}-${index}`}
          className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 max-w-[200px]"
        >
          {attachment.dataUrl && attachment.type.startsWith('image/') ? (
            <img
              src={attachment.dataUrl}
              alt={attachment.name}
              className="w-8 h-8 rounded object-cover shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded bg-zinc-700 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-zinc-400" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs text-zinc-300 truncate">{attachment.name}</p>
            <p className="text-[10px] text-zinc-500">{formatFileSize(attachment.size)}</p>
          </div>
          <button
            onClick={() => onRemove(index)}
            className="p-0.5 rounded hover:bg-zinc-600 transition-colors shrink-0"
            title="移除"
            aria-label={`移除 ${attachment.name}`}
          >
            <X className="w-3 h-3 text-zinc-400" />
          </button>
        </div>
      ))}
    </div>
  )
}
