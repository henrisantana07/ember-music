const fs = require('fs');
const p = 'src/components/Topbar/index.tsx';
const src = fs.readFileSync(p, 'utf8');
const lines = src.split(/\n/);

// find the line opening the Explorar button
let start = -1;
for (let i = 0; i < lines.length; i++) {
  if (/aria-label="Explorar"/.test(lines[i])) {
    // walk up to the containing button opening
    let j = i;
    while (j >= 0 && !/^            <button\s*$/m.test(lines[j])) j--;
    if (j >= 0) { start = j; break; }
  }
}
// find the matching closing tag line after start (the first '</button>' at <= 20-indent)
let close = -1;
for (let i = start; i < lines.length; i++) {
  if (/^            <\/button>\s*$/.test(lines[i])) { close = i; break; }
}

console.error('buttonOpen=' + start, 'buttonClose=' + close);

// Replace button -> details (still preserve inner Explorar action at top via first child)
if (start < 0 || close < 0) process.exit(1);

const before = lines.slice(0, start);
const inserted = [
  '            <details className="group relative flex-shrink-0" ref={libraryMenuRef}>',
  '              <summary className="h-8 w-8 inline-flex items-center justify-center rounded-full transition-colors hover:bg-white/10 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">',
  '                <svg className="w-4 h-4" style={{ color: pathname === "/buscar" ? "var(--text-primary)" : "var(--text-secondary)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={pathname === "/buscar" ? 2.5 : 2} aria-hidden="true">',
  '                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36z" />',
  '                </svg>',
  '              </summary>',
  '              <div className="absolute top-full right-0 mt-1 rounded-xl shadow-elevation-2 border border-outline-variant py-1 z-[70] overflow-hidden w-48" style={{ backgroundColor: "var(--bg-elevated)", transformOrigin: "top right" }}>',
  '                <div className="px-2 pt-1 pb-0.5 text-label-small uppercase tracking-widest" style={{ color: "var(--text-disabled)" }}>Classificar por</div>',
  '                <button type="button" onClick={() => { updateLibraryPrefs({ sort: "recent" }); setShowLibraryMenu(false) }} className={"w-full min-h-[32px] inline-flex items-center gap-2 px-2 text-left rounded-md transition-colors duration-200 " + (libraryPrefs.sort === "recent" ? "bg-state-hover text-[var(--accent-solid)] font-semibold" : "text-[var(--text-secondary)] hover:bg-state-hover hover:text-[var(--text-primary)]")} >',
  '                  <span className="flex-1 text-label-medium">Recentes</span>',
  '                  {libraryPrefs.sort === "recent" && <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}',
  '                </button>',
  '                <button type="button" onClick={() => { updateLibraryPrefs({ sort: "added" }); setShowLibraryMenu(false) }} className={"w-full min-h-[32px] inline-flex items-center gap-2 px-2 text-left rounded-md transition-colors duration-200 " + (libraryPrefs.sort === "added" ? "bg-state-hover text-[var(--accent-solid)] font-semibold" : "text-[var(--text-secondary)] hover:bg-state-hover hover:text-[var(--text-primary)]")} >',
  '                  <span className="flex-1 text-label-medium">Adicionados recentemente</span>',
  '                  {libraryPrefs.sort === "added" && <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}',
  '                </button>',
  '                <button type="button" onClick={() => { updateLibraryPrefs({ sort: "alphabetical" }); setShowLibraryMenu(false) }} className={"w-full min-h-[32px] inline-flex items-center gap-2 px-2 text-left rounded-md transition-colors duration-200 " + (libraryPrefs.sort === "alphabetical" ? "bg-state-hover text-[var(--accent-solid)] font-semibold" : "text-[var(--text-secondary)] hover:bg-state-hover hover:text-[var(--text-primary)]")} >',
  '                  <span className="flex-1 text-label-medium">Ordem alfabética</span>',
  '                  {libraryPrefs.sort === "alphabetical" && <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}',
  '                </button>',
  '                <button type="button" onClick={() => { updateLibraryPrefs({ sort: "creator" }); setShowLibraryMenu(false) }} className={"w-full min-h-[32px] inline-flex items-center gap-2 px-2 text-left rounded-md transition-colors duration-200 " + (libraryPrefs.sort === "creator" ? "bg-state-hover text-[var(--accent-solid)] font-semibold" : "text-[var(--text-secondary)] hover:bg-state-hover hover:text-[var(--text-primary)]")} >',
  '                  <span className="flex-1 text-label-medium">Criador</span>',
  '                  {libraryPrefs.sort === "creator" && <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}',
  '                </button>',
  '                <div className="px-2 pt-1 pb-0.5 text-label-small uppercase tracking-widest" style={{ color: "var(--text-disabled)" }}>Ver como</div>',
  '                <div className="grid grid-cols-3 gap-1 px-2 pb-1">',
  '                  <button type="button" onClick={() => { updateLibraryPrefs({ view: "compact" }); setShowLibraryMenu(false) }} className={"min-h-[32px] inline-flex items-center justify-center rounded-md transition-colors duration-200 " + (libraryPrefs.view === "compact" ? "bg-state-hover text-[var(--accent-solid)] font-semibold" : "text-[var(--text-secondary)] hover:bg-state-hover hover:text-[var(--text-primary)]")} aria-label="Compacto">',
  '                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 12h16M4 16h16" /></svg>',
  '                  </button>',
  '                  <button type="button" onClick={() => { updateLibraryPrefs({ view: "list" }); setShowLibraryMenu(false) }} className={"min-h-[32px] inline-flex items-center justify-center rounded-md transition-colors duration-200 " + (libraryPrefs.view === "list" ? "bg-state-hover text-[var(--accent-solid)] font-semibold" : "text-[var(--text-secondary)] hover:bg-state-hover hover:text-[var(--text-primary)]")} aria-label="Listagem detalhada">',
  '                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" /></svg>',
  '                  </button>',
  '                  <button type="button" onClick={() => { updateLibraryPrefs({ view: "grid" }); setShowLibraryMenu(false) }} className={"min-h-[32px] inline-flex items-center justify-center rounded-md transition-colors duration-200 " + (libraryPrefs.view === "grid" ? "bg-state-hover text-[var(--accent-solid)] font-semibold" : "text-[var(--text-secondary)] hover:bg-state-hover hover:text-[var(--text-primary)]")} aria-label="Grade compacta">',
  '                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" /></svg>',
  '                  </button>',
  '                </div>',
  '              </div>',
  '            </details>',
];
const after = lines.slice(close + 1);
const out = before.concat(inserted, after);
fs.writeFileSync(p, out.join('\n'));
console.log('done; replaced lines', start, 'to', close);