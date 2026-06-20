import https from 'https'
import http from 'http'
import { debug } from './debug'

export type TTSModel = 'mimo-v2.5-tts' | 'mimo-v2.5-tts-voicedesign' | 'mimo-v2.5-tts-voiceclone'

export interface TTSRequest {
  text: string
  model?: TTSModel
  voice?: string
  format?: 'wav' | 'mp3' | 'pcm16'
  style?: string
  voiceDescription?: string
  audioBase64?: string
  audioMimeType?: string
}

export interface TTSResponse {
  audioData: string
  format: string
}

export const TTS_MODELS: Record<TTSModel, { name: string; description: string }> = {
  'mimo-v2.5-tts': { name: '预置音色', description: '使用内置音色，支持风格控制和唱歌' },
  'mimo-v2.5-tts-voicedesign': { name: '音色设计', description: '用文字描述生成自定义音色' },
  'mimo-v2.5-tts-voiceclone': { name: '音色克隆', description: '上传音频样本克隆音色' },
}

export const PRESET_VOICES = [
  { id: 'mimo_default', name: 'MiMo 默认', lang: 'auto' },
  { id: '冰糖', name: '冰糖', lang: 'zh', gender: 'female' },
  { id: '茉莉', name: '茉莉', lang: 'zh', gender: 'female' },
  { id: '苏打', name: '苏打', lang: 'zh', gender: 'male' },
  { id: '白桦', name: '白桦', lang: 'zh', gender: 'male' },
  { id: 'Mia', name: 'Mia', lang: 'en', gender: 'female' },
  { id: 'Chloe', name: 'Chloe', lang: 'en', gender: 'female' },
  { id: 'Milo', name: 'Milo', lang: 'en', gender: 'male' },
  { id: 'Dean', name: 'Dean', lang: 'en', gender: 'male' },
]

export const STYLE_CATEGORIES = [
  {
    label: '基础情绪',
    styles: ['开心', '悲伤', '愤怒', '恐惧', '惊讶', '兴奋', '委屈', '平静', '冷漠'],
  },
  { label: '复合情绪', styles: ['怅然', '欣慰', '无奈', '愧疚', '释然', '嫉妒', '忐忑', '动情'] },
  { label: '整体基调', styles: ['温柔', '高冷', '活泼', '严肃', '慵懒', '俏皮', '深沉', '干练'] },
  { label: '声线定位', styles: ['磁性', '醇厚', '清亮', '空灵', '稚嫩', '苍老', '甜美', '沙哑'] },
  { label: '角色扮演', styles: ['孙悟空', '林黛玉'] },
  { label: '方言', styles: ['东北话', '四川话', '河南话', '粤语'] },
]

export class TTSManager {
  private baseUrl: string = 'https://api.xiaomimimo.com/v1'
  private apiKey: string = ''
  private abortController: AbortController | null = null

  configure(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey
    if (baseUrl) this.baseUrl = baseUrl
    debug.log('[TTSManager] configured')
  }

  async synthesize(request: TTSRequest): Promise<TTSResponse> {
    if (!this.apiKey) {
      throw new Error('API Key 未配置')
    }

    const model = request.model || 'mimo-v2.5-tts'

    const messages: Array<{ role: string; content: string }> = []

    if (model === 'mimo-v2.5-tts-voicedesign') {
      messages.push({ role: 'user', content: request.voiceDescription || 'Young female voice' })
      messages.push({ role: 'assistant', content: request.text })
    } else if (model === 'mimo-v2.5-tts-voiceclone') {
      messages.push({ role: 'user', content: '' })
      messages.push({ role: 'assistant', content: request.text })
    } else {
      if (request.style) {
        messages.push({ role: 'user', content: request.style })
      }
      messages.push({ role: 'assistant', content: request.text })
    }

    const audio: Record<string, any> = {
      format: request.format || 'mp3',
    }

    if (model === 'mimo-v2.5-tts') {
      audio.voice = request.voice || 'mimo_default'
    } else if (model === 'mimo-v2.5-tts-voiceclone' && request.audioBase64) {
      audio.voice = `data:${request.audioMimeType || 'audio/mpeg'};base64,${request.audioBase64}`
    }

    const body = JSON.stringify({ model, messages, audio })

    this.abortController = new AbortController()

    return new Promise<TTSResponse>((resolve, reject) => {
      const url = new URL(`${this.baseUrl}/chat/completions`)
      const isHttps = url.protocol === 'https:'

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Length': Buffer.byteLength(body),
        },
      }

      const transport = isHttps ? https : http

      const req = transport.request(options, (res) => {
        let data = ''
        res.on('data', (chunk) => {
          data += chunk
        })
        res.on('end', () => {
          try {
            if (res.statusCode !== 200) {
              const parsed = JSON.parse(data)
              reject(new Error(parsed.error?.message || `HTTP ${res.statusCode}`))
              return
            }

            const parsed = JSON.parse(data)
            const audioData = parsed.choices?.[0]?.message?.audio?.data
            if (!audioData) {
              reject(new Error('未收到音频数据'))
              return
            }

            resolve({
              audioData,
              format: parsed.choices?.[0]?.message?.audio?.format || 'mp3',
            })
          } catch (e: any) {
            reject(new Error(`解析响应失败: ${e.message}`))
          }
        })
      })

      req.on('error', reject)
      req.on('timeout', () => {
        req.destroy()
        reject(new Error('请求超时'))
      })

      req.setTimeout(60000)
      req.write(body)
      req.end()
    })
  }

  cancel() {
    this.abortController?.abort()
    this.abortController = null
  }
}
