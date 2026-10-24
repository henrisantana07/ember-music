'use client'

import { LocalLibraryView } from '@/features/local-library/components/LocalLibraryView'

/* A vista completa vive em features/local-library/components/LocalLibraryView —
   fonte única usada aqui E pela aba "Local" de /biblioteca. Esta rota fica de
   pé para os links existentes (sidebar "Biblioteca Local"). */
export default function LocalLibraryPage() {
  return <LocalLibraryView />
}
