import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const payload = await getPayload({
      config: configPromise,
    })

    // Add detailed request logging
    console.log('Request headers:', Object.fromEntries(req.headers.entries()))
    const rawBody = await req.text()
    console.log('Raw request body:', rawBody)
    
    try {
      // Extract JSON from multipart form data
      const jsonMatch = rawBody.match(/\{.*\}/s)
      if (!jsonMatch) {
        throw new Error('No JSON data found in request body')
      }
      
      const { email, password } = JSON.parse(jsonMatch[0])
      const url = new URL(req.url)
      const from = url.searchParams.get('from') || '/'

      console.log('Login attempt for:', email)

      let user = null
      let token = null
      let collection = ''

      // Try logging in as admin user first
      try {
        const result = await payload.login({
          collection: 'users',
          data: {
            email,
            password,
          },
          req,
        })
        user = result.user
        token = result.token
        collection = 'users'
      } catch (error) {
        // If admin login fails, try general user login
        try {
          const result = await payload.login({
            collection: 'general-users',
            data: {
              email,
              password,
            },
            req,
          })
          user = result.user
          token = result.token
          collection = 'general-users'
        } catch (error) {
          throw new Error('Invalid credentials')
        }
      }

      console.log('Login successful, token received:', token ? 'Yes' : 'No')

      if (!token) {
        throw new Error('No token received from login')
      }

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
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      console.error('Failed to parse body:', rawBody)
      throw parseError
    }
  } catch (error) {
    console.error('Login error:', error)
    
    // Provide more specific error messages based on the error type
    let errorMessage = 'Login failed'
    if (error instanceof Error) {
      if (error.message.includes('Invalid credentials')) {
        errorMessage = 'Invalid email or password'
      } else if (error.message.includes('No JSON data found')) {
        errorMessage = 'Invalid request format'
      } else if (error.message.includes('No token received')) {
        errorMessage = 'Authentication failed'
      }
    }
    
    return NextResponse.json(
      { errors: [{ message: errorMessage }] },
      { status: 401 }
    )
  }
} 