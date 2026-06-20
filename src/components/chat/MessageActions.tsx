import {
  Copy,
  Check,
  RefreshCw,
  Star,
  Volume2,
  VolumeX,
  Pencil,
  Wrench,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface MessageActionsProps {
  isUser: boolean
  copied: boolean
  saved: boolean
  isPlaying: boolean
  isGenerating: boolean
  onCopy: () => void
  onSave?: () => void
  onTTS?: () => void
  onRegenerate?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onSaveAsSkill?: () => void
}

export function MessageActions({
  isUser,
  copied,
  saved,
  isPlaying,
  isGenerating,
  onCopy,
  onSave,
  onTTS,
  onRegenerate,
  onEdit,
  onDelete,
  onSaveAsSkill,
}: MessageActionsProps) {
  if (isUser) {
    return (
      <>
        <button
          onClick={onCopy}
          className="absolute -left-8 top-1 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-all"
          title="复制"
          aria-label="复制消息"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
        {onSaveAsSkill && (
          <button
            onClick={onSaveAsSkill}
            className="absolute -left-12 top-1 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-all"
            title="保存为技能"
            aria-label="保存为技能"
          >
            <Wrench className="w-3.5 h-3.5" />
          </button>
        )}
        {onEdit && (
          <button
            onClick={onEdit}
            className="absolute -left-16 top-1 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-all"
            title="编辑"
            aria-label="编辑消息"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            className="absolute -left-20 top-1 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-zinc-700 text-zinc-500 hover:text-red-400 transition-all"
            title="删除"
            aria-label="删除消息"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </>
    )
  }

  return (
    <>
      {onSave && (
        <button
          onClick={onSave}
          className="absolute -right-8 top-1 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-all"
          title={saved ? '已收藏' : '收藏'}
          aria-label={saved ? '已收藏' : '收藏消息'}
        >
          {saved ? (
            <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
          ) : (
            <Star className="w-3.5 h-3.5" />
          )}
        </button>
      )}
      <button
        onClick={onCopy}
        className="absolute -right-12 top-1 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-all"
        title="复制"
        aria-label="复制消息"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
      </button>
      {onTTS && (
        <button
          onClick={onTTS}
          disabled={isGenerating}
          className={cn(
            'absolute -right-16 top-1 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-zinc-700 transition-all',
            isPlaying ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'
          )}
          title={isPlaying ? '停止播放' : '语音合成'}
          aria-label={isPlaying ? '停止播放' : '语音合成'}
        >
          {isPlaying ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>
      )}
      {onRegenerate && (
        <button
          onClick={onRegenerate}
          className="absolute -right-20 top-1 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-all"
          title="重新生成"
          aria-label="重新生成回复"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      )}
      {onDelete && (
        <button
          onClick={onDelete}
          className="absolute -right-24 top-1 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-zinc-700 text-zinc-500 hover:text-red-400 transition-all"
          title="删除"
          aria-label="删除消息"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </>
  )
}
