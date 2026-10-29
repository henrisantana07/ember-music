const fs=require('fs');
const p='src/components/Sidebar/index.tsx';
const L=fs.readFileSync(p,'utf8').split(/\n/);

function find(re,start=0){ for(let i=start;i<L.length;i++){ if(re.test(L[i])) return i;} return -1;}

const darkStart = find(/flex-none px-3 pb-1/,0);
const detailsStart = find(/<details className="group w-full/, 0);
const detailsClose = (() => { for (let i=detailsStart+1;i<L.length;i++) if (L[i].trim()==='</details>') return i; return -1; })();
const chipsOpen = find(/flex gap-1 px-2 py-1 min-w-0 overflow-x-auto/, detailsClose+1);

if ([darkStart,detailsStart,detailsClose,chipsOpen].some(x=>x<0)) { console.error('bad indices',darkStart,detailsStart,detailsClose,chipsOpen); process.exit(1); }

// panel content inside <details>: detail content lines [detailsStart+1 .. detailsClose-1] includes summary etc.
// We'll keep only summary trigger moved inside the dark box.
// rebuild region [darkStart .. chipsOpen-1] replacing everything with:
const block = [
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
'                className="flex-1 min-w-0 h-7 bg-transparent border-none outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-disabled)] focus:ring-0 max-w-[140px]"',
'              />',
'              <details className="group relative flex-shrink-0">',
'                <summary className="h-6 w-6 inline-flex items-center justify-center rounded-md cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden bg-[var(--surface-container-highest)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">',
'                  {prefs.view === "compact" ? (',
'                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>',
'                  ) : prefs.view === "list" ? (',
'                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" /></svg>',
'                  ) : (',
'                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" /></svg>',
'                  )}',
'                  <svg className="w-2.5 h-2.5 ml-0.5 flex-shrink-0 transition-transform duration-200 group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>',
'                </summary>',
'                <div className="absolute top-full right-0 mt-1 rounded-xl shadow-elevation-2 border border-outline-variant py-1 z-[70] overflow-hidden w-44" style={{ backgroundColor: "var(--bg-elevated)", transformOrigin: "top right" }}>',
'                  <div className="px-2 pt-1 pb-0.5 text-label-small uppercase tracking-widest" style={{ color: "var(--text-disabled)" }}>Classificar por</div>',
'                  <button type="button" onClick={() => updatePrefs({ sort: "recent" })} className={"w-full min-h-[28px] inline-flex items-center gap-2 px-2 text-left rounded-md transition-colors duration-200 " + (prefs.sort === "recent" ? "bg-state-hover text-[#4ade80] font-semibold" : "text-[var(--text-secondary)] hover:bg-state-hover hover:text-[var(--text-primary)]")}><span className="flex-1 text-label-small">Recentes</span>{prefs.sort === "recent" && <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{ color: "#4ade80" }} aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>}</button>',
'                  <button type="button" onClick={() => updatePrefs({ sort: "added" })} className={"w-full min-h-[28px] inline-flex items-center gap-2 px-2 text-left rounded-md transition-colors duration-200 " + (prefs.sort === "added" ? "bg-state-hover text-[#4ade80] font-semibold" : "text-[var(--text-secondary)] hover:bg-state-hover hover:text-[var(--text-primary)]")}><span className="flex-1 text-label-small">Adicionados recentemente</span>{prefs.sort === "added" && <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{ color: "#4ade80" }} aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>}</button>',
'                  <button type="button" onClick={() => updatePrefs({ sort: "alphabetical" })} className={"w-full min-h-[28px] inline-flex items-center gap-2 px-2 text-left rounded-md transition-colors duration-200 " + (prefs.sort === "alphabetical" ? "bg-state-hover text-[#4ade80] font-semibold" : "text-[var(--text-secondary)] hover:bg-state-hover hover:text-[var(--text-primary)]")}><span className="flex-1 text-label-small">Ordem alfabética</span>{prefs.sort === "alphabetical" && <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{ color: "#4ade80" }} aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>}</button>',
'                  <button type="button" onClick={() => updatePrefs({ sort: "creator" })} className={"w-full min-h-[28px] inline-flex items-center gap-2 px-2 text-left rounded-md transition-colors duration-200 " + (prefs.sort === "creator" ? "bg-state-hover text-[#4ade80] font-semibold" : "text-[var(--text-secondary)] hover:bg-state-hover hover:text-[var(--text-primary)]")}><span className="flex-1 text-label-small">Criador</span>{prefs.sort === "creator" && <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{ color: "#4ade80" }} aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>}</button>',
'                  <div className="px-2 pt-0.5 pb-0.5 text-label-small uppercase tracking-widest" style={{ color: "var(--text-disabled)" }}>Ver como</div>',
'                  <div className="grid grid-cols-3 gap-1 px-2 pb-1">',
'                    <button type="button" onClick={() => updatePrefs({ view: "compact" })} aria-label="Compacto" className={"min-h-[26px] inline-flex items-center justify-center rounded-md transition-colors duration-200 " + (prefs.view === "compact" ? "bg-state-hover text-[#4ade80] font-semibold" : "text-[var(--text-secondary)] hover:bg-state-hover hover:text-[var(--text-primary)]")}><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg></button>',
'                    <button type="button" onClick={() => updatePrefs({ view: "list" })} aria-label="Lista detalhada" className={"min-h-[26px] inline-flex items-center justify-center rounded-md transition-colors duration-200 " + (prefs.view === "list" ? "bg-state-hover text-[#4ade80] font-semibold" : "text-[var(--text-secondary)] hover:bg-state-hover hover:text-[var(--text-primary)]")}><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" /></svg></button>',
'                    <button type="button" onClick={() => updatePrefs({ view: "grid" })} aria-label="Grade compacta" className={"min-h-[26px] inline-flex items-center justify-center rounded-md transition-colors duration-200 " + (prefs.view === "grid" ? "bg-state-hover text-[#4ade80] font-semibold" : "text-[var(--text-secondary)] hover:bg-state-hover hover:text-[var(--text-primary)]")}><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" /></svg></button>',
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

// drop the original standalone panel and chips between dark start (outer wrapper at line wrapperStart+1? reports 377) and chipsOpen
// prefix = all lines BEFORE the dark-box outer wrapper.
const prefix = L.slice(0, wrapperStart);
// suffix starts at chipsOpen (exact)
const suffix = L.slice(chipsOpen);
const out = prefix.concat(block, suffix);
fs.writeFileSync(p, out.join('\n'));
console.log('done, removed standalone details, embedded trigger into dark box');