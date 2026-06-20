import { useState, useCallback, useRef } from 'react'
import { useMimo } from './useMimo'
import { useToastStore } from '@/stores/toastStore'
import { debug } from '@/lib/debug'

export interface TTSPlayOptions {
  voice?: string
  model?: string
  style?: string
  voiceDescription?: string
  audioBase64?: string
  audioMimeType?: string
  format?: string
}

export function useTTS() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const { invoke } = useMimo()
  const addToast = useToastStore((state) => state.addToast)

  const play = useCallback(
    async (text: string, options?: TTSPlayOptions) => {
      if (isPlaying) {
        stop()
        return
      }

      if (!text.trim()) return

      setIsGenerating(true)
      try {
        const result = await invoke({
          action: 'tts_synthesize',
          text,
          model: options?.model,
          voice: options?.voice,
          format: options?.format,
          style: options?.style,
          voiceDescription: options?.voiceDescription,
          audioBase64: options?.audioBase64,
          audioMimeType: options?.audioMimeType,
        })
        if (result?.error) {
          addToast(`合成失败: ${result.error}`, 'error')
          return
        }
        if (result?.audioData) {
          const format = result.format || 'mp3'
          const mime =
            format === 'wav' ? 'audio/wav' : format === 'pcm16' ? 'audio/pcm' : 'audio/mpeg'
          const audio = new Audio(`data:${mime};base64,${result.audioData}`)
          audioRef.current = audio

          audio.onended = () => {
            setIsPlaying(false)
            audioRef.current = null
          }

          audio.onerror = () => {
            setIsPlaying(false)
            audioRef.current = null
            addToast('音频播放失败', 'error')
          }

          await audio.play()
          setIsPlaying(true)
        }
      } catch (err: any) {
        debug.error('TTS failed:', err)
        addToast(`合成失败: ${err.message}`, 'error')
      } finally {
        setIsGenerating(false)
      }
    },
    [invoke, isPlaying, addToast]
  )

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }
    setIsPlaying(false)
  }, [])

  return { play, stop, isPlaying, isGenerating }
}
