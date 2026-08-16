import { SPATIAL_WEIGHTS } from "./config";
import { colOf, freeSlots, isSingleColor, nonMatching, rowOf } from "./board";
import type { Board, CakeType } from "./types";

/**
 * Rule 11 — the destination priority hierarchy.
 *
 * THIS IS THE SINGLE SOURCE OF TRUTH for every allocation decision in the
 * game (Rules 12, 14, 19 all defer to it). No other ranking logic may exist.
 *
 * Returns a tuple compared lexicographically, lower is better:
 *  1. immediate completion
 *  2. single-colour destination
 *  3. active / newly placed plate
 *  4. largest matching group
 *  5. fewest non-matching pieces
 *  6. weighted spatial distance to (0,0)
 *  7. cake-type priority
 */
export function destinationRank(
  board: Board,
  index: number,
  color: CakeType,
  incoming: number,
  capacity: number,
  activeIndex: number | null,
): number[] {
  const plate = board.cells[index];
  if (!plate) return [9, 9, 9, 0, 0, 0, color];

  const have = plate.counts[color] ?? 0;
  const free = freeSlots(plate, capacity);
  const others = nonMatching(plate, color);

  const canComplete = others === 0 && have + Math.min(free, incoming) >= capacity;

  return [
    // 1. immediate completion
    canComplete ? 0 : 1,
    // 2. single-colour destination
    isSingleColor(plate, color) ? 0 : 1,
    // 3. active / newly placed plate
    activeIndex === index ? 0 : 1,
    // 4. largest matching group (also settles which of two completable plates
    //    wins: the one nearest six needs the fewest pieces)
    -have,
    // 5. fewest non-matching pieces
    others,
    // 6. weighted spatial distance to (0,0)
    rowOf(board, index) * SPATIAL_WEIGHTS.row + colOf(board, index) * SPATIAL_WEIGHTS.column,
    // 7. cake-type priority
    color,
  ];

}

export function compareRanks(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
