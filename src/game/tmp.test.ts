import { describe, it, expect } from "vitest";
import { DEFAULT_SETTINGS } from "@/game/config";
import { createBoard, emptyCounts, makePlate } from "@/game/board";
import { resolveBoard } from "@/game/resolve";
const s = { ...DEFAULT_SETTINGS, boardWidth: 3, boardHeight: 3 };
const G = 3;
function plate(spec: Record<number, number>) { const c = emptyCounts(s.cakeTypes); Object.entries(spec).forEach(([t,n])=>c[+t]=n); return makePlate(c); }
function board(e: Record<number, Record<number, number>>) { const b = createBoard(3,3); Object.entries(e).forEach(([i,sp])=>b.cells[+i]=plate(sp)); return b; }
describe("x", () => {
 it("two cakes", () => {
  const b = board({3:{[G]:5},4:{[G]:3},5:{[G]:4}});
  const r = resolveBoard(b, s, 4);
  console.log("completions", r.completions, r.finalBoard.cells.map(p=>p?p.counts.join(""):"-"));
  expect(r.completions).toBe(2);
 });
 it("chain", () => {
  const b = board({0:{[G]:4},1:{[G]:4},2:{[G]:4}});
  const r = resolveBoard(b, s, 1);
  console.log("chain", r.completions, r.finalBoard.cells.map(p=>p?p.counts.join(""):"-"));
 });
});
describe("dbg", () => { it("d", () => {
 const b = board({3:{[G]:5},4:{[G]:3},5:{[G]:4}});
 const r = resolveBoard(b, s, 4);
 r.snapshots.forEach((sn,i)=>console.log(i, JSON.stringify(sn.moves), "completed", sn.completed, sn.board.cells.map(p=>p?p.counts[G]:"-").join("|")));
});});
