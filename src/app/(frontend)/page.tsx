'use client'

import './styles.css'
import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './context/AuthContext'

export default function HomePage() {
  const router = useRouter()
  const { user, checkAuth } = useAuth()

  useEffect(() => {
    const checkUser = async () => {
      await checkAuth()
      if (!user) {
        router.push('/login')
      }
    }
    // Only check auth on mount
    checkUser()
  }, []) // Remove user and checkAuth from dependencies

  if (!user) {
    return null // Don't render anything while checking auth
  }

  return (
    <div className="home">
      <h1>Sairam! Welcome {user.displayName}</h1>
    </div>
  )
}
