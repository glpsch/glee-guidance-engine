import { SAVED_SCORE_COUNT } from "./config";

/** Rule 27 — local persistence only, no backend. */
const KEY = "cake-sort-scores-v1";

export function loadScores(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((n): n is number => typeof n === "number");
  } catch {
    return [];
  }
}

export function saveScore(score: number): number[] {
  const next = [...loadScores(), score].sort((a, b) => b - a).slice(0, SAVED_SCORE_COUNT);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable — scores simply do not persist */
  }
  return next;
}

export function resetScores(): number[] {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  return [];
}
