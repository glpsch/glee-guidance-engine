import { useEffect, useState } from "react";
import { MAX_CAKE_TYPES } from "@/game/config";
import type { GameSettings, MixIntensity, ResolutionMode } from "@/game/types";

interface Props {
  open: boolean;
  settings: GameSettings;
  onStart: (s: GameSettings) => void;
  onClose: () => void;
  onResetScores: () => void;
}

const MIXES: { value: MixIntensity; label: string }[] = [
  { value: "easy", label: "Easy" },
  { value: "normal", label: "Normal" },
  { value: "hard", label: "Hard" },
  { value: "veryHard", label: "Very Hard" },
];

const MODES: { value: ResolutionMode; label: string }[] = [
  { value: "simultaneous", label: "Simultaneous" },
  { value: "sequential", label: "Sequential" },
];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      {children}
    </label>
  );
}

function Num({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="h-8 w-8 rounded-full border-2 border-ink bg-secondary font-display text-lg leading-none text-foreground active:translate-y-0.5"
        aria-label="decrease"
      >
        −
      </button>
      <span className="w-8 text-center font-display text-lg text-foreground">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="h-8 w-8 rounded-full border-2 border-ink bg-secondary font-display text-lg leading-none text-foreground active:translate-y-0.5"
        aria-label="increase"
      >
        +
      </button>
    </div>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-full border-2 border-ink px-3 py-1 text-xs font-bold transition-colors ${
            value === o.value ? "bg-primary text-primary-foreground" : "bg-card text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function GameSettingsDialog({ open, settings, onStart, onClose, onResetScores }: Props) {
  const [draft, setDraft] = useState<GameSettings>(settings);

  useEffect(() => {
    if (open) setDraft(settings);
  }, [open, settings]);

  if (!open) return null;

  const maxStarting = draft.boardWidth * draft.boardHeight;
  const patch = (p: Partial<GameSettings>) => setDraft((d) => ({ ...d, ...p }));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-3 sm:items-center">
      <div className="w-full max-w-md rounded-3xl border-4 border-ink bg-card p-5 shadow-[0_6px_0_0_var(--ink)]">
        <h2 className="font-display text-2xl text-foreground">Game Settings</h2>
        <p className="mt-1 text-xs text-muted-foreground">Changing anything starts a fresh game.</p>

        <div className="mt-3 divide-y divide-border/30">
          <Row label="Board width">
            <Num value={draft.boardWidth} min={2} max={8} onChange={(n) => patch({ boardWidth: n })} />
          </Row>
          <Row label="Board height">
            <Num value={draft.boardHeight} min={2} max={9} onChange={(n) => patch({ boardHeight: n })} />
          </Row>
          <Row label="Plates served">
            <Num value={draft.servedPlates} min={1} max={5} onChange={(n) => patch({ servedPlates: n })} />
          </Row>
          <Row label="Cake types">
            <Num value={draft.cakeTypes} min={2} max={MAX_CAKE_TYPES} onChange={(n) => patch({ cakeTypes: n })} />
          </Row>
          <Row label="Starting plates">
            <Num
              value={Math.min(draft.startingPlates, maxStarting)}
              min={0}
              max={maxStarting}
              onChange={(n) => patch({ startingPlates: n })}
            />
          </Row>
          <Row label="Plate capacity">
            <Num value={draft.plateCapacity} min={3} max={8} onChange={(n) => patch({ plateCapacity: n })} />
          </Row>
          <Row label="Mix intensity">
            <Segmented value={draft.mixIntensity} options={MIXES} onChange={(v) => patch({ mixIntensity: v })} />
          </Row>
          <Row label="Resolution">
            <Segmented value={draft.resolutionMode} options={MODES} onChange={(v) => patch({ resolutionMode: v })} />
          </Row>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onStart(draft)}
            className="flex-1 rounded-full border-4 border-ink bg-primary px-4 py-2 font-display text-lg text-primary-foreground shadow-[0_4px_0_0_var(--ink)] active:translate-y-1 active:shadow-none"
          >
            Start game
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border-4 border-ink bg-card px-4 py-2 font-display text-lg text-foreground shadow-[0_4px_0_0_var(--ink)] active:translate-y-1 active:shadow-none"
          >
            Close
          </button>
        </div>
        <button
          type="button"
          onClick={onResetScores}
          className="mt-3 w-full text-xs font-bold text-muted-foreground underline"
        >
          Reset saved scores
        </button>
      </div>
    </div>
  );
}
