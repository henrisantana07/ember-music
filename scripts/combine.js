const fs = require('fs');
const p = 'src/components/Sidebar/index.tsx';
const L = fs.readFileSync(p, 'utf8').split(/\n/);

function findLine(re, start=0){ for(let i=start;i<L.length;i++){ if(re.test(L[i])) return i; } return -1; }

const darkStart = findLine(/flex-none px-3 pb-1 /);
const standaloneDetails = findLine(/<details className="group w-full min-\[240px\]/);
const chipsOpen = findLine(/flex gap-1 px-2 py-1 min-w-0 overflow-x-auto/);

console.error('darkStart',darkStart,'standaloneDetails',standaloneDetails,'chipsOpen',chipsOpen);
if (darkStart<0 || standaloneDetails<0 || chipsOpen<0) process.exit(1);

// keep everything before dark box
const prefix = L.slice(0, darkStart);

// find end of dark box (the </div> that follows input close)
let darkClose = -1;
for (let i = darkStart+1; i < L.length; i++){
  if (L[i].trim() === '</div>' && L[i-1].trim() === '</input>'.replace('input','')) continue;
  if (/^\s*<\/div>\s*$/.test(L[i]) && i > darkStart+10) { darkClose = i; break; }
}
if (darkClose < 0) { console.error('darkClose missing'); process.exit(1); }

// find chips close
let chipsClose = chipsOpen;
// chips block ends at the next </div> after chipsOpen
for (let i=chipsOpen+1;i<L.length;i++){ if (/^\s*<\/div>\s*$/.test(L[i])) { chipsClose=i; break;} }
if (chipsClose < 0) { console.error('chips close missing'); process.exit(1); }

// find sort/view arrays
const viewIdx = findLine(/const SORT_OPTIONS = \[/, 0);
const viewArrEnd = findLine(/^\]$/, viewIdx+1);
const sortIdx = findLine(/const SORT_OPTIONS = \[/, viewArrEnd+1);
const sortArrEnd = findLine(/^\]$/, sortIdx+1);
console.error('viewI',viewIdx,'viewE',viewArrEnd,'sortI',sortIdx,'sortE',sortArrEnd);

// Build black box with inline details icon trigger
const darkBlock = [
'          <div className="flex-none px-3 pb-1">',
'            <div className="flex items-center gap-2 rounded-md px-2 h-8 relative" style={{ backgroundColor: "#121212" }}>',
'              <svg className="w-4 h-4 flex-shrink-0 pointer-events-none" style={{ color: "var(--text-disabled)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">',
'                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />',
'              </svg>',
'              <input',
'                value={query}',
'                onChange={(e) => setQuery(e.target.value)}',
'                placeholder="Buscar na biblioteca"',
'                aria-label="Buscar musicas, albuns ou artistas"',
'                className="flex-1 min-w-0 h-7 bg-transparent border-none outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-disabled)] focus:ring-0"',
'              />',
'              <details className="group relative flex-shrink-0">',
'                <summary className="h-6 w-6 inline-flex items-center justify-center rounded-md cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden bg-[var(--surface-container-highest)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">',
'                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">',
'                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />',
'                  </svg>',
'                </summary>',
'                <div className="absolute bottom-full right-0 mb-1 rounded-xl shadow-elevation-2 border border-outline-variant py-1 z-[70] overflow-hidden w-44" style={{ backgroundColor: "var(--bg-elevated)", transformOrigin: "bottom right" }}>',
'                  <div className="px-2 pt-1 pb-0.5 text-label-small uppercase tracking-widest" style={{ color: "var(--text-disabled)" }}>Visualizacao</div>',
'                  <div className="flex gap-1 px-1 pb-0.5">',
'                    <button type="button" onClick={() => updatePrefs({ view: "compact" })} aria-label="Compacto" className={"flex-1 min-h-[28px] inline-flex items-center justify-center rounded-md transition-colors duration-200 " + (prefs.view === "compact" ? "bg-state-hover text-[#4ade80] font-semibold" : "text-[var(--text-secondary)] hover:bg-state-hover hover:text-[var(--text-primary)]")}><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg></button>',
'                    <button type="button" onClick={() => updatePrefs({ view: "list" })} aria-label="Lista detalhada" className={"flex-1 min-h-[28px] inline-flex items-center justify-center rounded-md transition-colors duration-200 " + (prefs.view === "list" ? "bg-state-hover text-[#4ade80] font-semibold" : "text-[var(--text-secondary)] hover:bg-state-hover hover:text-[var(--text-primary)]")}><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" /></svg></button>',
'                    <button type="button" onClick={() => updatePrefs({ view: "grid" })} aria-label="Grade compacta" className={"flex-1 min-h-[28px] inline-flex items-center justify-center rounded-md transition-colors duration-200 " + (prefs.view === "grid" ? "bg-state-hover text-[#4ade80] font-semibold" : "text-[var(--text-secondary)] hover:bg-state-hover hover:text-[var(--text-primary)]")}><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" /></svg></button>',
'                  </div>',
'                  <hr className="mx-2 my-1" style={{ backgroundColor: "var(--outline-variant)" }} />',
'                  <div className="px-2 pt-0.5 pb-0.5 text-label-small uppercase tracking-widest" style={{ color: "var(--text-disabled)" }}>Ordenacao</div>',
'                  <div className="px-1 pb-0.5 space-y-0.5">',
'                    <button type="button" onClick={() => updatePrefs({ sort: "recent" })} className={"w-full min-h-[28px] inline-flex items-center gap-2 px-2 rounded-md transition-colors duration-200 text-left " + (prefs.sort === "recent" ? "bg-state-hover text-[#4ade80] font-semibold" : "text-[var(--text-secondary)] hover:bg-state-hover hover:text-[var(--text-primary)]")}><span className="flex-1">Recentes</span>{prefs.sort === "recent" && <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{ color: "#4ade80" }} aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>}</button>',
'                    <button type="button" onClick={() => updatePrefs({ sort: "added" })} className={"w-full min-h-[28px] inline-flex items-center gap-2 px-2 rounded-md transition-colors duration-200 text-left " + (prefs.sort === "added" ? "bg-state-hover text-[#4ade80] font-semibold" : "text-[var(--text-secondary)] hover:bg-state-hover hover:text-[var(--text-primary)]")}><span className="flex-1">Adicionados recentemente</span>{prefs.sort === "added" && <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{ color: "#4ade80" }} aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>}</button>',
'                    <button type="button" onClick={() => updatePrefs({ sort: "alphabetical" })} className={"w-full min-h-[28px] inline-flex items-center gap-2 px-2 rounded-md transition-colors duration-200 text-left " + (prefs.sort === "alphabetical" ? "bg-state-hover text-[#4ade80] font-semibold" : "text-[var(--text-secondary)] hover:bg-state-hover hover:text-[var(--text-primary)]")}><span className="flex-1">Ordem alfabetica</span>{prefs.sort === "alphabetical" && <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{ color: "#4ade80" }} aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>}</button>',
'                    <button type="button" onClick={() => updatePrefs({ sort: "creator" })} className={"w-full min-h-[28px] inline-flex items-center gap-2 px-2 rounded-md transition-colors duration-200 text-left " + (prefs.sort === "creator" ? "bg-state-hover text-[#4ade80] font-semibold" : "text-[var(--text-secondary)] hover:bg-state-hover hover:text-[var(--text-primary)]")}><span className="flex-1">Criador</span>{prefs.sort === "creator" && <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{ color: "#4ade80" }} aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>}</button>',
'                  </div>',
'                </div>',
'              </details>',
'            </div>',
'          </div>',
'          <div className="flex gap-1 px-2 py-1 min-w-0 overflow-x-auto">',
'            {TYPE_FILTERS.map(filter => (',
'              <FilterChip key={filter.value} selected={typeFilter === filter.value} onClick={() => setTypeFilter(typeFilter === filter.value ? null : filter.value)} className="h-7 flex-shrink-0">{filter.label}</FilterChip>',
'            ))}',
'          </div>'
];

const prefix = L.slice(0, wrapperStart);
const suffix = L.slice(chipsOpen);
const out = prefix.concat(block);
fs.writeFileSync(p, out.join('\n'));
console.log('done');