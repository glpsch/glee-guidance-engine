import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, PLATE_CAPACITY } from "./config";
import { createBoard, emptyCounts, isBoardFull, makePlate, neighbors, pieceCount } from "./board";
import { generateStartingBoard, generateServedPlate } from "./generate";
import { collectCandidates, resolveBoard } from "./resolve";
import { compareRanks, destinationRank } from "./ranking";
import { scoreForCascade } from "./scoring";
import type { Board, GameSettings } from "./types";

/**
 * Rule-by-rule conformance suite for Cake Sort spec v0.4.
 * Every describe() maps to a numbered rule in the specification.
 */

const RED = 0;
const ORANGE = 1;
const YELLOW = 2;
const GREEN = 3;
const BLUE = 4;

function mk(width: number, height: number, extra: Partial<GameSettings> = {}): GameSettings {
  return { ...DEFAULT_SETTINGS, boardWidth: width, boardHeight: height, ...extra };
}

function plate(s: GameSettings, spec: Record<number, number>) {
  const counts = emptyCounts(s.cakeTypes);
  Object.entries(spec).forEach(([type, n]) => {
    counts[Number(type)] = n;
  });
  return makePlate(counts);
}

function board(s: GameSettings, entries: Record<number, Record<number, number>>): Board {
  const b = createBoard(s.boardWidth, s.boardHeight);
  Object.entries(entries).forEach(([idx, spec]) => {
    b.cells[Number(idx)] = plate(s, spec);
  });
  return b;
}

function at(b: Board, idx: number, color: number): number {
  return b.cells[idx]?.counts[color] ?? 0;
}

function total(b: Board, color: number): number {
  return b.cells.reduce((sum, p) => sum + (p?.counts[color] ?? 0), 0);
}

// ---------------------------------------------------------------- Rule 2

describe("Rule 2 — board & neighbours", () => {
  const s = mk(4, 5);
  it("uses orthogonal adjacency only", () => {
    const b = createBoard(4, 5);
    expect(neighbors(b, 0).sort((x, y) => x - y)).toEqual([1, 4]);
    expect(neighbors(b, 5).sort((x, y) => x - y)).toEqual([1, 4, 6, 9]);
    expect(neighbors(b, 19).sort((x, y) => x - y)).toEqual([15, 18]);
  });
  it("has width x height positions", () => {
    expect(createBoard(s.boardWidth, s.boardHeight).cells.length).toBe(20);
  });
});

// ---------------------------------------------------------------- Rule 3

describe("Rule 3 — starting plates", () => {
  it("produces a stable board for every mix intensity", () => {
    (["easy", "normal", "hard", "veryHard"] as const).forEach((mixIntensity) => {
      for (let i = 0; i < 40; i += 1) {
        const s = mk(4, 5, { startingPlates: 8, mixIntensity });
        const b = generateStartingBoard(s);
        expect(resolveBoard(b, s, null).snapshots.length).toBe(0);
      }
    });
  });

  it("places roughly the requested number of plates, spread out", () => {
    const s = mk(4, 5, { startingPlates: 6, mixIntensity: "normal" });
    const b = generateStartingBoard(s);
    const placed = b.cells.filter(Boolean).length;
    expect(placed).toBeGreaterThanOrEqual(4);
    expect(placed).toBeLessThanOrEqual(6);
  });
});

// ---------------------------------------------------------------- Rule 5/25

describe("Rules 5/25 — generation respects mix intensity and capacity", () => {
  it("never exceeds capacity and honours colour counts", () => {
    const easy = mk(4, 5, { mixIntensity: "easy" });
    const veryHard = mk(4, 5, { mixIntensity: "veryHard" });
    let easyColors = 0;
    let hardColors = 0;
    for (let i = 0; i < 200; i += 1) {
      const a = generateServedPlate(easy);
      const c = generateServedPlate(veryHard);
      expect(pieceCount(a)).toBeLessThan(PLATE_CAPACITY);
      expect(pieceCount(c)).toBeLessThan(PLATE_CAPACITY);
      easyColors += a.counts.filter((n) => n > 0).length;
      hardColors += c.counts.filter((n) => n > 0).length;
    }
    expect(easyColors / 200).toBeLessThan(hardColors / 200);
  });
});

// ---------------------------------------------------------------- Rule 6

