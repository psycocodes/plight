import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Web3ModalProvider } from '@/context/Web3Modal'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Plight | Eligibility Check',
  description: 'Verified Privacy-Preserving Health Checks',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Web3ModalProvider>{children}</Web3ModalProvider>
      </body>
    </html>
  )
}
