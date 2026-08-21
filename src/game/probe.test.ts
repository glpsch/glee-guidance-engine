import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "./config";
import { createBoard, emptyCounts, makePlate } from "./board";
import { resolveBoard } from "./resolve";
import type { Board, GameSettings } from "./types";

const Y = 2;
const R = 0;

function mk(w: number, h: number): GameSettings {
  return { ...DEFAULT_SETTINGS, boardWidth: w, boardHeight: h };
}
function plate(s: GameSettings, spec: Record<number, number>) {
  const counts = emptyCounts(s.cakeTypes);
  Object.entries(spec).forEach(([t, n]) => (counts[Number(t)] = n));
  return makePlate(counts);
}
function board(s: GameSettings, e: Record<number, Record<number, number>>): Board {
  const b = createBoard(s.boardWidth, s.boardHeight);
  Object.entries(e).forEach(([i, spec]) => (b.cells[Number(i)] = plate(s, spec)));
  return b;
}
const dump = (b: Board) =>
  b.cells.map((p) => (p ? p.counts.map((n, i) => (n ? `${i}x${n}` : "")).filter(Boolean).join("+") : "."));

describe("probe", () => {
  const s = mk(3, 3);

  it("A: pure 3 next to pure 1", () => {
    const r = resolveBoard(board(s, { 3: { [Y]: 3 }, 4: { [Y]: 1 } }), s, null);
    console.log("A", dump(r.finalBoard));
  });

  it("B: 2/2/2 row", () => {
    const r = resolveBoard(board(s, { 3: { [Y]: 2 }, 4: { [Y]: 2 }, 5: { [Y]: 2 } }), s, null);
    console.log("B", dump(r.finalBoard), r.completions);
  });

  it("C: pure 4 next to mixed 2Y+1R", () => {
    const r = resolveBoard(board(s, { 3: { [Y]: 4 }, 4: { [Y]: 2, [R]: 1 } }), s, null);
    console.log("C", dump(r.finalBoard), r.completions);
  });

  it("D: equal piles 3/3 non-completing with blocker", () => {
    const r = resolveBoard(board(s, { 3: { [Y]: 3, [R]: 1 }, 4: { [Y]: 3, [R]: 1 } }), s, null);
    console.log("D", dump(r.finalBoard), r.completions);
  });

  it("E: spread 1/1/1/1 across a row", () => {
    const r = resolveBoard(
      board(s, { 0: { [Y]: 1 }, 1: { [Y]: 1 }, 2: { [Y]: 1 }, 5: { [Y]: 1 } }),
      s,
      null,
    );
    console.log("E", dump(r.finalBoard));
  });

  it("F: big pile should feed a completing neighbour", () => {
    const r = resolveBoard(board(s, { 3: { [Y]: 5 }, 4: { [Y]: 4 } }), s, null);
    console.log("F", dump(r.finalBoard), r.completions);
  });
});
