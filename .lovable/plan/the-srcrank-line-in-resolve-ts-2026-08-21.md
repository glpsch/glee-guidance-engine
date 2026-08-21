# The `srcRank` line in resolve.ts

```ts
const destRank = destinationRank(board, to, color, movable, capacity, activeIndex);
const srcRank  = destinationRank(board, from, color, 0, capacity, activeIndex);
if (compareRanks(destRank, srcRank) >= 0) continue;
```

## What it does

It scores the plate the pieces are sitting on *as if it were a destination*, so the neighbour has to be strictly better before pieces are allowed to leave. This one comparison is what gives Rules 8/9/10 their behaviour ("pieces flow toward the better plate, never sideways") and it is also the termination guarantee: every accepted move moves pieces strictly up the hierarchy, so the cascade cannot ping-pong forever.

Two details worth knowing:

- `incoming = 0` for the source, because nothing is arriving there — it is scored in its current state.
- The comparison is `>= 0`, so ties never move. Two equally-ranked plates hold onto their pieces; the spatial and cake-type tiebreakers in `destinationRank` make ties rare but they still act as the final brake.

## Known asymmetry (the part that can look like a bug)

The destination is scored *after* the hypothetical move (`movable` incoming) while the source is scored *before* it (still holding all its pieces). So the source's "largest matching group" term (`-have`) counts pieces that would be gone once the move happened. On the tiers that matter — completion, single-colour — this is harmless, because completion dominates the tuple. Where it can bite is a mid-hierarchy case: a large pile refuses to feed a slightly smaller neighbour even when splitting would serve the board better, because the source's own `-have` outranks the destination's.

This is a plausible contributor to the "colours don't fully consolidate" reports, but it is **not confirmed** — no test currently isolates it.

## Proposed work

1. **Confirm before changing.** Add a focused test in `src/game/rules.test.ts` that constructs the asymmetric case (a big pile adjacent to a smaller same-colour pile where merging is the intuitively correct outcome) and assert what the engine currently does. If the engine already behaves correctly, stop here — the line stays as is and the real cause is elsewhere.
2. **If confirmed, make the comparison symmetric.** Score the source post-move as well, i.e. rank it with the pieces removed, so both sides of the comparison describe the world after the move rather than one before and one after.
3. **Re-guard termination.** A symmetric comparison changes the monotone potential the cascade relies on. Keep the strict `>= 0` tie rule, and re-run the 300-board randomised fuzz test in `rules.test.ts` — it already asserts every cascade terminates in a stable board and that identical inputs give identical output in both resolution modes.
4. **Re-run the whole rule-by-rule suite** and fix any expectation that the change legitimately invalidates, documenting why in the test.

## Technical notes

- Files touched: `src/game/resolve.ts` (the gate in `collectCandidates`), possibly `src/game/ranking.ts` if the post-move source score needs a dedicated helper, and `src/game/rules.test.ts`.
- No UI, config, or tuning-knob changes. `PLATE_CAPACITY` and the hierarchy tiers in `ranking.ts` stay exactly as they are.
- If step 1 shows the engine is already correct, the follow-up investigation targets `makeRoomMoves` and the active-plate drop in `resolveBoard`, which are the other two places consolidation can stall.
