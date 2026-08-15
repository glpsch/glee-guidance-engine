import { MIX_COLOR_WEIGHTS, PLATE_CAPACITY, SERVED_PIECE_COUNT, STARTING_PIECE_COUNT } from "./config";
import { createBoard, emptyCounts, makePlate } from "./board";
import type { Board, GameSettings, Plate } from "./types";

/**
 * Randomness lives ONLY here (Rule 24): generation may be random, resolution
 * never is.
 */

function pickWeighted(weights: number[]): number {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return 0;
  let roll = Math.random() * total;
  for (let i = 0; i < weights.length; i += 1) {
    roll -= weights[i] ?? 0;
    if (roll <= 0) return i;
  }
  return weights.length - 1;
}

function shuffled(n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j] as number, arr[i] as number];
  }
  return arr;
}

function generateCounts(settings: GameSettings, range: { min: number; max: number }): number[] {
  const weights = MIX_COLOR_WEIGHTS[settings.mixIntensity] ?? MIX_COLOR_WEIGHTS.easy;
  const colorCount = Math.min(
    settings.cakeTypes,
    Math.max(1, pickWeighted(weights.slice(0, settings.cakeTypes)) + 1),
  );

  const pieces = Math.max(
    colorCount,
    Math.min(
      PLATE_CAPACITY - 1,
      range.min + Math.floor(Math.random() * (range.max - range.min + 1)),
    ),
  );

  const colors = shuffled(settings.cakeTypes).slice(0, colorCount);
  const counts = emptyCounts(settings.cakeTypes);
  colors.forEach((c) => {
    counts[c] = 1;
  });
  for (let i = colorCount; i < pieces; i += 1) {
    const c = colors[Math.floor(Math.random() * colors.length)] as number;
    counts[c] = (counts[c] ?? 0) + 1;
  }
  return counts;
}

/** Rule 25 — served plate generation. */
export function generateServedPlate(settings: GameSettings): Plate {
  return makePlate(generateCounts(settings, SERVED_PIECE_COUNT));
}

export function generateTray(settings: GameSettings): Plate[] {
  return Array.from({ length: settings.servedPlates }, () => generateServedPlate(settings));
}

/**
 * Rule 3 — starting plates must be spread out AND the board must already be
 * stable: no two neighbouring plates may share a cake type, otherwise they
 * would immediately consolidate before the player's first move.
 */
export function generateStartingBoard(settings: GameSettings): Board {
  const board = createBoard(settings.boardWidth, settings.boardHeight);
  const total = board.cells.length;
  const wanted = Math.min(settings.startingPlates, total);
  if (wanted === 0) return board;

  const spots = shuffled(total)
    .slice(0, wanted)
    .sort((a, b) => a - b);

  const sharesColor = (a: Plate, b: Plate) =>
    a.counts.some((n, t) => n > 0 && (b.counts[t] ?? 0) > 0);

  spots.forEach((spot) => {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const plate = makePlate(generateCounts(settings, STARTING_PIECE_COUNT));
      const clash = neighbors(board, spot).some((n) => {
        const nb = board.cells[n];
        return !!nb && sharesColor(nb, plate);
      });
      if (!clash || attempt === 59) {
        // Last resort: leave the position empty rather than seed an unstable board.
        if (!clash) board.cells[spot] = plate;
        break;
      }
    }
  });

  return board;
}
