import { Suspense } from 'react'
import { MotionConfig } from 'motion/react'
import type { Metadata, Viewport } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import { Player } from '@/components/Player'
import { Topbar } from '@/components/Topbar'
import { PageTransition } from '@/components/PageTransition'
import { PwaRegister } from '@/components/PwaRegister'
import { MainContainer } from '@/components/MainContainer'
import { KeyboardShortcuts } from '@/components/KeyboardShortcuts'
import { YouTubePlayerProvider } from '@/components/YouTubePlayer/context'

/* Dois papéis distintos: Inter conduz a interface e os textos longos;
   Space Grotesk aparece só nos títulos, onde a marca precisa de presença. */
const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
  display: 'swap',
})

const display = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Ember Music',
  description: 'Descubra música independente',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, title: 'Ember Music', statusBarStyle: 'black-translucent' },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32', type: 'image/x-icon' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/icons/icon-512.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#FF6A00',
  /* Sem `viewport-fit=cover` o browser ignora `env(safe-area-inset-*)` e o
     conteúdo encosta no notch/home indicator. É o que falta para que os
     tokens de safe area do globals.css tenham efeito. */
  viewportFit: 'cover',
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
    <html lang="pt-BR" className={`${inter.variable} ${display.variable}`} suppressHydrationWarning>
      {/* `100dvh` acompanha a barra de URL dinâmica do mobile; `h-screen`
          permanece como fallback para browsers sem suporte a dvh. */}
      <body className="flex flex-col h-screen h-[100dvh] overflow-hidden">
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/* `reducedMotion="user"` drops every transform/layout animation Motion
            would otherwise run when the OS asks for reduced motion, while
            keeping opacity fades — the level of movement the guideline asks
            for. CSS-driven animation is zeroed separately in globals.css. */}
        <MotionConfig reducedMotion="user">
          <YouTubePlayerProvider>
            <KeyboardShortcuts />
            <div className="flex flex-col flex-1 overflow-hidden">
              <Suspense fallback={<div className="h-16 flex-shrink-0 border-b border-outline-variant" />}><Topbar /></Suspense>
              <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                <MainContainer>
                  <PageTransition>
                    {children}
                  </PageTransition>
                </MainContainer>
              </div>
            </div>
            <Player />
          </YouTubePlayerProvider>
        </MotionConfig>
        <PwaRegister />
      </body>
    </html>
  )
}
