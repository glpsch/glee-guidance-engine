import { ENABLE_MAKE_ROOM, MAX_CASCADE_TICKS, PLATE_CAPACITY } from "./config";
import {
  cloneBoard,
  completedType,
  freeSlots,
  neighbors,
  nonMatching,
} from "./board";
import { compareRanks, destinationRank } from "./ranking";
import type { Board, CakeType, GameSettings, Move, ResolutionResult, Snapshot } from "./types";

interface Candidate {
  from: number;
  to: number;
  color: CakeType;
  available: number;
  key: number[];
}

/**
 * Would emptying `from` of `color` cut some pieces off from `to`?
 *
 * Walks the network of plates that hold this colour, starting at `to` and
 * pretending `from` no longer holds any. Any neighbour of `from` that still
 * holds the colour but can no longer be reached depends on `from` as a
 * stepping stone, so the source must keep its pieces until those neighbours
 * have fed through — otherwise the bridge plate empties (or completes and
 * clears) and the rest of that colour is stranded.
 */
function isBridge(
  board: Board,
  from: number,
  to: number,
  color: CakeType,
  capacity: number,
  activeIndex: number | null,
): boolean {
  const holds = (i: number) => {
    const p = board.cells[i];
    return !!p && (p.counts[color] ?? 0) > 0;
  };
  const cutoffCandidates = neighbors(board, from).filter((n) => n !== to && holds(n));
  if (cutoffCandidates.length === 0) return false;

  const seen = new Set<number>([to, from]);
  const queue = [to];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const n of neighbors(board, cur)) {
      if (seen.has(n) || !holds(n)) continue;
      seen.add(n);
      queue.push(n);
    }
  }

  // Only a neighbour that could actually feed INTO the source is worth waiting
  // for; one that the hierarchy would never move anyway is dead weight and
  // must not freeze the source in place.
  const canFeed = (n: number) => {
    const source = board.cells[n]!;
    const bridgePlate = board.cells[from]!;
    const movable = Math.min(source.counts[color] ?? 0, freeSlots(bridgePlate, capacity));
    if (movable <= 0) return false;
    const inRank = destinationRank(board, from, color, movable, capacity, activeIndex, n);
    const outRank = destinationRank(board, n, color, 0, capacity, activeIndex, from);
    return compareRanks(inRank, outRank) < 0;
  };

  return cutoffCandidates.some((n) => !seen.has(n) && canFeed(n));
}


/**
 * Rule 19 — one unified candidate list across every colour.
 * A movement is legal only when the destination is a strictly better
 * destination for that colour than the source itself (Rule 11). That single
 * condition gives Rules 8/9/10 their behaviour and guarantees termination:
 * pieces only ever flow "uphill" in the hierarchy.
 */
export function collectCandidates(
  board: Board,
  settings: GameSettings,
  activeIndex: number | null,
): Candidate[] {
  const capacity = PLATE_CAPACITY;
  const out: Candidate[] = [];

  board.cells.forEach((source, from) => {
    if (!source) return;
    source.counts.forEach((have, color) => {
      if (have <= 0) return;
      for (const to of neighbors(board, from)) {
        const dest = board.cells[to];
        if (!dest) continue;
        if ((dest.counts[color] ?? 0) <= 0) continue;
        const free = freeSlots(dest, capacity);
        if (free <= 0) continue;

        const movable = Math.min(have, free);
        const destRank = destinationRank(board, to, color, movable, capacity, activeIndex, from);
        const srcRank = destinationRank(board, from, color, 0, capacity, activeIndex, to);

        if (compareRanks(destRank, srcRank) >= 0) continue;

        // Rule 13 — keep the stepping stone alive. Moving EVERY piece of this
        // colour off the source deletes the only route other neighbours have
        // to reach `to`, so the colour strands (and the bridge plate may empty
        // and clear entirely). Wait until those neighbours have fed through,
        // unless the move completes a cake right now.
        const wouldEmpty = movable >= have;
        const completesNow = (dest.counts[color] ?? 0) + movable >= capacity;
        if (wouldEmpty && !completesNow && isBridge(board, from, to, color)) continue;

        out.push({ from, to, color, available: have, key: [...destRank, from, color] });
      }
    });
  });


  out.sort((a, b) => compareRanks(a.key, b.key));
  return out;
}

/**
 * Rule 12 — move the maximum legal amount, then re-evaluate leftovers against
 * the hierarchy within the same tick. Because the candidate list is already
 * globally sorted, walking it in order gives exactly that behaviour, and a
 * plate that has just filled is simply a zero-capacity destination (Rule 14).
 *
 * The list is intentionally walked as built — a candidate whose source has since
 * shed pieces can still act as a stepping stone, which is how a colour hops
 * across a plate that does not hold it yet. The one thing that must NOT happen
 * is draining a plate that reached six during this pass: a finished cake is
 * locked and clears at the end of the tick (Rule 14).
 */
