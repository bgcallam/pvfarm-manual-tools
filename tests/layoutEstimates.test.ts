import { describe, expect, it } from 'vitest';
import {
  estimateRows,
  estimateStringsRange,
  formatApproxRows,
  formatApproxStrings,
} from '../layoutEstimates';

describe('layoutEstimates', () => {
  it('estimates rows from distance and row spacing', () => {
    expect(estimateRows(100, 20)).toBe(5);
  });

  it('estimates strings range based on rows and string counts', () => {
    expect(estimateStringsRange(100, 20, [1, 3])).toEqual({ min: 5, max: 15 });
  });

  it('formats approximate rows and strings labels', () => {
    expect(formatApproxRows(100, 'ft', 5)).toBe('100ft, approximately 5 rows');
    expect(formatApproxStrings(100, 'ft', { min: 3, max: 4 })).toBe(
      '100ft, approximately 3-4 strings'
    );
  });
});
