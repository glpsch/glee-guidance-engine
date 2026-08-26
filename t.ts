import { DEFAULT_SETTINGS } from "./src/game/config";
import { createBoard, emptyCounts, makePlate } from "./src/game/board";
import { resolveBoard } from "./src/game/resolve";
const s={...DEFAULT_SETTINGS,boardWidth:4,boardHeight:5};
function pl(spec:Record<number,number>){const c=emptyCounts(s.cakeTypes);for(const[k,v]of Object.entries(spec))c[+k]=v;return makePlate(c);}
function show(b:any){let o="";for(let r=1;r<3;r++){o+=[0,1,2,3].map(c=>{const p=b.cells[r*4+c];return p?p.counts.map((n:number,i:number)=>n?`${i}x${n}`:"").filter(Boolean).join(",")||"-":"."}).map(x=>x.padEnd(12)).join("|")+"\n";}return o;}
function run(name:string,cells:Record<number,any>,active:number){
  const b=createBoard(4,5); for(const[k,v] of Object.entries(cells)) b.cells[+k]=pl(v as any);
  const r=resolveBoard(b,s,active);
  console.log("###",name,"completions",r.completions);
  r.snapshots.forEach((sn,i)=>console.log(" tick",i,JSON.stringify(sn.moves)));
  console.log(show(r.finalBoard));
}
run("g4 | g2r2 | g4",{4:{2:4},5:{2:2,0:2},6:{2:4}},5);
run("g5 | g1r1 | g5",{4:{2:5},5:{2:1,0:1},6:{2:5}},5);
run("g3r1 | g3 | g3r1",{4:{2:3,0:1},5:{2:3},6:{2:3,0:1}},5);
run("g4 | g4 | g4 (col too)",{4:{2:4},5:{2:4},6:{2:4}},5);