describe("Rule 6 — plate lifecycle", () => {
  const s = mk(3, 3);
  it("clears a plate drained to zero pieces", () => {
    // 1 is pure yellow, 4 is the active plate: yellow converges on 4 (step 3)
    // and the emptied source position becomes free again
    const b = board(s, { 4: { [YELLOW]: 1 }, 1: { [YELLOW]: 3 } });
    const { finalBoard } = resolveBoard(b, s, 4);
    expect(finalBoard.cells[1]).toBeNull();
    expect(at(finalBoard, 4, YELLOW)).toBe(4);
  });

  it("treats a full-but-mixed plate as a dead end that can still shed pieces", () => {
    // 5 yellow + 1 red is full and cannot complete; it may still send yellow to
    // a pure yellow neighbour (Rule 9), which is how the board purifies itself
    const b = board(s, { 4: { [YELLOW]: 5, [RED]: 1 }, 1: { [YELLOW]: 2 } });
    const { finalBoard, completions } = resolveBoard(b, s, 4);
    expect(completions).toBe(1);
    expect(at(finalBoard, 4, YELLOW)).toBe(1);
    expect(at(finalBoard, 4, RED)).toBe(1);
  });

  it("never lets a plate exceed capacity", () => {
    const b = board(s, { 4: { [YELLOW]: 3 }, 1: { [YELLOW]: 4 }, 7: { [YELLOW]: 4 } });
    const { snapshots } = resolveBoard(b, s, 4);
    snapshots.forEach((snap) => {
      snap.board.cells.forEach((p) => {
        if (p) expect(pieceCount(p)).toBeLessThanOrEqual(PLATE_CAPACITY);
      });
    });
  });
});

// ---------------------------------------------------------------- Rule 8

describe("Rule 8 — fundamental attraction", () => {
  const s = mk(3, 3);
  it("lets a mixed active plate give both colours away to pure neighbours", () => {
    const b = board(s, { 4: { [YELLOW]: 1, [BLUE]: 1 }, 1: { [YELLOW]: 2 }, 3: { [BLUE]: 2 } });
    const { finalBoard } = resolveBoard(b, s, 4);
    expect(finalBoard.cells[4]).toBeNull();
    expect(at(finalBoard, 1, YELLOW)).toBe(3);
    expect(at(finalBoard, 3, BLUE)).toBe(3);
  });

  it("purifies the active plate when no purer alternative exists", () => {
    const b = board(s, {
      4: { [YELLOW]: 1, [BLUE]: 1 },
      1: { [YELLOW]: 2, [GREEN]: 1 },
      3: { [BLUE]: 2 },
    });
    const { finalBoard } = resolveBoard(b, s, 4);
    expect(at(finalBoard, 4, YELLOW)).toBe(3);
    expect(at(finalBoard, 4, BLUE)).toBe(0);
    expect(at(finalBoard, 3, BLUE)).toBe(3);
    expect(at(finalBoard, 1, GREEN)).toBe(1);
  });
});

// ---------------------------------------------------------------- Rule 9/10

describe("Rules 9/10 — single-colour destinations outrank mixed ones", () => {
  const s = mk(3, 3);
  it("prefers the pure plate", () => {
    const b = board(s, {
      4: { [YELLOW]: 1, [RED]: 1 },
      1: { [YELLOW]: 3 },
      3: { [YELLOW]: 1, [RED]: 1 },
    });
    const { finalBoard } = resolveBoard(b, s, 4);
    expect(at(finalBoard, 1, YELLOW)).toBe(5);
    expect(at(finalBoard, 3, YELLOW)).toBe(0);
  });

  it("still allows a mixed plate to receive when it is the best available", () => {
    const b = board(s, { 4: { [YELLOW]: 1, [BLUE]: 1 }, 1: { [YELLOW]: 3, [RED]: 1 } });
    const { finalBoard } = resolveBoard(b, s, null);
    expect(at(finalBoard, 1, YELLOW)).toBe(4);
  });
});

// ---------------------------------------------------------------- Rule 11

