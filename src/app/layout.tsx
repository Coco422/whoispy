import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Who is the Spy - Online Game',
  description: 'A real-time multiplayer social deduction game',
  icons: {
    icon: '/whoispy-logo.ico',
    shortcut: '/whoispy-logo.ico',
    apple: '/whoispy-logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
        {children}
      </body>
    </html>
  )
}
