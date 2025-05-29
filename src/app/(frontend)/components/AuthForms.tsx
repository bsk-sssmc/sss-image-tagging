'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../context/AuthContext'
import ReCAPTCHA from 'react-google-recaptcha'

export default function AuthForms() {
  const [showRegister, setShowRegister] = useState(false)
  const [error, setError] = useState('')
  const [showDisplayNameForm, setShowDisplayNameForm] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null)
  const recaptchaRef = useRef<ReCAPTCHA>(null)
  const router = useRouter()
  const { setUser } = useAuth()

  useEffect(() => {
    // Check if user needs to set display name
    const checkDisplayName = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          credentials: 'include',
        })
        if (res.ok) {
          const data = await res.json()
          if (data?.user) {
            setUserId(data.user.id)
            if (!data.user.displayName) {
              setShowDisplayNameForm(true)
            }
          }
        }
      } catch (err) {
        // Only log the error if it's not a 401 (Unauthorized)
        if (err instanceof Error && !err.message.includes('401')) {
          console.error('Error checking display name:', err)
        }
      }
    }
    checkDisplayName()
  }, [])

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    
    if (!recaptchaToken) {
      setError('Please complete the reCAPTCHA verification')
      setIsLoading(false)
      return
    }

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    try {
      // Get the 'from' parameter from the URL
      const url = new URL(window.location.href)
      const from = url.searchParams.get('from') || '/'
      
      console.log('Attempting login with redirect to:', from)
      
      // First try general users login
      let res = await fetch(`/api/general-users/login?from=${encodeURIComponent(from)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password,
          recaptchaToken
        }),
        credentials: 'include',
      })

      // If general users login fails, try admin users login
      if (!res.ok) {
        res = await fetch(`/api/users/login?from=${encodeURIComponent(from)}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email.trim(),
            password: password,
            recaptchaToken
          }),
          credentials: 'include',
        })
      }

      const data = await res.json()
      console.log('Login response:', { status: res.status, ok: res.ok, data })

      if (!res.ok) {
        throw new Error(data.errors?.[0]?.message || 'Login failed')
      }

      // Store user ID and check if user has display name
      if (data?.user) {
        console.log('Login successful, user data received')
        setUserId(data.user.id)
        if (!data.user.displayName) {
          setShowDisplayNameForm(true)
        } else {
          // Update auth context and redirect
          setUser(data.user)
          localStorage.setItem('auth-state', JSON.stringify(data.user))
          localStorage.setItem('auth-timestamp', Date.now().toString())
          
          const targetPath = data.redirectTo || '/'
          if (window.location.pathname !== targetPath) {
            console.log('Redirecting to:', targetPath)
            router.push(targetPath)
          }
        }
      } else {
        throw new Error('User data not found in response')
      }
    } catch (err) {
      console.error('Login error:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred during login')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    if (!recaptchaToken) {
      setError('Please complete the reCAPTCHA verification')
      return
    }

    const formData = new FormData(e.currentTarget)
    const displayName = formData.get('displayName') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const verifyPassword = formData.get('verifyPassword') as string

    if (password !== verifyPassword) {
      setError('Passwords do not match')
      return
    }

    try {
      const res = await fetch('/api/users/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          displayName,
          recaptchaToken
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.errors?.[0]?.message || 'Registration failed')
      }

      // After successful registration, show login form
      setShowRegister(false)
      setError('Registration successful! Please login.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    }
  }

  const handleDisplayNameSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    if (!userId) {
      setError('User ID not found')
      return
    }

    const formData = new FormData(e.currentTarget)
    const displayName = formData.get('displayName') as string

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ displayName }),
        credentials: 'include',
      })

      if (!res.ok) {
        throw new Error('Failed to update display name')
      }

      setShowDisplayNameForm(false)
      // Update auth context and redirect to home page
      const userData = await res.json()
      setUser(userData.user)
      localStorage.setItem('auth-state', JSON.stringify(userData.user))
      localStorage.setItem('auth-timestamp', Date.now().toString())
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update display name')
    }
  }

  const handleRecaptchaChange = (token: string | null) => {
    setRecaptchaToken(token)
  }

  const resetRecaptcha = () => {
    setRecaptchaToken(null)
    if (recaptchaRef.current) {
      recaptchaRef.current.reset()
    }
  }

  if (showDisplayNameForm) {
    return (
      <div className="auth-container">
        {error && <div className="error-message">{error}</div>}
        <form className="auth-form" onSubmit={handleDisplayNameSubmit}>
          <h2>Set Your Display Name</h2>
          <div className="form-group">
            <input type="text" name="displayName" placeholder="Display Name" required />
          </div>
          <button type="submit" className="auth-button">Save Display Name</button>
        </form>
      </div>
    )
  }

  return (
    <div className="auth-container">
      {error && (
        <div className={error === 'Registration successful! Please login.' ? 'success-message' : 'error-message'}>
          {error}
        </div>
      )}
      
      {/* Login Form */}
      <form className="auth-form" style={{ display: showRegister ? 'none' : 'block', position: 'relative' }} onSubmit={handleLogin}>
        <h2>Login</h2>
        <div className="form-group">
          <input type="email" name="email" placeholder="Email" required disabled={isLoading} />
        </div>
        <div className="form-group">
          <input type="password" name="password" placeholder="Password" required disabled={isLoading} />
        </div>
        <div className="form-group">
          <ReCAPTCHA
            ref={recaptchaRef}
            sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ''}
            onChange={handleRecaptchaChange}
          />
        </div>
        <button type="submit" className="auth-button" disabled={isLoading}>
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
        <p className="switch-form">
          New user? <a href="#" onClick={(e) => { e.preventDefault(); setShowRegister(true); resetRecaptcha(); }}>Register here</a>
        </p>
        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-spinner" />
          </div>
        )}
      </form>

      {/* Registration Form */}
      <form className="auth-form" style={{ display: showRegister ? 'block' : 'none' }} onSubmit={handleRegister}>
        <h2>Register</h2>
        <div className="form-group">
          <input type="text" name="displayName" placeholder="Display Name" required />
        </div>
        <div className="form-group">
          <input type="email" name="email" placeholder="Email" required />
        </div>
        <div className="form-group">
          <input type="password" name="password" placeholder="Password" required />
        </div>
        <div className="form-group">
          <input type="password" name="verifyPassword" placeholder="Verify Password" required />
        </div>
        <div className="form-group">
          <ReCAPTCHA
            ref={recaptchaRef}
            sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ''}
            onChange={handleRecaptchaChange}
          />
        </div>
        <button type="submit" className="auth-button">Register</button>
        <p className="switch-form">
          Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); setShowRegister(false); resetRecaptcha(); }}>Login here</a>
        </p>
      </form>
    </div>
  )
} 