const fs = require('fs');
const f = fs.readFileSync('src/components/Topbar/index.tsx', 'utf8');
const L = f.split(/\n/);
let refStart = -1;
let detailsStart = -1;
let detailsEnd = -1;
for (let i = 0; i < L.length; i++) {
  if (refStart < 0 && /ref=\{libraryMenuRef\}/.test(L[i])) refStart = i;
  if (detailsStart < 0 && /<details className="group"/.test(L[i])) detailsStart = i;
  if (detailsEnd < 0 && detailsStart >= 0 && i > detailsStart && L[i].trim() === '</details>') detailsEnd = i;
}
console.log('refStart', refStart+1, 'detailsStart', detailsStart+1, 'detailsEnd', detailsEnd+1);
// find end of enclosing div containing libraryMenuRef
let closeDiv = -1;
for (let i = detailsEnd + 1; i < L.length; i++) {
  if (/^      <\/div>\s*$/.test(L[i])) { closeDiv = i; break; }
}
console.log('closeDiv', closeDiv+1);