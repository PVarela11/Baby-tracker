import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: 'Baby Tracker',
  description: 'Track feeds, sleep, and diapers with one hand, day or night.',
  generator: 'v0.app',
  applicationName: 'Baby Tracker',
  appleWebApp: { capable: true, title: 'Baby Tracker', statusBarStyle: 'black-translucent' },
  icons: {
    icon: '/icon-512.png',
    apple: '/icon-512.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#16181f',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

const themeScript = `try{if(localStorage.getItem('baby-tracker:theme')==='oled'){document.documentElement.classList.add('oled')}}catch(e){}`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`dark ${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
