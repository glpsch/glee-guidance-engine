import { CAKE_TYPES } from "@/game/config";
import { piecesOf } from "@/game/board";
import type { Plate } from "@/game/types";
import { cn } from "@/lib/utils";

interface Props {
  plate: Plate;
  capacity: number;
  size?: number;
  className?: string;
  completing?: boolean;
}

function wedgePath(cx: number, cy: number, r: number, start: number, end: number): string {
  const p = (a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const [x1, y1] = p(start);
  const [x2, y2] = p(end);
  const large = end - start > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
}

export function CakePlate({ plate, capacity, size = 64, className, completing }: Props) {
  const pieces = piecesOf(plate);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - size * 0.11;
  const step = (Math.PI * 2) / capacity;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width="100%"
      height="100%"
      className={cn("select-none", completing && "animate-pop-complete", className)}
      aria-hidden="true"
    >
      <circle cx={cx} cy={cy} r={size / 2 - size * 0.035} fill="var(--plate)" stroke="var(--ink)" strokeWidth={size * 0.07} />
      {pieces.map((type, i) => {
        const start = -Math.PI / 2 + i * step;
        return (
          <path
            key={`${plate.id}-${i}`}
            d={wedgePath(cx, cy, r, start, start + step)}
            fill={CAKE_TYPES[type % CAKE_TYPES.length]?.color}
            stroke="var(--ink)"
            strokeWidth={size * 0.045}
            strokeLinejoin="round"
          />
        );
      })}
      <circle cx={cx} cy={cy} r={size * 0.055} fill="var(--ink)" />
    </svg>
  );
}
