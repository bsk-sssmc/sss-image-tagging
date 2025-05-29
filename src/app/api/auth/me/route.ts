import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  try {
    // Get the token from cookies
    const cookies = req.headers.get('cookie')?.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=')
      acc[key] = value
      return acc
    }, {} as Record<string, string>)

    const token = cookies?.['payload-token']

    if (!token) {
      return NextResponse.json(
        { errors: [{ message: 'Not authenticated' }] },
        { status: 401 }
      )
    }

    // Try to get user info from PayloadCMS REST API
    const payloadURL = process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000'
    
    // Try admin endpoint first
    try {
      const adminResponse = await fetch(`${payloadURL}/api/admins/me`, {
        credentials: 'include',
        headers: {
          Authorization: `JWT ${token}`,
        },
      })

      if (adminResponse.ok) {
        const data = await adminResponse.json()
        if (data?.user) {
          return NextResponse.json({
            user: {
              ...data.user,
              collection: 'admins'
            }
          })
        }
      }
    } catch (error) {
      console.error('Error checking admin:', error)
    }

    // If admin check fails, try users endpoint
    try {
      const userResponse = await fetch(`${payloadURL}/api/users/me`, {
        credentials: 'include',
        headers: {
          Authorization: `JWT ${token}`,
        },
      })

      if (userResponse.ok) {
        const data = await userResponse.json()
        if (data?.user) {
          return NextResponse.json({
            user: {
              ...data.user,
              collection: 'users'
            }
          })
        }
      }
    } catch (error) {
      console.error('Error checking user:', error)
    }

    // If no user found in either collection
    return NextResponse.json(
      { errors: [{ message: 'Not authenticated' }] },
      { status: 401 }
    )
  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json(
      { errors: [{ message: 'Authentication check failed' }] },
      { status: 401 }
    )
  }
} 