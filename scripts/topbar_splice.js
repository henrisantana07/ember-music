const fs = require('fs');
const p = 'src/components/Topbar/index.tsx';
const t = fs.readFileSync(p, 'utf8');
const lines = t.split(/\n/);

// find the FIRST </form> at identical indent to the outer form's closing
let formClose = -1;
for (let i = 0; i < lines.length; i++) {
  if (/^        <\/form>$/.test(lines[i])) { formClose = i; break; }
}
let centerClose = -1;
for (let i = formClose + 1; i < lines.length; i++) {
  if (/^      <\/div>$/.test(lines[i])) { centerClose = i; break; }
}
console.error('formClose=', formClose + 1, 'centerClose=', centerClose + 1);
if (formClose < 0 || centerClose < 0) { process.exit(1); }

const details = [
  '        <details className="relative h-11 flex-shrink-0">',
  '          <summary className="h-11 w-11 inline-flex items-center justify-center rounded-full transition-colors hover:bg-state-hover state-layer cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden" title="Classificação e Visualização" aria-label="Classificação e Visualização">',
  '            <svg className="w-4 h-4" style={{ color: \'var(--text-secondary)\' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3" /></svg>',
  '          </summary>',
  '          <div className="absolute top-full right-0 mt-1 rounded-xl shadow-elevation-2 border border-outline-variant py-1 z-[70] overflow-hidden w-80" style={{ backgroundColor: \'var(--bg-elevated)\', transformOrigin: \'top right\' }}>',
  '            <div className="px-2 pt-1 pb-0.5 text-label-small uppercase tracking-widest" style={{ color: "var(--text-disabled)" }}>Classificar por</div>',
  '            <div className="px-1 pb-0.5 space-y-0.5">',
  '              <button type="button" onClick={() => updateLibraryPrefs({ sort: "recent" })} className={"w-full min-h-[34px] inline-flex items-center gap-2 px-2 text-left rounded-md transition-colors duration-200 " + (libraryPrefs.sort === "recent" ? "bg-state-hover text-[var(--accent-solid)] font-semibold" : "text-[var(--text-secondary)] hover:bg-state-hover hover:text-[var(--text-primary)]")}>' ,
  '                <span className="flex-1 text-label-medium">Recentes</span>',
  '                {libraryPrefs.sort === "recent" && <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}',
  '              </button>',
  '              <button type="button" onClick={() => updateLibraryPrefs({ sort: "added" })} className={"w-full min-h-[34px] inline-flex items-center gap-2 px-2 text-left rounded-md transition-colors duration-200 " + (libraryPrefs.sort === "added" ? "bg-state-hover text-[var(--accent-solid)] font-semibold" : "text-[var(--text-secondary)] hover:bg-state-hover hover:text-[var(--text-primary)]")}>' ,
  '                <span className="flex-1 text-label-medium">Adicionados recentemente</span>',
  '                {libraryPrefs.sort === "added" && <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}',
  '              </button>',
  '              <button type="button" onClick={() => updateLibraryPrefs({ sort: "alphabetical" })} className={"w-full min-h-[34px] inline-flex items-center gap-2 px-2 text-left rounded-md transition-colors duration-200 " + (libraryPrefs.sort === "alphabetical" ? "bg-state-hover text-[var(--accent-solid)] font-semibold" : "text-[var(--text-secondary)] hover:bg-state-hover hover:text-[var(--text-primary)]")}>' ,
  '                <span className="flex-1 text-label-medium">Ordem alfabética</span>',
  '                {libraryPrefs.sort === "alphabetical" && <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}',
  '              </button>',
  '              <button type="button" onClick={() => updateLibraryPrefs({ sort: "creator" })} className={"w-full min-h-[34px] inline-flex items-center gap-2 px-2 text-left rounded-md transition-colors duration-200 " + (libraryPrefs.sort === "creator" ? "bg-state-hover text-[var(--accent-solid)] font-semibold" : "text-[var(--text-secondary)] hover:bg-state-hover hover:text-[var(--text-primary)]")}>' ,
  '                <span className="flex-1 text-label-medium">Criador</span>',
  '                {libraryPrefs.sort === "creator" && <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}',
  '              </button>',
  '            </div>',
  '            <div className="px-2 pt-1 pb-0.5 text-label-small uppercase tracking-widest" style={{ color: \'var(--text-disabled)\' }}>Ver como</div>',
  '            <div className="grid grid-cols-3 gap-1 px-2 pb-1">',
  '              <button type="button" onClick={() => updateLibraryPrefs({ view: "compact" })} className="min-h-[32px] inline-flex items-center justify-center rounded-md transition-colors duration-200 ' + (libraryPrefs.view === "compact" ? "bg-state-hover text-[var(--accent-solid)] font-semibold" : "text-[var(--text-secondary)] hover:bg-state-hover hover:text-[var(--text-primary)]") + " " + ((libraryPrefs.view === "compact") ? "bg-state-hover text-[var(--accent-solid)] font-semibold" : "text-[var(--text-secondary)] hover:bg-state-hover hover:text-[var(--text-primary)]")} aria-label="Compacto">',
  '                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 12h16M4 16h16" /></svg>',
  '              </button>',
  '              <button type="button" onClick={() => updateLibraryPrefs({ view: "list" })} className="min-h-[32px] inline-flex items-center justify-center rounded-md transition-colors duration-200 ' + (libraryPrefs.view === "list" ? "bg-state-hover text-[var(--accent-solid)] font-semibold" : "text-[var(--text-secondary)] hover:bg-state-hover hover:text-[var(--text-primary)]")} aria-label="Lista detalhada">',
  '                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" /></svg>',
  '              </button>',
  '              <button type="button" onClick={() => updateLibraryPrefs({ view: "grid" })} className="min-h-[32px] inline-flex items-center justify-center rounded-md transition-colors duration-200 ' + (libraryPrefs.view === "grid" ? "bg-state-hover text-[var(--accent-solid)] font-semibold" : "text-[var(--text-secondary)] hover:bg-state-hover hover:text-[var(--text-primary)]")} aria-label="Grade compacta">',
  '                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" /></svg>',
  '              </button>',
  '            </div>',
  '          </div>',
  '        </details>',
];
// guard: skip if already has the details (an update)
const already = t.includes('Classifica');
if (already) { console.error('already present, skip'); process.exit(0); }
const pre = lines.slice(0, formClose + 1);
const post = lines.slice(centerClose);
const out = pre.concat(inserted, post);
fs.writeFileSync(p, out.join('\n'));
console.log('inserted', inserted.length, 'lines');