import { useRef, useState } from "react";
import { CakePlate } from "@/components/CakePlate";
import { GameSettingsDialog } from "@/components/GameSettingsDialog";
import { useCakeSort } from "@/hooks/useCakeSort";
import type { GameSettings } from "@/game/types";

interface DragState {
  trayIndex: number;
  x: number;
  y: number;
  moved: boolean;
}

export function CakeSortGame() {
  const game = useCakeSort();
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [drag, setDrag] = useState<DragState | null>(null);
  const startPos = useRef({ x: 0, y: 0 });

  const { board, tray, settings, selected } = game;

  const cellFromPoint = (x: number, y: number): number | null => {
    const el = document.elementFromPoint(x, y);
    const cell = el?.closest<HTMLElement>("[data-cell]");
    if (!cell) return null;
    const idx = Number(cell.dataset["cell"]);
    return Number.isNaN(idx) ? null : idx;
  };

  const onPointerDown = (e: React.PointerEvent, trayIndex: number) => {
    if (game.busy || game.gameOver) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    startPos.current = { x: e.clientX, y: e.clientY };
    setDrag({ trayIndex, x: e.clientX, y: e.clientY, moved: false });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    const moved = drag.moved || Math.hypot(dx, dy) > 8;
    setDrag({ ...drag, x: e.clientX, y: e.clientY, moved });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!drag) return;
    const current = drag;
    setDrag(null);
    if (current.moved) {
      const cell = cellFromPoint(e.clientX, e.clientY);
      if (cell !== null && !board.cells[cell]) void game.place(cell, current.trayIndex);
      return;
    }
    game.setSelected(selected === current.trayIndex ? null : current.trayIndex);
  };

  const onCellClick = (index: number) => {
    if (selected === null || board.cells[index]) return;
    void game.place(index, selected);
  };

  const handleStart = (next: GameSettings) => {
    game.start(next);
    setSettingsOpen(false);
  };

  const holding = drag?.trayIndex ?? selected;
  const heldPlate = holding !== null ? tray[holding] : null;

  return (
    <div
      className="flex min-h-screen flex-col items-center gap-3 bg-background px-3 py-4"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => setDrag(null)}
    >
      <header className="flex w-full max-w-md items-center justify-between gap-2">
        <div className="rounded-2xl border-4 border-ink bg-card px-3 py-1.5 shadow-[0_4px_0_0_var(--ink)]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Score</p>
          <p className="font-display text-2xl leading-none text-foreground">{game.score.toLocaleString()}</p>
        </div>
        <h1 className="font-display text-2xl text-foreground">Cake Sort</h1>
        <div className="rounded-2xl border-4 border-ink bg-accent px-3 py-1.5 shadow-[0_4px_0_0_var(--ink)]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-accent-foreground/70">Best</p>
          <p className="font-display text-2xl leading-none text-accent-foreground">{game.best.toLocaleString()}</p>
        </div>
      </header>

      <div
        className="grid w-full max-w-md gap-2 rounded-3xl border-4 border-ink bg-board p-2.5 shadow-[0_6px_0_0_var(--ink)]"
        style={{ gridTemplateColumns: `repeat(${board.width}, minmax(0, 1fr))` }}
      >
        {board.cells.map((plate, index) => {
          const isTarget = holding !== null && !plate;
          return (
            <button
              key={index}
              type="button"
              data-cell={index}
              onClick={() => onCellClick(index)}
              disabled={!!plate || game.busy}
              aria-label={plate ? `Plate at position ${index + 1}` : `Empty position ${index + 1}`}
              className={`relative aspect-square rounded-full border-4 transition-colors ${
                plate
                  ? "border-transparent"
                  : isTarget
                    ? "border-dashed border-ink bg-primary/25"
                    : "border-dashed border-ink/25 bg-plate-empty"
              }`}
            >
              {plate && (
                <div
                  className={`h-full w-full ${game.landed === index ? "animate-plate-land" : ""}`}
                >
                  <CakePlate
                    plate={plate}
                    capacity={settings.plateCapacity}
                    completing={game.completing.includes(index)}
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex w-full max-w-md items-center justify-center gap-3 rounded-3xl border-4 border-ink bg-card p-3 shadow-[0_6px_0_0_var(--ink)]">
        {tray.map((plate, i) => (
          <div
            key={plate.id}
            onPointerDown={(e) => onPointerDown(e, i)}
            role="button"
            tabIndex={0}
            aria-label={`Served plate ${i + 1}`}
            className={`h-16 w-16 cursor-grab touch-none transition-transform sm:h-20 sm:w-20 ${
              selected === i ? "-translate-y-2 scale-110" : ""
            } ${drag?.trayIndex === i && drag.moved ? "opacity-30" : ""}`}
          >
            <CakePlate plate={plate} capacity={settings.plateCapacity} />
          </div>
        ))}
      </div>

      <div className="flex w-full max-w-md gap-2">
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="flex-1 rounded-full border-4 border-ink bg-secondary px-4 py-2 font-display text-base text-secondary-foreground shadow-[0_4px_0_0_var(--ink)] active:translate-y-1 active:shadow-none"
        >
          Settings
        </button>
        <button
          type="button"
          onClick={game.restart}
          className="flex-1 rounded-full border-4 border-ink bg-primary px-4 py-2 font-display text-base text-primary-foreground shadow-[0_4px_0_0_var(--ink)] active:translate-y-1 active:shadow-none"
        >
          Restart
        </button>
      </div>

      {game.scores.length > 0 && (
        <p className="text-xs font-bold text-muted-foreground">
          Recent bests: {game.scores.map((s) => s.toLocaleString()).join(" · ")}
        </p>
      )}

      {drag?.moved && heldPlate && (
        <div
          className="pointer-events-none fixed z-40 h-20 w-20 -translate-x-1/2 -translate-y-1/2"
          style={{ left: drag.x, top: drag.y }}
        >
          <CakePlate plate={heldPlate} capacity={settings.plateCapacity} />
        </div>
      )}

      {game.gameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
          <div className="w-full max-w-xs rounded-3xl border-4 border-ink bg-card p-6 text-center shadow-[0_6px_0_0_var(--ink)]">
            <h2 className="font-display text-3xl text-foreground">Board full!</h2>
            <p className="mt-2 text-sm text-muted-foreground">No empty spot left for your plates.</p>
            <p className="mt-4 font-display text-4xl text-primary">{game.score.toLocaleString()}</p>
            <button
              type="button"
              onClick={game.restart}
              className="mt-5 w-full rounded-full border-4 border-ink bg-primary px-4 py-2 font-display text-lg text-primary-foreground shadow-[0_4px_0_0_var(--ink)] active:translate-y-1 active:shadow-none"
            >
              Play again
            </button>
          </div>
        </div>
      )}

      <GameSettingsDialog
        open={settingsOpen}
        settings={settings}
        onStart={handleStart}
        onClose={() => setSettingsOpen(false)}
        onResetScores={game.clearScores}
      />
    </div>
  );
}
