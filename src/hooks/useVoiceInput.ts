import { useState, useCallback, useRef, useEffect } from 'react'
import { debug } from '@/lib/debug'

interface UseVoiceInputOptions {
  onResult?: (text: string) => void
  onError?: (error: string) => void
  continuous?: boolean
  language?: string
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message: string
}

declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

export function useVoiceInput(options?: UseVoiceInputOptions) {
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState('')
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    setIsSupported(!!SpeechRecognition)
  }, [])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsListening(false)
    setInterimTranscript('')
  }, [])

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return

    stopListening()

    const recognition = new SpeechRecognition()
    recognition.continuous = options?.continuous ?? true
    recognition.interimResults = true
    recognition.lang = options?.language ?? 'zh-CN'
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setIsListening(true)
      setInterimTranscript('')
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = ''
      let final = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          final += transcript
        } else {
          interim += transcript
        }
      }

      setInterimTranscript(interim)

      if (final) {
        options?.onResult?.(final)
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      debug.error('Speech recognition error:', event.error)
      const errorMessages: Record<string, string> = {
        network: '语音识别需要网络连接',
        'not-allowed': '麦克风权限被拒绝',
        'audio-capture': '未检测到麦克风设备',
        'service-not-allowed': '语音识别服务不可用',
        'no-speech': '未检测到语音输入',
      }
      const message = errorMessages[event.error] || `语音识别错误: ${event.error}`
      if (event.error !== 'no-speech') {
        options?.onError?.(message)
        setIsListening(false)
        setInterimTranscript('')
      }
    }

    recognition.onend = () => {
      setIsListening(false)
      setInterimTranscript('')
      recognitionRef.current = null
    }

    recognitionRef.current = recognition

    try {
      recognition.start()
    } catch (e) {
      debug.error('Failed to start speech recognition:', e)
    }
  }, [options, stopListening])

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [isListening, startListening, stopListening])

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
    }
  }, [])

  return {
    isListening,
    isSupported,
    interimTranscript,
    startListening,
    stopListening,
    toggleListening,
  }
}
