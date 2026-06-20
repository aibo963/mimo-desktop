import crypto from 'crypto'
import os from 'os'
import { debug } from './debug'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const IV_LENGTH = 16
const TAG_LENGTH = 16

function getMachineKey(): Buffer {
  // Use machine-specific info as key material
  const hostname = os.hostname()
  const platform = os.platform()
  const userInfo = os.userInfo().username
  const seed = `mimo-desktop-${hostname}-${platform}-${userInfo}-key-salt`
  return crypto.scryptSync(seed, 'mimo-salt', KEY_LENGTH)
}

export function encrypt(plaintext: string): string {
  try {
    const key = getMachineKey()
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

    let encrypted = cipher.update(plaintext, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    const tag = cipher.getAuthTag()

    // Format: iv:tag:ciphertext (all hex)
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`
  } catch (error: any) {
    debug.error('[Crypto] Encrypt failed:', error.message)
    return plaintext // Fallback to plaintext on error
  }
}

export function decrypt(ciphertext: string): string {
  try {
    // Check if it's encrypted (has the iv:tag: format)
    const parts = ciphertext.split(':')
    if (parts.length !== 3) return ciphertext // Not encrypted, return as-is

    const key = getMachineKey()
    const iv = Buffer.from(parts[0], 'hex')
    const tag = Buffer.from(parts[1], 'hex')
    const encrypted = parts[2]

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)

    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (error: any) {
    debug.error('[Crypto] Decrypt failed:', error.message)
    return ciphertext // Fallback to ciphertext on error
  }
}

export function isEncrypted(value: string): boolean {
  const parts = value.split(':')
  return parts.length === 3 && /^[0-9a-f]+$/i.test(parts[0]) && /^[0-9a-f]+$/i.test(parts[1])
}
