import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { MigrationProvider } from '@/components/migration-provider'
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
    icon: '/icon.svg',
    apple: '/apple-touch-icon.svg',
  },
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#8B5CF6',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

const themeScript = `try{if(localStorage.getItem('baby-tracker:theme')==='oled'){document.documentElement.classList.add('oled')}}catch(e){}`

const serviceWorkerScript = `if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      console.log('SW registered: ', registration);
    }).catch((registrationError) => {
      console.log('SW registration failed: ', registrationError);
    });
  });
}`

const storagePersistScript = `if ('storage' in navigator && navigator.storage.persist) {
  navigator.storage.persist().then((persisted) => {
    console.log('Storage persisted:', persisted);
  }).catch((err) => {
    console.log('Storage persist failed:', err);
  });
}`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`dark ${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: serviceWorkerScript }} />
        <script dangerouslySetInnerHTML={{ __html: storagePersistScript }} />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.svg" type="image/svg+xml" />
      </head>
      <body className="antialiased">
        <MigrationProvider>
          {children}
        </MigrationProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
