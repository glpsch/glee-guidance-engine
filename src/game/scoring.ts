/**
 * Rule 26 — the single scoring function. `n` is the number of cakes completed
 * within one placement's full resolution cascade. Isolated on purpose: no
 * scoring logic exists anywhere else in the codebase.
 */
export function scoreForCascade(n: number): number {
  if (n <= 0) return 0;
  if (n <= 3) {
    let factorial = 1;
    for (let i = 2; i <= n - 1; i += 1) factorial *= i;
    return 100 * Math.pow(5, n - 1) * factorial;
  }
  return 5000 + 2500 * (n - 3);
}
