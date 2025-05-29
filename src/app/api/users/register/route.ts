import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { NextResponse } from 'next/server'

async function verifyRecaptcha(token: string) {
  const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`,
  })

  const data = await response.json()
  return data.success
}

export async function POST(req: Request) {
  try {
    const payload = await getPayload({
      config: configPromise,
    })

    const { email, password, displayName, recaptchaToken } = await req.json()

    if (!recaptchaToken) {
      return NextResponse.json(
        { errors: [{ message: 'reCAPTCHA verification required' }] },
        { status: 400 }
      )
    }

    const isValidRecaptcha = await verifyRecaptcha(recaptchaToken)
    if (!isValidRecaptcha) {
      return NextResponse.json(
        { errors: [{ message: 'reCAPTCHA verification failed' }] },
        { status: 400 }
      )
    }

    // Only create the user in the 'users' collection
    const result = await payload.create({
      collection: 'users',
      data: {
        email,
        password,
        displayName,
      },
    })

    return NextResponse.json({ result })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { errors: [{ message: 'Registration failed' }] },
      { status: 400 }
    )
  }
} 