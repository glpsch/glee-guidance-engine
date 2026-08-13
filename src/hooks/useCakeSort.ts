import { useCallback, useEffect, useRef, useState } from "react";
import { COMPLETION_HOLD_MS, DEFAULT_SETTINGS, TICK_DURATION_MS } from "@/game/config";
import { cloneBoard, isBoardFull } from "@/game/board";
import { generateServedPlate, generateStartingBoard, generateTray } from "@/game/generate";
import { resolveBoard } from "@/game/resolve";
import { scoreForCascade } from "@/game/scoring";
import { loadScores, resetScores, saveScore } from "@/game/storage";
import type { Board, GameSettings, Plate } from "@/game/types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function useCakeSort() {
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [board, setBoard] = useState<Board>(() => generateStartingBoard(DEFAULT_SETTINGS));
  const [tray, setTray] = useState<Plate[]>(() => generateTray(DEFAULT_SETTINGS));
  const [score, setScore] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [completing, setCompleting] = useState<number[]>([]);
  const [landed, setLanded] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const runId = useRef(0);

  useEffect(() => {
    setScores(loadScores());
  }, []);

  const start = useCallback((next: GameSettings) => {
    runId.current += 1;
    setSettings(next);
    setBoard(generateStartingBoard(next));
    setTray(generateTray(next));
    setScore(0);
    setCompleting([]);
    setSelected(null);
    setBusy(false);
    setGameOver(false);
  }, []);

  const restart = useCallback(() => start(settings), [settings, start]);

  const place = useCallback(
    async (cellIndex: number, trayIndex: number) => {
      if (busy || gameOver) return;
      const plate = tray[trayIndex];
      if (!plate || board.cells[cellIndex]) return;

      const myRun = (runId.current += 1);
      setBusy(true);
      setSelected(null);
      setLanded(cellIndex);

      const placed = cloneBoard(board);
      placed.cells[cellIndex] = { id: plate.id, counts: [...plate.counts] };
      setBoard(placed);
      setTray((t) => t.map((p, i) => (i === trayIndex ? generateServedPlate(settings) : p)));

      const { snapshots, finalBoard, completions } = resolveBoard(placed, settings, cellIndex);

      for (const snap of snapshots) {
        await sleep(TICK_DURATION_MS);
        if (runId.current !== myRun) return;
        setBoard(snap.board);
        setCompleting(snap.completed);
        if (snap.completed.length > 0) await sleep(COMPLETION_HOLD_MS);
        if (runId.current !== myRun) return;
      }

      setCompleting([]);
      setBoard(finalBoard);
      setLanded(null);

      if (completions > 0) setScore((s) => s + scoreForCascade(completions));

      if (isBoardFull(finalBoard)) {
        setGameOver(true);
        setScore((finalScore) => {
          setScores(saveScore(finalScore + (completions > 0 ? scoreForCascade(completions) : 0) - (completions > 0 ? scoreForCascade(completions) : 0)));
          return finalScore;
        });
      }
      setBusy(false);
    },
    [board, busy, gameOver, settings, tray],
  );

  // Persist the score once the game is actually over and the total has settled.
  useEffect(() => {
    if (!gameOver) return;
    setScores(saveScore(score));
  }, [gameOver]); // eslint-disable-line react-hooks/exhaustive-deps

  const clearScores = useCallback(() => setScores(resetScores()), []);

  return {
    settings,
    board,
    tray,
    score,
    scores,
    best: scores[0] ?? 0,
    completing,
    landed,
    busy,
    gameOver,
    selected,
    setSelected,
    place,
    start,
    restart,
    clearScores,
  };
}
