import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

const SIZES = [16, 32, 48, 64, 128, 256, 512]
const INPUT_SVG = path.join(__dirname, '../resources/icon.svg')
const OUTPUT_DIR = path.join(__dirname, '../resources')

async function generateIcons() {
  const svgBuffer = fs.readFileSync(INPUT_SVG)

  for (const size of SIZES) {
    const pngPath = path.join(OUTPUT_DIR, `icon-${size}.png`)
    await sharp(svgBuffer).resize(size, size).png().toFile(pngPath)
    console.log(`Generated ${pngPath}`)
  }

  // Generate main icon.png (512x512)
  const mainIcon = path.join(OUTPUT_DIR, 'icon.png')
  await sharp(svgBuffer).resize(512, 512).png().toFile(mainIcon)
  console.log(`Generated ${mainIcon}`)

  // Generate ICO file (16, 32, 48, 256)
  const icoSizes = [16, 32, 48, 256]
  const icoBuffers = await Promise.all(
    icoSizes.map(async (size) => {
      const buf = await sharp(svgBuffer).resize(size, size).png().toBuffer()
      return { size, data: buf }
    })
  )

  // Build ICO manually
  const icoPath = path.join(OUTPUT_DIR, 'icon.ico')
  const icoData = buildICO(icoBuffers)
  fs.writeFileSync(icoPath, icoData)
  console.log(`Generated ${icoPath}`)
}

function buildICO(images: Array<{ size: number; data: Buffer }>): Buffer {
  const numImages = images.length

  // ICO header: 6 bytes
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // Reserved
  header.writeUInt16LE(1, 2) // Type: ICO
  header.writeUInt16LE(numImages, 4) // Number of images

  // Calculate offsets
  const dirEntrySize = 16
  const headerSize = 6 + numImages * dirEntrySize

  let currentOffset = headerSize
  const dirEntries: Buffer[] = []
  const imageDataBuffers: Buffer[] = []

  for (const img of images) {
    const dirEntry = Buffer.alloc(dirEntrySize)
    dirEntry.writeUInt8(img.size === 256 ? 0 : img.size, 0) // Width
    dirEntry.writeUInt8(img.size === 256 ? 0 : img.size, 1) // Height
    dirEntry.writeUInt8(0, 2) // Color palette
    dirEntry.writeUInt8(0, 3) // Reserved
    dirEntry.writeUInt16LE(1, 4) // Color planes
    dirEntry.writeUInt16LE(32, 6) // Bits per pixel
    dirEntry.writeUInt32LE(img.data.length, 8) // Image size
    dirEntry.writeUInt32LE(currentOffset, 12) // Image offset

    dirEntries.push(dirEntry)
    imageDataBuffers.push(img.data)
    currentOffset += img.data.length
  }

  return Buffer.concat([header, ...dirEntries, ...imageDataBuffers])
}

generateIcons().catch(console.error)
