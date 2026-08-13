export type CakeType = number;

export interface Plate {
  id: string;
  /** counts[type] = number of pieces of that cake type */
  counts: number[];
}

export interface Board {
  width: number;
  height: number;
  /** length = width * height, null = empty position */
  cells: (Plate | null)[];
}

export type MixIntensity = "easy" | "normal" | "hard" | "veryHard";
export type ResolutionMode = "simultaneous" | "sequential";

export interface GameSettings {
  boardWidth: number;
  boardHeight: number;
  servedPlates: number;
  cakeTypes: number;
  startingPlates: number;
  mixIntensity: MixIntensity;
  resolutionMode: ResolutionMode;
  plateCapacity: number;
}

export interface Move {
  from: number;
  to: number;
  color: CakeType;
  count: number;
}

export interface Snapshot {
  board: Board;
  /** positions that completed on this tick (still visible, about to clear) */
  completed: number[];
  moves: Move[];
}

export interface ResolutionResult {
  snapshots: Snapshot[];
  finalBoard: Board;
  completions: number;
}
