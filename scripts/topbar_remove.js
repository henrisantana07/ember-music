const fs = require('fs');
const p = 'src/components/Topbar/index.tsx';
const t = fs.readFileSync(p, 'utf8');
const L = t.split(/\n/);
const start = L.findIndex(l => l.includes('Classificação + Visualização embedded'));
const refStart = L.findIndex((l,i) => i>start && l.includes('ref={libraryMenuRef}'));
let detailsEnd = -1;
for (let i=refStart; i<L.length; i++) { if (L[i].trim() === '</details>') { detailsEnd=i; break; } }
let centerClose = -1;
for (let i=detailsEnd+1; i<L.length; i++) { if (L[i].trim() === '</div>') { centerClose=i; break; } }
console.log('start', start+1, 'ref', refStart+1, 'detailsEnd', detailsEnd+1, 'centerClose', centerClose+1);

const out = L.slice(0, start-1).concat(L.slice(centerClose+1));
fs.writeFileSync(p, out.join('\n'));
console.log('done, new lines', out.length);