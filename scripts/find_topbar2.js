const fs = require('fs');
const t = fs.readFileSync('src/components/Topbar/index.tsx', 'utf8');
const L = t.split(/\n/);
let start = L.findIndex(l => /^\s*\/\* Classifica/.test(l));
let ref = L.findIndex(l => /ref=\{libraryMenuRef\}/.test(l));
let de = -1;
for (let i=ref;i<L.length;i++){ if(L[i].trim()==='</details>'){de=i;break;} }
let cc=-1;
for(let i=de+1;i<L.length;i++){ if(L[i].trim()==='</div>'){cc=i;break;} }
console.log('start',start+1,'ref',ref+1,'detailsEnd',de+1,'centerClose',cc+1);
[0,-1,0].forEach(()=>{});
console.log(JSON.stringify(L[ref-1]));
console.log(JSON.stringify(L[start-1]));
console.log(JSON.stringify(L[de+1]));
console.log(JSON.stringify(L[cc]));
console.log(JSON.stringify(L[cc+1]));