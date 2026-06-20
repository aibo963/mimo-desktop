import { nativeImage } from 'electron'

export function createTrayIcon(size: number = 16): Electron.NativeImage {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 16 16">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#059669"/>
          <stop offset="100%" stop-color="#10b981"/>
        </linearGradient>
      </defs>
      <rect width="16" height="16" rx="3" fill="url(#bg)"/>
      <path d="M4 5 C4 4 5 3 6 3 L10 3 C11 3 12 4 12 5 L12 9 C12 10 11 11 10 11 L7 11 L5 13 L5.5 11 L6 11 C5 11 4 10 4 9 Z" fill="white" fill-opacity="0.95"/>
      <circle cx="7" cy="7" r="1.2" fill="#059669"/>
      <circle cx="10" cy="7" r="1.2" fill="#059669"/>
      <line x1="7" y1="7" x2="10" y2="7" stroke="#059669" stroke-width="0.8"/>
      <line x1="7" y1="7" x2="7" y2="9" stroke="#059669" stroke-width="0.8"/>
      <line x1="10" y1="7" x2="10" y2="9" stroke="#059669" stroke-width="0.8"/>
      <circle cx="7" cy="9" r="1" fill="#059669"/>
      <circle cx="10" cy="9" r="1" fill="#059669"/>
    </svg>
  `
  const svgBuffer = Buffer.from(svg.trim())
  return nativeImage.createFromBuffer(svgBuffer)
}
