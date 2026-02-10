import { Point } from './types';

export const distanceToSegment = (point: Point, start: Point, end: Point): number => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (dx === 0 && dy === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy),
    ),
  );

  const projectionX = start.x + t * dx;
  const projectionY = start.y + t * dy;

  return Math.hypot(point.x - projectionX, point.y - projectionY);
};

export const projectPointOnSegment = (point: Point, start: Point, end: Point): Point => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (dx === 0 && dy === 0) {
    return { x: start.x, y: start.y };
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy),
    ),
  );

  return {
    x: start.x + t * dx,
    y: start.y + t * dy,
  };
};

export const distanceToPolyline = (point: Point, polyline: Point[]): number => {
  if (polyline.length < 2) {
    return Number.POSITIVE_INFINITY;
  }
  let minDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < polyline.length - 1; index += 1) {
    minDistance = Math.min(minDistance, distanceToSegment(point, polyline[index], polyline[index + 1]));
  }
  return minDistance;
};
