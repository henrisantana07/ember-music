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

  // Auto-cura do service worker: roda no HTML (sempre fresco, mesmo com SW velho
  // servindo JS cacheado). Se detecta SW/cache de versão antiga, remove tudo e
  // recarrega UMA vez — a partir daí o F5 comum já usa a versão nova.
  const swHealScript = `
    (function() {
      try {
        var CURRENT = 'ember-music-v2';
        var GUARD = 'ember:sw-heal';
        var GUARD_KEY = GUARD + ':' + CURRENT;
        // limpa marcador de uma cura anterior (mantém a flag de resume intacta)
        sessionStorage.removeItem(GUARD);
        if (!('serviceWorker' in navigator)) return;
        if (sessionStorage.getItem(GUARD_KEY)) return;
        var h = location.hostname;
        var isDev = h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
        var heal = function(regs) {
          sessionStorage.setItem(GUARD, '1');
          sessionStorage.setItem(GUARD_KEY, '1');
          regs.forEach(function(r) { r.unregister().catch(function() {}); });
          var reload = function() { location.reload(); };
          if ('caches' in window) {
            caches.keys().then(function(ks) {
              return Promise.all(
                ks.filter(function(k) { return k.indexOf('ember-music') === 0; })
                  .map(function(k) { return caches.delete(k); })
              );
            }).catch(function() {}).then(reload);
          } else {
            reload();
          }
        };
        navigator.serviceWorker.getRegistrations().then(function(regs) {
          if (isDev) {
            if (regs.length > 0) heal(regs);
            return;
          }
          if ('caches' in window) {
            caches.keys().then(function(ks) {
              var old = ks.some(function(k) {
                return /^ember-music-v\\d+$/.test(k) && k !== CURRENT;
              });
              if (old) heal(regs);
            }).catch(function() {});
          }
        }).catch(function() {});
      } catch(e) {}
    })();
  `

  return (
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <body className="flex flex-col h-screen overflow-hidden">
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeScript }} />
        <Script id="sw-heal" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: swHealScript }} />
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
