import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const payload = await getPayload({
      config: configPromise,
    })

    const { email, password, displayName } = await req.json()

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