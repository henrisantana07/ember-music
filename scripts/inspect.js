const fs = require('fs');
const p = 'src/components/Sidebar/index.tsx';
const L = fs.readFileSync(p,'utf8').split(/\n/);
const markers = [
 'flex-none px-3 pb-1',
 '</details>',
 'flex gap-1 px-2 py-1 min-w-0 overflow-x-auto',
];
let i0=-1,i1=-1,i2=-1;
for (let i=0;i<L.length;i++) {
  if (i0<0 && L[i].includes('flex-none px-3 pb-1')) i0=i;
  if (i1<0 && L[i].trim()==='</details>') i1=i;
  if (i2<0 && L[i].includes('flex gap-1 px-2 py-1 min-w-0 overflow-x-auto')) i2=i;
}
console.log('wrapper='+i0,'detailsClose='+i1,'chipsOpen='+i2);
// print a few lines
for (let i=i0;i<=i2;i++) console.log(i+1, L[i]);