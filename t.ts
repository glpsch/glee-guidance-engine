import { DEFAULT_SETTINGS } from "./src/game/config";
import { createBoard, emptyCounts, makePlate, neighbors } from "./src/game/board";
import { resolveBoard } from "./src/game/resolve";
const s={...DEFAULT_SETTINGS,boardWidth:4,boardHeight:5};
function pl(spec:Record<number,number>){const c=emptyCounts(s.cakeTypes);for(const[k,v]of Object.entries(spec))c[+k]=v;return makePlate(c);}
function show(b:any){let o="";for(let r=0;r<5;r++){o+=[0,1,2,3].map(c=>{const p=b.cells[r*4+c];return p?p.counts.map((n:number,i:number)=>n?`${i}x${n}`:"").filter(Boolean).join(",")||"-":"."}).map(x=>x.padEnd(12)).join("|")+"\n";}return o;}
let rnd=1; const rand=()=>{rnd=(rnd*1103515245+12345)%2147483648;return rnd/2147483648;};
let bad=0;
for(let trial=0;trial<400;trial++){
  const b=createBoard(4,5);
  for(let i=0;i<20;i++){ if(rand()<0.5) continue; const n=1+Math.floor(rand()*5); const spec:any={}; let left=n; while(left>0){const c=Math.floor(rand()*3); spec[c]=(spec[c]||0)+1; left--;} b.cells[i]=pl(spec); }
  const res=resolveBoard(b,s,null);
  const f=res.finalBoard;
  // check leftover adjacency sharing colour
  for(let i=0;i<20;i++){const p=f.cells[i]; if(!p)continue; for(const j of neighbors(f,i)){ if(j<i)continue; const q=f.cells[j]; if(!q)continue; for(let c=0;c<3;c++) if(p.counts[c]>0&&q.counts[c]>0){ if(bad<3){console.log("UNCONSOLIDATED trial",trial,"cells",i,j,"color",c);console.log(show(f));} bad++; c=99; } } }
}
console.log("bad pairs",bad);
