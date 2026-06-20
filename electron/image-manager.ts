import https from 'https'
import http from 'http'
import { BrowserWindow } from 'electron'
import { sendEventToRenderer } from './utils/event-helper'
import { debug } from './debug'

export type ImageBackend = 'sd-webui' | 'comfyui' | 'openai' | 'siliconflow'

export interface ImageGenRequest {
  prompt: string
  negativePrompt?: string
  width?: number
  height?: number
  steps?: number
  cfgScale?: number
  seed?: number
  sampler?: string
  batchSize?: number
  backend?: ImageBackend
  model?: string
}

export interface ImageGenResult {
  images: Array<{ data: string; format: string }>
  parameters?: Record<string, any>
  seed?: number
}

interface BackendConfig {
  id: ImageBackend
  name: string
  baseUrl: string
  enabled: boolean
}

export class ImageManager {
  private window: BrowserWindow
  private backends: Map<ImageBackend, BackendConfig> = new Map()
  private abortController: AbortController | null = null

  constructor(window: BrowserWindow) {
    this.window = window
    this.initBackends()
  }

  private initBackends() {
    const defaults: BackendConfig[] = [
      {
        id: 'sd-webui',
        name: 'Stable Diffusion WebUI',
        baseUrl: 'http://127.0.0.1:7860',
        enabled: true,
      },
      { id: 'comfyui', name: 'ComfyUI', baseUrl: 'http://127.0.0.1:8188', enabled: false },
      { id: 'openai', name: 'OpenAI DALL-E', baseUrl: 'https://api.openai.com/v1', enabled: false },
      {
        id: 'siliconflow',
        name: 'Silicon Flow',
        baseUrl: 'https://api.siliconflow.cn/v1',
        enabled: false,
      },
    ]
    for (const b of defaults) {
      this.backends.set(b.id, b)
    }
  }

  configureBackend(id: ImageBackend, config: Partial<BackendConfig>) {
    const existing = this.backends.get(id)
    if (existing) {
      this.backends.set(id, { ...existing, ...config })
    }
  }

  getBackends(): BackendConfig[] {
    return Array.from(this.backends.values())
  }

  private httpRequest(
    url: string,
    options: http.RequestOptions,
    body: string
  ): Promise<{ statusCode: number; data: string }> {
    return new Promise((resolve, reject) => {
      const isHttps = url.startsWith('https')
      const transport = isHttps ? https : http
      const parsedUrl = new URL(url)

      const req = transport.request(
        {
          ...options,
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (isHttps ? 443 : 80),
          path: parsedUrl.pathname + parsedUrl.search,
        },
        (res) => {
          let data = ''
          res.on('data', (chunk) => {
            data += chunk
          })
          res.on('end', () => resolve({ statusCode: res.statusCode || 0, data }))
        }
      )

      req.on('error', reject)
      req.on('timeout', () => {
        req.destroy()
        reject(new Error('Request timeout'))
      })

      if (body) req.write(body)
      req.end()
    })
  }

  async generate(request: ImageGenRequest): Promise<ImageGenResult> {
    const backendId = request.backend || 'sd-webui'
    const backend = this.backends.get(backendId)
    if (!backend || !backend.enabled) {
      throw new Error(`Backend ${backendId} is not enabled`)
    }

    debug.log(`[ImageManager] Generating with ${backendId}`, {
      prompt: request.prompt.substring(0, 50),
    })

    this.sendEvent({
      type: 'session_update',
      data: { action: 'image_generating', backend: backendId },
      timestamp: Date.now(),
    })

    try {
      let result: ImageGenResult

      switch (backendId) {
        case 'sd-webui':
          result = await this.generateSDWebUI(backend.baseUrl, request)
          break
        case 'comfyui':
          result = await this.generateComfyUI(backend.baseUrl, request)
          break
        case 'openai':
          result = await this.generateOpenAI(backend.baseUrl, request)
          break
        case 'siliconflow':
          result = await this.generateSiliconFlow(backend.baseUrl, request)
          break
        default:
          throw new Error(`Unknown backend: ${backendId}`)
      }

      this.sendEvent({
        type: 'session_update',
        data: { action: 'image_done', count: result.images.length },
        timestamp: Date.now(),
      })

      return result
    } catch (error: any) {
      this.sendEvent({
        type: 'error',
        data: { message: `Image generation failed: ${error.message}` },
        timestamp: Date.now(),
      })
      throw error
    }
  }

  private async generateSDWebUI(
    baseUrl: string,
    request: ImageGenRequest
  ): Promise<ImageGenResult> {
    const body = JSON.stringify({
      prompt: request.prompt,
      negative_prompt: request.negativePrompt || '',
      width: request.width || 512,
      height: request.height || 512,
      steps: request.steps || 20,
      cfg_scale: request.cfgScale || 7,
      seed: request.seed || -1,
      sampler_name: request.sampler || 'Euler a',
      batch_size: request.batchSize || 1,
    })

    const { statusCode, data } = await this.httpRequest(
      `${baseUrl}/sdapi/v1/txt2img`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      body
    )

    if (statusCode !== 200) {
      throw new Error(`SD WebUI API error: ${statusCode}`)
    }

    const parsed = JSON.parse(data)
    return {
      images: (parsed.images || []).map((img: string) => ({ data: img, format: 'png' })),
      parameters: parsed.parameters,
      seed: parsed.seed,
    }
  }

