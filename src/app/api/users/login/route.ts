import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const payload = await getPayload({
      config: configPromise,
    })

    const { email, password } = await req.json()
    const url = new URL(req.url)
    const from = url.searchParams.get('from') || '/'

    console.log('Login attempt for:', email)

    // Use Payload's Local API to login and let it handle cookies
    const { user, token } = await payload.login({
      collection: 'users',
      data: {
        email,
        password,
      },
      req, // Pass the request object to let Payload handle cookies
    })

    console.log('Login successful, token received:', token ? 'Yes' : 'No')

    if (!token) {
      throw new Error('No token received from login')
    }

    // Create the response with the user data and redirect URL
    const response = NextResponse.json({ 
      user,
      redirectTo: from 
    })

    // Set the token cookie explicitly
    response.cookies.set('payload-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { errors: [{ message: 'Login failed' }] },
      { status: 401 }
    )
  }
} 