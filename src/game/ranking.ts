import { SPATIAL_WEIGHTS } from "./config";
import { colOf, freeSlots, isSingleColor, neighbors, nonMatching, rowOf } from "./board";
import type { Board, CakeType } from "./types";

/**
 * How many OTHER neighbouring plates could still feed this colour here.
 * Used only to break ties between two plates that can both complete: the plate
 * with fewer alternative feeders is the dead end, so it must be served first —
 * the "hub" can still be completed afterwards by its remaining neighbour.
 * Without this, a 4 / 4 / 4 row completes once and strands the rest; with it,
 * the row completes twice.
 */
function feederCount(board: Board, index: number, color: CakeType, exclude: number | null): number {
  let n = 0;
  for (const nb of neighbors(board, index)) {
    if (nb === exclude) continue;
    const plate = board.cells[nb];
    if (plate && (plate.counts[color] ?? 0) > 0) n += 1;
  }
  return n;
}

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
  counterpart: number | null = null,
): number[] {
  const plate = board.cells[index];
  if (!plate) return [9, 9, 9, 9, 9, 0, 0, 0, color];

  const have = plate.counts[color] ?? 0;
  const free = freeSlots(plate, capacity);
  const others = nonMatching(plate, color);

  const canComplete = others === 0 && have + Math.min(free, incoming) >= capacity;

  // Pieces of this colour reachable in the immediate neighbourhood. When they
  // can only ever make ONE cake, there is nothing to strand, so the freshly
  // placed plate may claim the completion. When two or more cakes are in play
  // the stepping-stone ordering below must win instead.
  const cluster =
    have +
    neighbors(board, index).reduce((sum, n) => {
      const nb = board.cells[n];
      return sum + (nb ? (nb.counts[color] ?? 0) : 0);
    }, 0);

  return [
    // 1. immediate completion
    canComplete ? 0 : 1,
    // 1a. Within the completion tier the active / newly placed plate wins
    // before group size is considered: a freshly placed single-colour plate
    // completes on itself rather than feeding a bigger neighbour — but only
    // when no second cake is possible nearby.
    canComplete && activeIndex === index && cluster < capacity * 2 ? 0 : 1,
    // 1b. Among the remaining destinations that BOTH complete, the plate
    // nearest six needs the fewest pieces, so honouring it first lets one
    // source feed several completions in the same tick (stepping stone).
    canComplete ? capacity - have : 0,
    // 1c. Still within the completion tier: serve the dead end before the hub.
    canComplete ? feederCount(board, index, color, counterpart) : 0,
    // 2. single-colour destination
    isSingleColor(plate, color) ? 0 : 1,
    // 3. active / newly placed plate
    activeIndex === index ? 0 : 1,
    // 4. largest matching group
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
