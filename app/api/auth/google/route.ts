import { NextResponse } from 'next/server'
import { OAuth2Client } from 'google-auth-library'
import { prisma } from '@/lib/prisma'
import {
  createSessionToken,
  hashSessionToken,
  isGoogleClientConfigured,
  normalizeEmail,
  sanitizeName,
  sessionExpiresAt,
} from '@/lib/auth'

export async function POST(request: Request) {
  try {
    if (!isGoogleClientConfigured()) {
      return NextResponse.json({ error: 'Google sign-in is not configured.' }, { status: 500 })
    }

    const body = await request.json()
    const credential = typeof body.credential === 'string' ? body.credential : ''
    if (!credential || credential.length < 50) {
      return NextResponse.json({ error: 'Invalid Google credential.' }, { status: 400 })
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    const authClient = new OAuth2Client(clientId)
    const ticket = await authClient.verifyIdToken({
      idToken: credential,
      audience: clientId,
    })

    const payload = ticket.getPayload()
    if (!payload?.email || !payload.sub) {
      return NextResponse.json({ error: 'Google account details are incomplete.' }, { status: 400 })
    }

    if (!payload.email_verified) {
      return NextResponse.json({ error: 'Google account email must be verified.' }, { status: 400 })
    }

    const email = normalizeEmail(payload.email)
    const googleId = payload.sub
    const displayName = sanitizeName(payload.name)

    let user = await prisma.user.findFirst({
      where: {
        OR: [{ googleId }, { email }],
      },
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          googleId,
          name: displayName ?? undefined,
          emailVerifiedAt: new Date(),
          lastLoginAt: new Date(),
        },
      })
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: user.googleId ?? googleId,
          name: user.name ?? displayName ?? undefined,
          emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
          lastLoginAt: new Date(),
        },
      })
    }

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
    return NextResponse.json({ error: 'Google sign-in failed.' }, { status: 500 })
  }
}
