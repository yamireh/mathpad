/**
 * Auto-naming for practice sets.
 */

/**
 * The next practice-set name: `YYYY-MM-DD #n`, where `n` restarts at 1 each day.
 * Counts the existing titles that start with today's date (+1). Pure — pass
 * `now` so it's deterministic/testable.
 */
export function nextExamTitle(existingTitles: string[], now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const date = `${y}-${m}-${d}`;
  const seq = existingTitles.filter((tt) => tt.startsWith(date)).length + 1;
  return `${date} #${seq}`;
}
