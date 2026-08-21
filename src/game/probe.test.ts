import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, PLATE_CAPACITY } from "./config";
import { createBoard, emptyCounts, makePlate, neighbors, pieceCount } from "./board";
import { resolveBoard } from "./resolve";
import type { Board, GameSettings } from "./types";

function mk(w: number, h: number): GameSettings {
  return { ...DEFAULT_SETTINGS, boardWidth: w, boardHeight: h };
}
const dump = (b: Board) =>
  b.cells.map((p) =>
    p ? p.counts.map((n, i) => (n ? `${i}x${n}` : "")).filter(Boolean).join("+") : ".",
  );

function randomBoard(s: GameSettings): Board {
  const b = createBoard(s.boardWidth, s.boardHeight);
  for (let i = 0; i < b.cells.length; i += 1) {
    if (Math.random() < 0.35) continue;
    const counts = emptyCounts(s.cakeTypes);
    const pieces = 1 + Math.floor(Math.random() * PLATE_CAPACITY);
    for (let p = 0; p < pieces; p += 1) {
      const c = Math.floor(Math.random() * s.cakeTypes);
      counts[c] = (counts[c] ?? 0) + 1;
    }
    b.cells[i] = makePlate(counts);
  }
  return b;
}

/** adjacent pairs sharing a colour where at least one side has free room */
function unconsolidated(b: Board): string[] {
  const out: string[] = [];
  b.cells.forEach((p, i) => {
    if (!p) return;
    for (const n of neighbors(b, i)) {
      if (n < i) continue;
      const q = b.cells[n];
      if (!q) continue;
      p.counts.forEach((have, c) => {
        if (have <= 0 || (q.counts[c] ?? 0) <= 0) return;
        const roomP = PLATE_CAPACITY - pieceCount(p);
        const roomQ = PLATE_CAPACITY - pieceCount(q);
        if (roomP > 0 || roomQ > 0) out.push(`${i}<->${n} color ${c}`);
      });
    }
  });
  return out;
}

describe("probe: stable boards should be consolidated", () => {
  it("scans random cascades", () => {
    const s = mk(4, 5);
    const bad: string[] = [];
    for (let run = 0; run < 200; run += 1) {
      const start = randomBoard(s);
      const active = start.cells.findIndex((c) => c !== null);
      const res = resolveBoard(start, s, active === -1 ? null : active);
      const u = unconsolidated(res.finalBoard);
      if (u.length) bad.push(`${dump(res.finalBoard).join("|")}  >> ${u.join(", ")}`);
    }
    console.log("unconsolidated final boards:", bad.length, "/200");
    console.log(bad.slice(0, 5).join("\n"));
    expect(true).toBe(true);
  });
});
