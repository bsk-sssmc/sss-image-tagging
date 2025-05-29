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

    // Get the 'from' parameter from the URL
    const url = new URL(req.url)
    const from = url.searchParams.get('from') || '/'

    // Parse the request body once
    const { email, password, recaptchaToken } = await req.json()

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

    console.log('Login attempt for:', email)

    let user = null
    let token = null
    let collection = ''
    let loginError: Error | null = null

    // Try admins collection first
    try {
      const adminResult = await payload.login({
        collection: 'admins',
        data: {
          email,
          password,
        },
      })
      user = adminResult.user
      token = adminResult.token
      collection = 'admins'
    } catch (adminError) {
      console.log('Admin login failed:', adminError instanceof Error ? adminError.message : 'Unknown error')
      loginError = adminError instanceof Error ? adminError : new Error('Admin login failed')
      
      // If admin login fails, try users collection
      try {
        const userResult = await payload.login({
          collection: 'users',
          data: {
            email,
            password,
          },
        })
        user = userResult.user
        token = userResult.token
        collection = 'users'
        loginError = null // Clear error if user login succeeds
      } catch (userError) {
        console.log('User login failed:', userError instanceof Error ? userError.message : 'Unknown error')
        loginError = userError instanceof Error ? userError : new Error('User login failed')
      }
    }

    // If both logins failed, throw the last error
    if (!token || !user) {
      throw loginError || new Error('Login failed for both admin and user collections')
    }

    console.log('Login successful, token received:', token ? 'Yes' : 'No')

    // Add collection information to user object
    const userWithCollection = {
      ...user,
      collection,
    }

    // Create the response with the user data and redirect URL
    const response = NextResponse.json({ 
      user: userWithCollection,
      redirectTo: from 
    })

    // Set both token cookies to ensure compatibility
    response.cookies.set('payload-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    })
    
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    
    // Provide more specific error messages based on the error type
    let errorMessage = 'Login failed'
    if (error instanceof Error) {
      if (error.message.includes('Invalid credentials')) {
        errorMessage = 'Invalid email or password'
      } else if (error.message.includes('No JSON data found')) {
        errorMessage = 'Invalid request format'
      } else if (error.message.includes('Login failed for both admin and user collections')) {
        errorMessage = 'Invalid email or password'
      }
    }
    
    return NextResponse.json(
      { errors: [{ message: errorMessage }] },
      { status: 401 }
    )
  }
} 