function applyPass(board: Board, candidates: Candidate[], single: boolean): Move[] {
  const capacity = PLATE_CAPACITY;
  const moves: Move[] = [];

  for (const cand of candidates) {
    const source = board.cells[cand.from];
    const dest = board.cells[cand.to];
    if (!source || !dest) continue;

    // Rule 14 — a completed plate is locked for the rest of the tick.
    if (completedType(source, capacity) !== null) continue;
    if (completedType(dest, capacity) !== null) continue;

    const have = source.counts[cand.color] ?? 0;
    const free = freeSlots(dest, capacity);
    if (have <= 0 || free <= 0) continue;

    const amount = Math.min(have, free);
    source.counts[cand.color] = have - amount;
    dest.counts[cand.color] = (dest.counts[cand.color] ?? 0) + amount;
    moves.push({ from: cand.from, to: cand.to, color: cand.color, count: amount });
    if (single) break;
  }

  return moves;
}



/**
 * Rule 17 — relocate a lone off-colour obstruction when doing so lets a
 * higher-priority consolidation complete. Uses the same hierarchy (Rule 11)
 * and only fires when the obstruction has a genuinely valid destination.
 */
function makeRoomMoves(board: Board, settings: GameSettings, activeIndex: number | null): Move[] {
  if (!ENABLE_MAKE_ROOM) return [];
  const capacity = PLATE_CAPACITY;
  const moves: Move[] = [];

  board.cells.forEach((plate, index) => {
    if (!plate) return;
    plate.counts.forEach((have, color) => {
      if (have <= 0) return;
      const blockers = nonMatching(plate, color);
      if (blockers === 0 || blockers > 1) return;

      // Would clearing the blocker allow this colour to reach capacity?
      const reachable = neighbors(board, index).reduce((sum, n) => {
        const nb = board.cells[n];
        return sum + (nb ? (nb.counts[color] ?? 0) : 0);
      }, 0);
      if (have + reachable < capacity) return;

      const blockerColor = plate.counts.findIndex((c, t) => c > 0 && t !== color);
      if (blockerColor === -1) return;

      let best: { to: number; rank: number[] } | null = null;
      for (const to of neighbors(board, index)) {
        const dest = board.cells[to];
        if (!dest || (dest.counts[blockerColor] ?? 0) <= 0) continue;
        if (freeSlots(dest, capacity) <= 0) continue;
        const rank = destinationRank(board, to, blockerColor, 1, capacity, activeIndex);
        if (!best || compareRanks(rank, best.rank) < 0) best = { to, rank };
      }
      if (!best) return;

      const amount = plate.counts[blockerColor] ?? 0;
      const dest = board.cells[best.to]!;
      const moved = Math.min(amount, freeSlots(dest, capacity));
      if (moved <= 0) return;
      plate.counts[blockerColor] = amount - moved;
      dest.counts[blockerColor] = (dest.counts[blockerColor] ?? 0) + moved;
      moves.push({ from: index, to: best.to, color: blockerColor, count: moved });
    });
  });

  return moves;
}

function findCompleted(board: Board, capacity: number): number[] {
  const out: number[] = [];
  board.cells.forEach((plate, i) => {
    if (plate && completedType(plate, capacity) !== null) out.push(i);
  });
  return out;
}

function clearEmptyAndCompleted(board: Board, completed: number[], capacity: number): void {
  for (const i of completed) board.cells[i] = null;
  board.cells.forEach((plate, i) => {
    if (plate && plate.counts.every((c) => c === 0)) board.cells[i] = null;
  });
  void capacity;
}

/**
 * Rules 20/21/22/23 — cascade to stability, producing one snapshot per tick so
 * the UI can animate the chain reaction instead of recomputing it.
 */
export function resolveBoard(
  startBoard: Board,
  settings: GameSettings,
  activeIndex: number | null,
): ResolutionResult {
  const board = cloneBoard(startBoard);
  const snapshots: Snapshot[] = [];
  const capacity = PLATE_CAPACITY;
  let completions = 0;
  let active = activeIndex;

  for (let tick = 0; tick < MAX_CASCADE_TICKS; tick += 1) {
    const sequential = settings.resolutionMode === "sequential";
    const moves: Move[] = [];

    // Rule 12/14 — apply the whole simultaneous batch, then re-assess the ENTIRE
    // board and repeat within the same tick. A plate that just filled is now a
    // zero-capacity destination, so leftovers are redirected to the next-best
    // plate before the tick ends (stepping stone).
    for (let pass = 0; pass < MAX_CASCADE_TICKS; pass += 1) {
      const candidates = collectCandidates(board, settings, active);
      const applied = applyPass(board, candidates, sequential);
      if (applied.length === 0) break;
      moves.push(...applied);
      if (sequential) break;
    }

    if (moves.length === 0) {
      moves.push(...makeRoomMoves(board, settings, active));
      if (moves.length === 0) {
        // Rules 7/23 — the "active plate" bonus only applies while the placement
        // is still resolving. Once nothing moves, drop it and keep going: the
        // board is only stable when no movement remains under the plain
        // hierarchy either, so consolidation is never left half-finished.
        if (active !== null) {
          active = null;
          continue;
        }
        break;
      }
    }


    // Rule 14 — completed plates stay put for this tick, then clear.
    const completed = findCompleted(board, capacity);
    completions += completed.length;

    snapshots.push({ board: cloneBoard(board), completed, moves });

    if (completed.length > 0) {
      clearEmptyAndCompleted(board, completed, capacity);
      snapshots.push({ board: cloneBoard(board), completed: [], moves: [] });
    } else {
      clearEmptyAndCompleted(board, [], capacity);
    }

    // The active plate loses its special status once it has cleared.
    if (active !== null && board.cells[active] === null) active = null;
  }

  return { snapshots, finalBoard: board, completions };
}
