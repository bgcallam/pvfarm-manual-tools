export const DEFAULT_STRING_COUNTS = [1, 2, 3] as const;

export function estimateRows(distance: number, rowToRow: number): number {
  if (!Number.isFinite(distance) || !Number.isFinite(rowToRow) || rowToRow <= 0) {
    return 0;
  }
  if (distance <= 0) {
    return 0;
  }
  return Math.max(1, Math.round(distance / rowToRow));
}

export function estimateStringsRange(
  distance: number,
  rowToRow: number,
  stringCounts: readonly number[] = DEFAULT_STRING_COUNTS
): { min: number; max: number } {
  const rows = estimateRows(distance, rowToRow);
  if (rows === 0 || stringCounts.length === 0) {
    return { min: 0, max: 0 };
  }
  const minCount = Math.min(...stringCounts);
  const maxCount = Math.max(...stringCounts);
  const min = Math.max(1, Math.round(rows * minCount));
  const max = Math.max(min, Math.round(rows * maxCount));
  return { min, max };
}

export function formatApproxRows(distance: number, unit: string, rows: number): string {
  return `${distance}${unit}, approximately ${rows} rows`;
}

export function formatApproxStrings(
  distance: number,
  unit: string,
  range: { min: number; max: number }
): string {
  const text = range.min === range.max ? `${range.min}` : `${range.min}-${range.max}`;
  return `${distance}${unit}, approximately ${text} strings`;
}