  private async generateComfyUI(
    baseUrl: string,
    request: ImageGenRequest
  ): Promise<ImageGenResult> {
    const workflow = this.buildComfyUIWorkflow(request)

    const { statusCode, data } = await this.httpRequest(
      `${baseUrl}/prompt`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      JSON.stringify({ prompt: workflow })
    )

    if (statusCode !== 200) {
      throw new Error(`ComfyUI API error: ${statusCode}`)
    }

    const { prompt_id } = JSON.parse(data)

    // Poll for completion
    const history = await this.pollComfyUIHistory(baseUrl, prompt_id, 60000)

    const images: Array<{ data: string; format: string }> = []
    if (history?.outputs) {
      for (const nodeId of Object.keys(history.outputs)) {
        const nodeOutput = history.outputs[nodeId]
        if (nodeOutput.images) {
          for (const img of nodeOutput.images) {
            const imgData = await this.httpRequest(
              `${baseUrl}/view?filename=${img.filename}&subfolder=${img.subfolder || ''}&type=${img.type}`,
              { method: 'GET' },
              ''
            )
            images.push({
              data: Buffer.from(imgData.data, 'binary').toString('base64'),
              format: img.filename.split('.').pop() || 'png',
            })
          }
        }
      }
    }

    return { images, parameters: { prompt_id } }
  }

  private buildComfyUIWorkflow(request: ImageGenRequest): Record<string, any> {
    return {
      '3': {
        inputs: {
          seed: request.seed || Math.floor(Math.random() * 999999999),
          steps: request.steps || 20,
          cfg: request.cfgScale || 7,
          sampler_name: request.sampler || 'euler',
          scheduler: 'normal',
          denoise: 1,
          model: ['4', 0],
          positive: ['6', 0],
          negative: ['7', 0],
          latent_image: ['5', 0],
        },
        class_type: 'KSampler',
      },
      '4': {
        inputs: { ckpt_name: 'sd_xl_base_1.0.safetensors' },
        class_type: 'CheckpointLoaderSimple',
      },
      '5': {
        inputs: {
          width: request.width || 1024,
          height: request.height || 1024,
          batch_size: request.batchSize || 1,
        },
        class_type: 'EmptyLatentImage',
      },
      '6': { inputs: { text: request.prompt, clip: ['4', 1] }, class_type: 'CLIPTextEncode' },
      '7': {
        inputs: { text: request.negativePrompt || 'low quality', clip: ['4', 1] },
        class_type: 'CLIPTextEncode',
      },
      '8': { inputs: { samples: ['3', 0], vae: ['4', 2] }, class_type: 'VAEDecode' },
      '9': {
        inputs: { filename_prefix: 'MimoDesktop', images: ['8', 0] },
        class_type: 'SaveImage',
      },
    }
  }

  private async pollComfyUIHistory(
    baseUrl: string,
    promptId: string,
    timeoutMs: number
  ): Promise<any> {
    const startTime = Date.now()
    while (Date.now() - startTime < timeoutMs) {
      try {
        const { statusCode, data } = await this.httpRequest(
          `${baseUrl}/history/${promptId}`,
          { method: 'GET' },
          ''
        )
        if (statusCode === 200) {
          const history = JSON.parse(data)
          if (history[promptId]) return history[promptId]
        }
      } catch (_e) {
        /* poll until ready */
      }
      await new Promise((r) => setTimeout(r, 1000))
    }
    throw new Error('ComfyUI generation timeout')
  }

  private async generateOpenAI(baseUrl: string, request: ImageGenRequest): Promise<ImageGenResult> {
    const { statusCode, data } = await this.httpRequest(
      `${baseUrl}/images/generations`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY || ''}`,
        },
      },
      JSON.stringify({
        model: request.model || 'dall-e-3',
        prompt: request.prompt,
        n: 1,
        size: request.width && request.height ? `${request.width}x${request.height}` : '1024x1024',
        response_format: 'b64_json',
      })
    )

    if (statusCode !== 200) {
      throw new Error(`OpenAI API error: ${statusCode}`)
    }

    const parsed = JSON.parse(data)
    return {
      images: (parsed.data || []).map((img: any) => ({ data: img.b64_json, format: 'png' })),
    }
  }

  private async generateSiliconFlow(
    baseUrl: string,
    request: ImageGenRequest
  ): Promise<ImageGenResult> {
    const { statusCode, data } = await this.httpRequest(
      `${baseUrl}/images/generations`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.SILICONFLOW_API_KEY || ''}`,
        },
      },
      JSON.stringify({
        model: request.model || 'stabilityai/stable-diffusion-xl-base-1.0',
        prompt: request.prompt,
        image_size:
          request.width && request.height ? `${request.width}x${request.height}` : '1024x1024',
        num_inference_steps: request.steps || 20,
      })
    )

    if (statusCode !== 200) {
      throw new Error(`SiliconFlow API error: ${statusCode}`)
    }

    const parsed = JSON.parse(data)
    return {
      images: (parsed.images || []).map((img: any) => ({
        data: img.image || img.url || '',
        format: 'png',
      })),
    }
  }

  cancel() {
    this.abortController?.abort()
    this.abortController = null
  }

  private sendEvent(event: any) {
    sendEventToRenderer(this.window, event)
  }
}
