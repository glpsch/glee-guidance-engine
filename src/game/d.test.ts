import { describe, it } from "vitest";
import { DEFAULT_SETTINGS } from "/dev-server/src/game/config";
import { createBoard, emptyCounts, makePlate } from "/dev-server/src/game/board";
import { resolveBoard, collectCandidates } from "/dev-server/src/game/resolve";
const s = { ...DEFAULT_SETTINGS, boardWidth: 3, boardHeight: 3 };
const p = (spec: Record<number, number>) => { const c = emptyCounts(s.cakeTypes); Object.entries(spec).forEach(([t,n])=>c[Number(t)]=n); return makePlate(c); };
describe("d", () => { it("x", () => {
  const b = createBoard(3,3);
  b.cells[4] = p({2:1,4:1}); b.cells[1] = p({2:2}); b.cells[3] = p({4:2});
  console.log(JSON.stringify(collectCandidates(b, s, 4)));
  const r = resolveBoard(b, s, 4);
  console.log(r.snapshots.map(sn=>JSON.stringify(sn.moves)).join("\n"));
  console.log(r.finalBoard.cells.map(c=>c?c.counts.join(""):".").join("|"));
});});
