import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "./config";
import { createBoard, emptyCounts, makePlate } from "./board";
import { resolveBoard } from "./resolve";
import { scoreForCascade } from "./scoring";
import type { Board, GameSettings } from "./types";

const settings: GameSettings = { ...DEFAULT_SETTINGS, boardWidth: 3, boardHeight: 3 };

const RED = 0;
const YELLOW = 2;
const GREEN = 3;
const BLUE = 4;

function plate(spec: Record<number, number>) {
  const counts = emptyCounts(settings.cakeTypes);
  Object.entries(spec).forEach(([type, n]) => {
    counts[Number(type)] = n;
  });
  return makePlate(counts);
}

function board(entries: Record<number, Record<number, number>>): Board {
  const b = createBoard(settings.boardWidth, settings.boardHeight);
  Object.entries(entries).forEach(([idx, spec]) => {
    b.cells[Number(idx)] = plate(spec);
  });
  return b;
}

function counts(b: Board, idx: number, color: number): number {
  return b.cells[idx]?.counts[color] ?? 0;
}

describe("Rule 8 — a mixed active plate can lose its pieces", () => {
  it("sends each colour to its pure neighbour", () => {
    // NEW at 4 (centre), A at 1 (pure yellow), B at 3 (pure blue)
    const b = board({
      4: { [YELLOW]: 1, [BLUE]: 1 },
      1: { [YELLOW]: 2 },
      3: { [BLUE]: 2 },
    });
    const { finalBoard } = resolveBoard(b, settings, 4);
    expect(counts(finalBoard, 1, YELLOW)).toBe(3);
    expect(counts(finalBoard, 3, BLUE)).toBe(3);
    expect(finalBoard.cells[4]).toBeNull();
  });

  it("attracts yellow when no purer alternative exists", () => {
    const b = board({
      4: { [YELLOW]: 1, [BLUE]: 1 },
      1: { [YELLOW]: 2, [GREEN]: 1 },
      3: { [BLUE]: 2 },
    });
    const { finalBoard } = resolveBoard(b, settings, 4);
    expect(counts(finalBoard, 4, YELLOW)).toBe(3);
    expect(counts(finalBoard, 4, BLUE)).toBe(0);
    expect(counts(finalBoard, 3, BLUE)).toBe(3);
  });
});

describe("Rule 9 — single-colour destinations win", () => {
  it("prefers the pure yellow plate over the mixed one", () => {
    const b = board({
      4: { [YELLOW]: 1, [RED]: 1 },
      1: { [YELLOW]: 3 },
      3: { [YELLOW]: 1, [RED]: 1 },
    });
    const { finalBoard } = resolveBoard(b, settings, 4);
    // all yellow ends up on the pure plate, never on the mixed one
    expect(counts(finalBoard, 1, YELLOW)).toBe(5);
    expect(counts(finalBoard, 3, YELLOW)).toBe(0);
  });
});

describe("Rules 12/13/14 — quantity, completion and stepping stone", () => {
  it("completes a cake and clears the plate", () => {
    const b = board({ 4: { [YELLOW]: 5 }, 1: { [YELLOW]: 1 } });
    const { finalBoard, completions } = resolveBoard(b, settings, 4);
    expect(completions).toBe(1);
    expect(finalBoard.cells[4]).toBeNull();
    expect(finalBoard.cells[1]).toBeNull();
  });

  it("redirects leftovers when the destination fills up", () => {
    // centre completes with one piece; the rest must go somewhere else
    const b = board({
      4: { [YELLOW]: 5 },
      1: { [YELLOW]: 2 },
      7: { [YELLOW]: 2 },
    });
    const { finalBoard, completions } = resolveBoard(b, settings, 4);
    expect(completions).toBe(1);
    const remaining = finalBoard.cells.reduce((sum, p) => sum + (p?.counts[YELLOW] ?? 0), 0);
    expect(remaining).toBe(3);
  });
});

describe("Rule 16 — obstructions block completion, not movement", () => {
  it("consolidates around an obstruction, then completes once it moves", () => {
    // A(1): 3 yellow + red + blue, B(4): 3 yellow + green, C(7): green
    const b = board({
      1: { [YELLOW]: 3, [RED]: 1, [BLUE]: 1 },
      4: { [YELLOW]: 3, [GREEN]: 1 },
      7: { [GREEN]: 1 },
    });
    const { finalBoard, completions } = resolveBoard(b, settings, null);
    expect(completions).toBe(1);
    expect(counts(finalBoard, 7, GREEN)).toBe(2);
  });
});

describe("Rule 23 — resolution terminates", () => {
  it("reaches a stable board without looping", () => {
    const b = board({
      0: { [YELLOW]: 2, [RED]: 1 },
      1: { [YELLOW]: 2, [BLUE]: 1 },
      2: { [RED]: 2 },
      3: { [BLUE]: 2, [GREEN]: 1 },
      4: { [GREEN]: 2, [YELLOW]: 1 },
    });
    const first = resolveBoard(b, settings, null);
    const second = resolveBoard(b, settings, null);
    expect(first.finalBoard.cells.map((p) => p?.counts)).toEqual(
      second.finalBoard.cells.map((p) => p?.counts),
    );
    const again = resolveBoard(first.finalBoard, settings, null);
    expect(again.snapshots.length).toBe(0);
  });
});

describe("Rule 26 — scoring", () => {
  it("matches the specified values", () => {
    expect(scoreForCascade(1)).toBe(100);
    expect(scoreForCascade(2)).toBe(500);
    expect(scoreForCascade(3)).toBe(5000);
    expect(scoreForCascade(4)).toBe(7500);
    expect(scoreForCascade(6)).toBe(12500);
  });
});
