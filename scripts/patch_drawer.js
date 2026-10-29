const fs=require('fs');
const p='src/components/Sidebar/index.tsx';
const lines=fs.readFileSync(p,'utf8').split(/\n/);
function findLine(re, start=0){ for(let i=start;i<lines.length;i++){ if(re.test(lines[i])) return i; } return -1; }

const start = findLine(/<div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-2 space-y-0.5" role="list" aria-label="Itens da biblioteca">/);
const id = findLine(/