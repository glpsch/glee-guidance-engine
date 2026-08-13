# Cake Sort — Deterministic Puzzle Prototype

A mobile-first, touch-driven Cake Sort prototype built to spec v0.4, with the rule engine kept fully separate from the visuals so tuning values can be changed without touching game logic.

## What gets built

**Single page** at `/` — board, tray, scores, settings, game over. No routing, no backend; high scores live in local storage.

### Screen layout (mobile-first, portrait)
```text
+--------------------------------+
|  score 2,400      best 12,500  |
|  [settings]        [restart]   |
+--------------------------------+
|                                |
|        4 x 5 plate grid        |
|     (round plates, pie         |
|      wedges for pieces)        |
|                                |
+--------------------------------+
|   tray:  ( )   ( )   ( )       |
+--------------------------------+
```

### Interaction
- Placement works two ways: drag a tray plate onto an empty cell, or tap the plate then tap the cell. Valid empty cells highlight while a plate is held.
- After placement the cascade animates step by step (~200ms per resolution tick) so the player can watch and learn the chain reaction. Speed is a tuning value.
- Placing on an occupied cell is rejected silently; a placement that triggers nothing is legal.

### Settings window
Shown on load and reachable from the header: board width, board height, plates served per round, cake types, starting plates, mix intensity (Easy/Normal/Hard/Very Hard), resolution mode (Simultaneous/Sequential), plate capacity. Changing settings restarts the game. Also a "reset saved scores" control.

### Scores
- Score per cascade from the spec formula: 100 / 500 / 5,000 for n = 1–3, then 5,000 + 2,500 x (n−3).
- Running total plus all-time best always visible; top 5 recent bests stored locally and shown in a small panel.

### Game over
Board full while at least one tray plate remains unplaced. Final score is offered to the saved-score list; overlay offers restart.

## Visual direction

Adventure Time-inspired: thick dark outlines, flat saturated fills, bubblegum/mint/lemon background wash, slightly wobbly rounded shapes, chunky rounded display type. Cake pieces are pie wedges arranged around a circular plate (6 slots), each cake type a distinct hue in the fixed priority order red → orange → yellow → green → blue → purple → pink. Completion pops with a short squash-and-flash before the plate clears.

No sound, no power-ups, no progression, no monetization.

## Technical approach

Pure-TypeScript engine under `src/game/`, no React imports, unit-testable:

- `config.ts` — every TUNING KNOB in one labeled place: spatial-distance weights (1.0 / 0.1), mix-intensity color-count distributions, served-plate generation weights, scoring function, saved-list length, animation speed, Rule 17 aggressiveness.
- `types.ts` — `Board`, `Plate`, `CakeType`, `Position`, `Move`.
- `board.ts` — grid state, neighbors (orthogonal only), empty-position lifecycle.
- `ranking.ts` — the single Rule 11 hierarchy function (completion → single-color → active plate → largest matching group → fewest non-matching → weighted spatial distance → cake-type priority). Every allocation decision in the game calls this and nothing else.
- `candidates.ts` — unified cross-color candidate list (Rule 19); no per-color tracks.
- `movement.ts` — max-legal quantity plus same-tick redirection of leftovers (Rule 12), used unchanged for post-completion overflow (Rule 14).
- `resolve.ts` — simultaneous and sequential tick loops, cascade to stability, explicit termination guarantee (each pass must strictly reduce unresolved matching pieces / completable cakes or exhaust legal moves). Returns an ordered list of tick snapshots so the UI can animate rather than recompute.
- `obstruction.ts` — Rule 16 relocation and Rule 17 make-room logic, isolated so it can be tuned or disabled independently.
- `generate.ts` — starting-board and served-plate generation from mix intensity; randomness only here, never in resolution.
- `scoring.ts` — single `score(n)` function.
- `storage.ts` — local-storage saved scores.

React layer under `src/components/` renders snapshots and owns drag/tap input only. Resolution is deterministic: same board + same placement always yields the same snapshot sequence.

Vitest coverage for the rule engine using the spec's worked examples (Rules 8, 9, 12, 13, 14, 16) as test cases.
