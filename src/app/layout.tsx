import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import { Player } from '@/components/Player'
import { Topbar } from '@/components/Topbar'
import { PageTransition } from '@/components/PageTransition'
import { PwaRegister } from '@/components/PwaRegister'
import { KeyboardShortcuts } from '@/components/KeyboardShortcuts'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Ember Music',
  description: 'Descubra música independente',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, title: 'Ember Music', statusBarStyle: 'black-translucent' },
  icons: {
    icon: '/branding/icon.svg',
    apple: '/icons/icon-512.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#FF6A00',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const themeScript = `
    (function() {
      try {
        var theme = localStorage.getItem('ember-theme');
        if (theme === 'light') {
          document.documentElement.classList.add('theme-light');
        }
      } catch(e) {}
    })();
  `

  return (
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <body className="flex flex-col h-screen overflow-hidden">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <KeyboardShortcuts />
        <div className="relative flex flex-1 overflow-hidden">
          <img
            src="/branding/icon.svg"
            alt=""
            className="hidden md:block absolute top-3 left-3 w-12 h-12 z-10 pointer-events-none transition-all duration-300"
            style={{ filter: 'drop-shadow(0 0 8px rgba(255,106,0,0.4))' }}
          />
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Topbar />
            <main className="flex-1 overflow-y-auto scrollbar-thin px-4 md:px-6 py-5 pb-24 md:pb-5 flex flex-col">
              <PageTransition>
                {children}
              </PageTransition>
            </main>
          </div>
        </div>
        <Player />
        <PwaRegister />
      </body>
    </html>
  )
}
