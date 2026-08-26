import { DEFAULT_SETTINGS } from "./src/game/config";
import { createBoard, emptyCounts, makePlate } from "./src/game/board";
import { resolveBoard } from "./src/game/resolve";
const s={...DEFAULT_SETTINGS,boardWidth:4,boardHeight:5};
function pl(spec:Record<number,number>){const c=emptyCounts(s.cakeTypes);for(const[k,v]of Object.entries(spec))c[+k]=v;return makePlate(c);}
function show(b:any){let o="";for(let r=0;r<5;r++){o+=[0,1,2,3].map(c=>{const p=b.cells[r*4+c];return p?p.counts.map((n:number,i:number)=>n?`${i}x${n}`:"").filter(Boolean).join(",")||"-":"."}).map(x=>x.padEnd(10)).join("|")+"\n";}return o;}
for (const [l,m,r] of [[3,2,3],[3,3,3],[4,2,4],[5,2,5],[2,2,2]] as any) {
  const b=createBoard(4,5);
  b.cells[4]=pl({3:l}); b.cells[5]=pl({3:m}); b.cells[6]=pl({3:r});
  const res=resolveBoard(b,s,5);
  console.log("== ",l,m,r,"completions",res.completions);
  console.log(show(res.finalBoard));
}