describe("Rule 11 — destination priority hierarchy", () => {
  const s = mk(3, 3);

  it("step 1: completion outranks the active-plate preference", () => {
    // without a completion the yellow would converge on the active plate (step 3);
    // because 3 can reach six, the active plate gives its pieces away instead
    const b = board(s, { 3: { [YELLOW]: 4 }, 4: { [YELLOW]: 2 } });
    const { finalBoard, completions } = resolveBoard(b, s, 4);
    expect(completions).toBe(1);
    expect(total(finalBoard, YELLOW)).toBe(0);
  });

  it("step 3: an equivalent active plate beats a non-active one", () => {
    // 4 is active and mixed; 1 and 7 are identical mixed plates
    const b = board(s, {
      4: { [YELLOW]: 1, [BLUE]: 1 },
      1: { [YELLOW]: 1, [GREEN]: 1 },
      7: { [YELLOW]: 1, [GREEN]: 1 },
    });
    const { finalBoard } = resolveBoard(b, s, 4);
    expect(at(finalBoard, 4, YELLOW)).toBe(3);
    expect(at(finalBoard, 1, YELLOW)).toBe(0);
    expect(at(finalBoard, 7, YELLOW)).toBe(0);
  });

  it("step 4: largest matching group wins", () => {
    const b = board(s, {
      4: { [YELLOW]: 2, [RED]: 1 },
      1: { [YELLOW]: 3, [GREEN]: 1 },
      7: { [YELLOW]: 1, [GREEN]: 1 },
    });
    const { finalBoard } = resolveBoard(b, s, null);
    // 7's lone yellow joins the bigger group on 4 first, which then merges into 1
    expect(at(finalBoard, 1, YELLOW)).toBe(5);
    expect(at(finalBoard, 7, YELLOW)).toBe(0);
    expect(total(finalBoard, YELLOW)).toBe(6);
  });

  it("step 5: fewest non-matching pieces wins", () => {
    const b = board(s, {
      4: { [YELLOW]: 1, [RED]: 1 },
      1: { [YELLOW]: 2, [GREEN]: 1 },
      7: { [YELLOW]: 2, [GREEN]: 2 },
    });
    const { finalBoard } = resolveBoard(b, s, null);
    expect(at(finalBoard, 1, YELLOW)).toBe(3);
    expect(at(finalBoard, 7, YELLOW)).toBe(2);
  });

  it("step 6: lower weighted distance to (0,0) wins", () => {
    // identical destinations at index 1 (row0) and index 7 (row2)
    const b = board(s, {
      4: { [YELLOW]: 1, [RED]: 1 },
      1: { [YELLOW]: 2, [GREEN]: 1 },
      7: { [YELLOW]: 2, [GREEN]: 1 },
    });
    const { finalBoard } = resolveBoard(b, s, null);
    expect(at(finalBoard, 1, YELLOW)).toBe(3);
    expect(at(finalBoard, 7, YELLOW)).toBe(2);
  });

  it("step 7: cake-type priority is the final tiebreaker", () => {
    const b = createBoard(3, 3);
    b.cells[1] = plate(s, { [RED]: 2 });
    b.cells[7] = plate(s, { [ORANGE]: 2 });
    const rankRed = destinationRank(b, 1, RED, 1, PLATE_CAPACITY, null);
    const rankOrange = destinationRank(b, 1, ORANGE, 1, PLATE_CAPACITY, null);
    expect(compareRanks(rankRed, rankOrange)).toBeLessThan(0);
  });
});

// ---------------------------------------------------------------- Rule 12

describe("Rule 12 — maximum legal quantity + same-tick redirection", () => {
  const s = mk(3, 3);
  it("moves the whole group, not one piece", () => {
    const b = board(s, { 4: { [YELLOW]: 3 }, 1: { [YELLOW]: 2 } });
    const { finalBoard } = resolveBoard(b, s, null);
    // the larger group (step 4) wins, and all three pieces move at once
    expect(at(finalBoard, 4, YELLOW)).toBe(5);
    expect(finalBoard.cells[1]).toBeNull();
  });

  it("redirects the overflow to the next-best destination in the same cascade", () => {
    // row 3-4-5: dest 3 completes with 1, leftovers must merge instead of stalling
    const b = board(s, { 3: { [YELLOW]: 5 }, 4: { [YELLOW]: 3 }, 5: { [YELLOW]: 2 } });
    const { finalBoard, completions } = resolveBoard(b, s, 4);
    expect(completions).toBe(1);
    expect(total(finalBoard, YELLOW)).toBe(4);
    // the four leftovers must be consolidated on a single plate, not split
    const plates = finalBoard.cells.filter((p) => (p?.counts[YELLOW] ?? 0) > 0);
    expect(plates.length).toBe(1);
  });
});

// ---------------------------------------------------------------- Rule 13/14

