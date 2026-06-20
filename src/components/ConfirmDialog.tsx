import { useConfirmStore } from '@/stores/confirmStore'
import { cn } from '@/lib/utils'

export function ConfirmDialog() {
  const { open, message, title, confirmText, cancelText, danger, closeConfirm } = useConfirmStore()

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => closeConfirm(false)}
      />
      <div className="relative w-full max-w-sm mx-4 bg-zinc-900 rounded-xl border border-zinc-800 shadow-2xl overflow-hidden">
        {title && (
          <div className="px-6 pt-5 pb-0">
            <h3 className="text-sm font-medium text-zinc-200">{title}</h3>
          </div>
        )}
        <div className="p-6">
          <p className="text-sm text-zinc-400">{message}</p>
        </div>
        <div className="flex gap-2 px-6 pb-5 justify-end">
          <button
            onClick={() => closeConfirm(false)}
            className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            {cancelText || '取消'}
          </button>
          <button
            onClick={() => closeConfirm(true)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              danger
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            )}
          >
            {confirmText || '确定'}
          </button>
        </div>
      </div>
    </div>
  )
}
