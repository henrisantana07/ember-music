'use client'

export function MainContainer({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="main-container flex-1 overflow-y-auto scrollbar-thin px-4 md:px-6 py-5 flex flex-col pb-24 md:pb-5"
    >
      {children}
    </main>
  )
}