describe("Rules 13/14 — completion priority and stepping stone", () => {
  const s = mk(3, 3);
  it("completes and clears the plate", () => {
    const b = board(s, { 4: { [YELLOW]: 5 }, 1: { [YELLOW]: 1 } });
    const { finalBoard, completions } = resolveBoard(b, s, 4);
    expect(completions).toBe(1);
    expect(finalBoard.cells[4]).toBeNull();
    expect(finalBoard.cells[1]).toBeNull();
  });

  it("completes two cakes from 5 / 3 / 4 in a row", () => {
    const b = board(s, { 3: { [YELLOW]: 5 }, 4: { [YELLOW]: 3 }, 5: { [YELLOW]: 4 } });
    const { completions, finalBoard } = resolveBoard(b, s, 4);
    expect(completions).toBe(2);
    expect(total(finalBoard, YELLOW)).toBe(0);
  });

  it("completes two cakes when a plate lands between two nearly-full plates", () => {
    const b = board(s, { 0: { [YELLOW]: 3 }, 1: { [YELLOW]: 5 }, 4: { [YELLOW]: 5 } });
    const { completions, finalBoard } = resolveBoard(b, s, 4);
    expect(completions).toBe(2);
    expect(total(finalBoard, YELLOW)).toBe(1);
  });

  it("does not strand pieces on a source when a completed plate blocks them", () => {
    // A(3)=2Y, NEW(4)=5Y, B(5)=2Y — NEW completes, remaining 3 yellow cannot reach
    // each other, so they simply stay put (spec Rule 14 example)
    const b = board(s, { 3: { [YELLOW]: 2 }, 4: { [YELLOW]: 5 }, 5: { [YELLOW]: 2 } });
    const { completions, finalBoard } = resolveBoard(b, s, 4);
    expect(completions).toBe(1);
    expect(total(finalBoard, YELLOW)).toBe(3);
  });
});

// ---------------------------------------------------------------- Rule 15/16

describe("Rules 15/16 — mixed plates move freely, obstructions block completion", () => {
  const s = mk(3, 3);
  it("consolidates around an obstruction without completing", () => {
    const b = board(s, {
      1: { [YELLOW]: 3, [RED]: 1, [BLUE]: 1 },
      4: { [YELLOW]: 3, [GREEN]: 1 },
    });
    const { finalBoard, completions } = resolveBoard(b, s, null);
    expect(completions).toBe(0);
    const filled = at(finalBoard, 1, YELLOW) + at(finalBoard, 4, YELLOW);
    expect(filled).toBe(6);
    // the plate holding the green must be full at 5 yellow + 1 green
    expect(at(finalBoard, 4, YELLOW) + at(finalBoard, 4, GREEN)).toBe(6);
  });

  it("completes once the obstruction has somewhere to go", () => {
    const b = board(s, {
      1: { [YELLOW]: 3, [RED]: 1, [BLUE]: 1 },
      4: { [YELLOW]: 3, [GREEN]: 1 },
      7: { [GREEN]: 1 },
    });
    const { finalBoard, completions } = resolveBoard(b, s, null);
    expect(completions).toBe(1);
    expect(at(finalBoard, 7, GREEN)).toBe(2);
  });

  it("cascades through a chain of obstructions", () => {
    // green must move to 7, whose blue must first move to 6
    const b = board(s, {
      1: { [YELLOW]: 3, [RED]: 1, [BLUE]: 1 },
      4: { [YELLOW]: 3, [GREEN]: 1 },
      7: { [GREEN]: 4, [ORANGE]: 1 },
      6: { [ORANGE]: 2 },
    });
    const { finalBoard, completions } = resolveBoard(b, s, null);
    expect(completions).toBeGreaterThanOrEqual(1);
    expect(at(finalBoard, 6, ORANGE)).toBe(3);
  });
});

// ---------------------------------------------------------------- Rule 17

describe("Rule 17 — making room for a higher-priority consolidation", () => {
  const s = mk(3, 3);
  it("moves a blocking colour off the destination to enable a completion", () => {
    // NEW(4) has yellow+green; A(1) is pure yellow; C(7) accepts green
    const b = board(s, { 4: { [YELLOW]: 4, [GREEN]: 1 }, 1: { [YELLOW]: 2 }, 7: { [GREEN]: 2 } });
    const { finalBoard, completions } = resolveBoard(b, s, 4);
    expect(completions).toBe(1);
    expect(at(finalBoard, 7, GREEN)).toBe(3);
  });
});

// ---------------------------------------------------------------- Rule 19

