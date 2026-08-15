import type { GameSettings, MixIntensity } from "./types";

/**
 * ============================================================
 *  TUNING KNOBS — every playtest-adjustable value lives here.
 *  No rule logic in this file. Change freely without touching
 *  the rule engine in src/game/*.
 * ============================================================
 */

export const DEFAULT_SETTINGS: GameSettings = {
  boardWidth: 4,
  boardHeight: 5,
  servedPlates: 3,
  cakeTypes: 6,
  startingPlates: 0,
  mixIntensity: "easy",
  resolutionMode: "simultaneous",
};

/** Rule 11, step 6 — weighted distance to the top-left corner. */
/** Rule 14 — a cake always takes exactly six pieces. */
export const PLATE_CAPACITY = 6;

export const SPATIAL_WEIGHTS = { row: 1.0, column: 0.1 };

/**
 * Rule 5 — how many distinct cake types a generated plate may hold,
 * as a weighted distribution: weights[i] is the weight of (i + 1) colors.
 */
export const MIX_COLOR_WEIGHTS: Record<MixIntensity, number[]> = {
  easy: [10, 2, 0, 0, 0],
  normal: [4, 5, 3, 0, 0],
  hard: [0, 4, 5, 3, 0],
  veryHard: [0, 1, 4, 5, 3],
};

/** Rule 25 — how many pieces a freshly served plate carries. */
export const SERVED_PIECE_COUNT = { min: 2, max: 5 };

/** Rule 3 — starting plates carry slightly fewer pieces. */
export const STARTING_PIECE_COUNT = { min: 1, max: 4 };

/** Rule 27 — length of the locally saved high-score list. */
export const SAVED_SCORE_COUNT = 5;

/** Milliseconds per animated resolution tick (Rule 22 pacing). */
export const TICK_DURATION_MS = 700;

/** Extra pause before a completed plate clears from the board (Rule 14). */
export const COMPLETION_HOLD_MS = 900;

/**
 * Rule 16 safety valve — hard ceiling on cascade passes.
 * Each pass must strictly reduce unresolved matching pieces; this only
 * exists so a rule-design mistake can never hang the game.
 */
export const MAX_CASCADE_TICKS = 200;

/**
 * Rule 17 — how aggressively the engine relocates an off-colour obstruction
 * purely to unblock a completion. `true` keeps the emergent behaviour that
 * already falls out of Rules 9/16; set to `false` to disable it for testing.
 */
export const ENABLE_MAKE_ROOM = true;

/** Rule 4 — fixed internal cake-type priority order (final tiebreaker only). */
export const CAKE_TYPES = [
  { name: "Strawberry", color: "var(--cake-1)" },
  { name: "Tangerine", color: "var(--cake-2)" },
  { name: "Banana", color: "var(--cake-3)" },
  { name: "Lime", color: "var(--cake-4)" },
  { name: "Blueberry", color: "var(--cake-5)" },
  { name: "Grape", color: "var(--cake-6)" },
  { name: "Bubblegum", color: "var(--cake-7)" },
  { name: "Cocoa", color: "var(--cake-8)" },
];

export const MAX_CAKE_TYPES = CAKE_TYPES.length;
