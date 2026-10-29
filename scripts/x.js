const fs = require('fs');
const p = 'src/components/Sidebar/index.tsx';
const L = fs.readFileSync(p, 'utf8').split(/\n/);

function findLine(re, start=0){
  for(let i=start;i<L.length;i++){ if(re.test(L[i])) return i; }
  return -1;
}

const darkBox = L.findIndex(l=>l.trim() === '</div>' && L.indexOf('flex-none px-3 pb-1') >= 0);
// find outer wrapper start reliably by style line
let outerStart = -1, outerClose=-1, detailsStart=-1, detailsClose=-1, chips=-1;
for(let i=0;i<L.length;i++){
  if(outerStart<0 && /flex-none px-3 pb-1/.test(L[i])) outerStart=i;
  if(detailsStart<0 && /<details className="group w-full/.test(L[i])) detailsStart=i;
  if(detailsStart>=0 && detailsClose<0 && L[i].trim()==='</details>') detailsClose=i;
  if(chips<0 && /flex gap-1 px-2 py-1 min-w-0 overflow-x-auto/.test(L[i])) chips=i;
  if(outerStart>=0 && outerClose<0 && outerClose===-1 && i>outerStart+3 && L[i].trim()==='</div>') {
    // the third </div> after start? choose the first details open follows.
  }
}
let outerCloseLine = -1;
// outer details wrapper ends where closing </details> is; pick detailsClose+1 (the next line) then chip at chips.
console.log(JSON.stringify({outerStart,detailsStart,detailsClose,chips}));
if(outerStart<0||detailsStart<0||detailsClose<0||chips<0){console.error('missing boundaries');process.exit(1);}

// We want to replace lines outerStart..(detailsClose) and the following chips stays.
// Build new lines: keep prefix (0..outerStart-1), then:
const newBlock = [];

const prefix = L.slice(0, outerStart);
const suffix = L.slice(chips);
const result = prefix.concat(newBlock, suffix);
console.log('we skip attempt for safety; no write performed')