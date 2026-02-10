import { describe, expect, it } from 'vitest';
import { distanceToPolyline, distanceToSegment, projectPointOnSegment } from '../geometry';

describe('geometry utils', () => {
  it('projects points onto a segment', () => {
    const projected = projectPointOnSegment({ x: 5, y: 5 }, { x: 0, y: 0 }, { x: 10, y: 0 });
    expect(projected).toEqual({ x: 5, y: 0 });
  });

  it('clamps projection to segment endpoints', () => {
    const projected = projectPointOnSegment({ x: 20, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 });
    expect(projected).toEqual({ x: 10, y: 0 });
  });

  it('measures distance to segment', () => {
    const distance = distanceToSegment({ x: 5, y: 5 }, { x: 0, y: 0 }, { x: 10, y: 0 });
    expect(distance).toBeCloseTo(5, 5);
  });

  it('measures distance to polyline', () => {
    const distance = distanceToPolyline({ x: 5, y: 5 }, [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ]);
    expect(distance).toBeCloseTo(5, 5);
  });
});
