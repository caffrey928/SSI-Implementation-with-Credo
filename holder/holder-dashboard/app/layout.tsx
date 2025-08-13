import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SSI Holder Wallet',
  description: 'Self-Sovereign Identity Holder Wallet Application',
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