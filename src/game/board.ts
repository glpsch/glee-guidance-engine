import type { Board, CakeType, Plate } from "./types";

let plateSeq = 0;
export function newPlateId(): string {
  plateSeq += 1;
  return `p${plateSeq}`;
}

export function makePlate(counts: number[]): Plate {
  return { id: newPlateId(), counts: [...counts] };
}

export function emptyCounts(cakeTypes: number): number[] {
  return new Array(cakeTypes).fill(0);
}

export function createBoard(width: number, height: number): Board {
  return { width, height, cells: new Array(width * height).fill(null) };
}

export function cloneBoard(board: Board): Board {
  return {
    width: board.width,
    height: board.height,
    cells: board.cells.map((p) => (p ? { id: p.id, counts: [...p.counts] } : null)),
  };
}

export function rowOf(board: Board, index: number): number {
  return Math.floor(index / board.width);
}

export function colOf(board: Board, index: number): number {
  return index % board.width;
}

/** Rule 2 — orthogonal adjacency only. */
export function neighbors(board: Board, index: number): number[] {
  const row = rowOf(board, index);
  const col = colOf(board, index);
  const out: number[] = [];
  if (row > 0) out.push(index - board.width);
  if (row < board.height - 1) out.push(index + board.width);
  if (col > 0) out.push(index - 1);
  if (col < board.width - 1) out.push(index + 1);
  return out;
}

export function pieceCount(plate: Plate): number {
  return plate.counts.reduce((a, b) => a + b, 0);
}

export function freeSlots(plate: Plate, capacity: number): number {
  return capacity - pieceCount(plate);
}

export function nonMatching(plate: Plate, color: CakeType): number {
  return pieceCount(plate) - (plate.counts[color] ?? 0);
}

export function isSingleColor(plate: Plate, color: CakeType): boolean {
  return (plate.counts[color] ?? 0) > 0 && nonMatching(plate, color) === 0;
}

/** Rule 14 — six pieces of one cake type. */
export function completedType(plate: Plate, capacity: number): CakeType | null {
  if (pieceCount(plate) !== capacity) return null;
  const idx = plate.counts.findIndex((c) => c === capacity);
  return idx === -1 ? null : idx;
}

export function isBoardFull(board: Board): boolean {
  return board.cells.every((c) => c !== null);
}

/** Expand counts into an ordered piece list for rendering. */
export function piecesOf(plate: Plate): CakeType[] {
  const out: CakeType[] = [];
  plate.counts.forEach((n, type) => {
    for (let i = 0; i < n; i += 1) out.push(type);
  });
  return out;
}
