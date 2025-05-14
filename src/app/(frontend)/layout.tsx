import React from 'react'
import './styles.css'
import Navbar from './components/Navbar'
import { AuthProvider } from './context/AuthContext'
import AuthErrorNotification from './components/AuthErrorNotification'

export const metadata = {
  description: 'A blank template using Payload in a Next.js app.',
  title: 'Payload Blank Template',
}

export default function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Navbar />
          <AuthErrorNotification />
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  )
}
