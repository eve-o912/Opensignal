import { createHash, randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const NAME_REGEX = /^[a-zA-Z0-9 .,'-]{1,80}$/
const PASSWORD_MIN_LENGTH = 8
const PASSWORD_MAX_LENGTH = 128
const SESSION_TTL_DAYS = 30

export function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

export function sanitizeName(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const cleaned = value.trim().replace(/\s+/g, ' ')
  if (!cleaned) return null
  return NAME_REGEX.test(cleaned) ? cleaned : null
}

export function validateEmail(value: string): string | null {
  if (!value || value.length > 254 || !EMAIL_REGEX.test(value)) {
    return 'Enter a valid email address.'
  }
  return null
}

export function validatePassword(value: string): string | null {
  if (typeof value !== 'string') return 'Password is required.'
  if (value.length < PASSWORD_MIN_LENGTH) return 'Password must be at least 8 characters.'
  if (value.length > PASSWORD_MAX_LENGTH) return 'Password is too long.'
  if (/\s/.test(value)) return 'Password cannot contain whitespace.'
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return 'Password must include letters and numbers.'
  return null
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function createSessionToken(): string {
  return randomBytes(32).toString('base64url')
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function sessionExpiresAt(): Date {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS)
  return expiresAt
}

export function isGoogleClientConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID)
}
