import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  createSessionToken,
  hashPassword,
  hashSessionToken,
  normalizeEmail,
  sanitizeName,
  sessionExpiresAt,
  validateEmail,
  validatePassword,
} from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email = normalizeEmail(body.email)
    const password = typeof body.password === 'string' ? body.password : ''
    const name = sanitizeName(body.name)

    const emailError = validateEmail(email)
    if (emailError) {
      return NextResponse.json({ error: emailError }, { status: 400 })
    }

    const passwordError = validatePassword(password)
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })
    }

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword(password),
        name: name ?? undefined,
        lastLoginAt: new Date(),
      },
    })

    const token = createSessionToken()
    await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: hashSessionToken(token),
        expiresAt: sessionExpiresAt(),
      },
    })

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Could not create account.' }, { status: 500 })
  }
}
