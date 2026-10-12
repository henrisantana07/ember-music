import { Suspense } from 'react'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
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
    icon: [
      { url: '/favicon.ico', sizes: '32x32', type: 'image/x-icon' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
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

  // Em dev, remove qualquer service worker antigo imediatamente (roda no HTML,
  // que é sempre fresco — contorna o SW velho que ainda serve JS cacheado no F5).
  const swDevCleanupScript = `
    (function() {
      try {
        var h = location.hostname;
        var isDev = h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
        if (!isDev) return;
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(function(rs) {
            rs.forEach(function(r) { r.unregister().catch(function() {}); });
          }).catch(function() {});
        }
        if ('caches' in window) {
          caches.keys().then(function(ks) {
            ks.forEach(function(k) {
              if (k.indexOf('ember-music') === 0) caches.delete(k);
            });
          }).catch(function() {});
        }
      } catch(e) {}
    })();
  `

  return (
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <body className="flex flex-col h-screen overflow-hidden">
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeScript }} />
        <Script id="sw-dev-cleanup" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: swDevCleanupScript }} />
        <YouTubePlayerProvider>
          <KeyboardShortcuts />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
              <Suspense fallback={<div className="h-16 flex-shrink-0" />}><Topbar /></Suspense>
              <MainContainer>
                <PageTransition>
                  {children}
                </PageTransition>
              </MainContainer>
            </div>
          </div>
          <Player />
        </YouTubePlayerProvider>
        <PwaRegister />
      </body>
    </html>
  )
}