describe("Rule 19 — one unified cross-colour candidate list", () => {
  const s = mk(3, 3);
  it("ranks a completion move for one colour above a plain move for another", () => {
    const b = board(s, {
      4: { [YELLOW]: 2, [BLUE]: 2 },
      1: { [YELLOW]: 4 },
      3: { [BLUE]: 1 },
    });
    const candidates = collectCandidates(b, s, 4);
    expect(candidates.length).toBeGreaterThan(1);
    expect(candidates[0]?.color).toBe(YELLOW);
    expect(candidates[0]?.to).toBe(1);
  });

  it("resolves both colours in the same cascade", () => {
    const b = board(s, {
      4: { [YELLOW]: 2, [BLUE]: 2 },
      1: { [YELLOW]: 4 },
      3: { [BLUE]: 1 },
    });
    const { finalBoard, completions } = resolveBoard(b, s, 4);
    expect(completions).toBe(1);
    expect(at(finalBoard, 3, BLUE)).toBe(3);
  });
});

// ---------------------------------------------------------------- Rule 21

describe("Rule 21 — sequential mode", () => {
  const s = mk(3, 3, { resolutionMode: "sequential" });
  it("reaches the same stable outcome one move at a time", () => {
    const b = board(s, { 3: { [YELLOW]: 5 }, 4: { [YELLOW]: 3 }, 5: { [YELLOW]: 4 } });
    const { completions, snapshots } = resolveBoard(b, s, 4);
    expect(completions).toBe(2);
    expect(snapshots.length).toBeGreaterThan(1);
  });
});

// ---------------------------------------------------------------- Rule 22/23

describe("Rules 22/23 — chain reactions terminate at a stable board", () => {
  const s = mk(3, 3);
  it("re-resolving a settled board produces no further movement", () => {
    const b = board(s, {
      0: { [YELLOW]: 2, [RED]: 1 },
      1: { [YELLOW]: 2, [BLUE]: 1 },
      2: { [RED]: 2 },
      3: { [BLUE]: 2, [GREEN]: 1 },
      4: { [GREEN]: 2, [YELLOW]: 1 },
    });
    const { finalBoard } = resolveBoard(b, s, null);
    expect(resolveBoard(finalBoard, s, null).snapshots.length).toBe(0);
  });

  it("assesses the whole board, not just the active plate's neighbours", () => {
    // the placement at 0 triggers nothing locally, but the far pair at 7/8 is
    // already matched and must consolidate as part of the same cascade
    const b = board(s, { 0: { [RED]: 1 }, 7: { [YELLOW]: 3 }, 8: { [YELLOW]: 2 } });
    const { finalBoard } = resolveBoard(b, s, 0);
    expect(at(finalBoard, 7, YELLOW)).toBe(5);
  });
});

// ---------------------------------------------------------------- Rule 24

describe("Rule 24 — determinism", () => {
  const s = mk(3, 3);
  it("produces byte-identical results for identical inputs", () => {
    const make = () =>
      board(s, {
        0: { [YELLOW]: 2, [RED]: 1 },
        1: { [YELLOW]: 3 },
        4: { [RED]: 2, [BLUE]: 1 },
        5: { [BLUE]: 3 },
        7: { [YELLOW]: 1, [BLUE]: 1 },
      });
    const a = resolveBoard(make(), s, 4);
    const c = resolveBoard(make(), s, 4);
    expect(a.finalBoard.cells.map((p) => p?.counts)).toEqual(
      c.finalBoard.cells.map((p) => p?.counts),
    );
    expect(a.completions).toBe(c.completions);
    expect(a.snapshots.length).toBe(c.snapshots.length);
  });
});

// ---------------------------------------------------------------- Rule 26

describe("Rule 26 — scoring", () => {
  it("matches the specified table", () => {
    expect(scoreForCascade(0)).toBe(0);
    expect(scoreForCascade(1)).toBe(100);
    expect(scoreForCascade(2)).toBe(500);
    expect(scoreForCascade(3)).toBe(5000);
    expect(scoreForCascade(4)).toBe(7500);
    expect(scoreForCascade(5)).toBe(10000);
    expect(scoreForCascade(6)).toBe(12500);
  });
});

// ---------------------------------------------------------------- Rule 28

describe("Rule 28 — game over detection", () => {
  const s = mk(2, 2);
  it("detects a full board", () => {
    const b = board(s, {
      0: { [RED]: 1 },
      1: { [BLUE]: 1 },
      2: { [GREEN]: 1 },
      3: { [ORANGE]: 1 },
    });
    expect(isBoardFull(b)).toBe(true);
    b.cells[3] = null;
    expect(isBoardFull(b)).toBe(false);
  });
});
