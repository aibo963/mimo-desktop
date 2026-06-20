import { FileText } from 'lucide-react'

interface Attachment {
  name: string
  type: string
  size: number
  dataUrl?: string
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function AttachmentList({ attachments }: { attachments: Attachment[] }) {
  if (!attachments || attachments.length === 0) return null

  return (
    <div className="mt-2 pt-2 border-t border-zinc-700">
      {attachments.map((attachment, index) => (
        <div key={`${attachment.name}-${index}`}>
          {attachment.dataUrl && attachment.type.startsWith('image/') ? (
            <div className="mt-2">
              <img
                src={attachment.dataUrl}
                alt={attachment.name}
                className="max-w-[200px] max-h-[150px] rounded-lg object-cover border border-zinc-700"
              />
              <p className="text-[10px] text-zinc-500 mt-1">{attachment.name}</p>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-2 px-2 py-1.5 bg-zinc-700/50 rounded-lg">
              <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-zinc-300 truncate">{attachment.name}</p>
                <p className="text-[10px] text-zinc-500">{formatFileSize(attachment.size)}</p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
