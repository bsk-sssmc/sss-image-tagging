import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="not-found">
      <h1>404 - Page Not Found</h1>
      <p>Sorry, we couldn't find the page you're looking for.</p>
      <Link 
        href="/"
        className="not-found-link"
      >
        Return Home
      </Link>
    </div>
  )
} 