import { describe, it, expect } from "vitest";
import { DEFAULT_SETTINGS } from "@/game/config";
import { generateStartingBoard } from "@/game/generate";
import { resolveBoard } from "@/game/resolve";
describe("stable start", () => { it("no snapshots", () => {
  for (let i=0;i<200;i++){
    const s = { ...DEFAULT_SETTINGS, startingPlates: 8, mixIntensity: "hard" as const };
    const b = generateStartingBoard(s);
    expect(resolveBoard(b, s, null).snapshots.length).toBe(0);
  }
});});
