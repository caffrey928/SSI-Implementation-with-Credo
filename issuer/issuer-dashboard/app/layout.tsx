import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SSI Issuer Dashboard',
  description: 'Self-Sovereign Identity Credential Issuer Dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}