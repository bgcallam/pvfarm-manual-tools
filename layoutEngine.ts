import {
  AlignMode,
  Block,
  FillPattern,
  Parcel,
  Point,
  RoadGeometry,
  Tracker,
} from './types';
import {
  BLOCK_COLORS,
  BLOCK_ILR_VALUES,
  CONFIG,
  TRACKER_BORDER_SETBACK_PX,
  TRACKER_SIZE_PX,
} from './constants';

const FILL_PRESETS: Record<FillPattern, { rowFactor: number; colFactor: number }> = {
  aligned: { rowFactor: 1, colFactor: 1 },
  max: { rowFactor: 0.9, colFactor: 0.92 },
  mega: { rowFactor: 0.8, colFactor: 0.84 },
};

export const pointInPolygon = (point: Point, polygon: Point[]): boolean => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersects =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi + 0.00001) + xi;

    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
};

export const getParcelBounds = (parcel: Parcel) => {
  const xs = parcel.points.map((point) => point.x);
  const ys = parcel.points.map((point) => point.y);

  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
};

export const createRoadGeometry = (parcel: Parcel, roadWidthMeters: number): RoadGeometry => {
  const bounds = getParcelBounds(parcel);
  return {
    x1: bounds.minX - 30,
    x2: bounds.maxX + 30,
    y: (bounds.minY + bounds.maxY) / 2,
    width: roadWidthMeters * CONFIG.pixelsPerMeter,
  };
};

const topBoundaryYAtX = (polygon: Point[], x: number): number | null => {
  const intersections: number[] = [];

  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];

    const minX = Math.min(a.x, b.x);
    const maxX = Math.max(a.x, b.x);

    if (x < minX || x > maxX) {
      continue;
    }

    if (a.x === b.x) {
      intersections.push(Math.min(a.y, b.y));
      continue;
    }

    const t = (x - a.x) / (b.x - a.x);
    if (t >= 0 && t <= 1) {
      intersections.push(a.y + (b.y - a.y) * t);
    }
  }

  if (!intersections.length) {
    return null;
  }

  return Math.min(...intersections);
};

const buildColumnIndex = (trackers: Tracker[], road: RoadGeometry) => {
  const northTrackers = trackers.filter(
    (tracker) => tracker.y + tracker.height / 2 < road.y,
  );

  const columns = new Map<number, Tracker[]>();
  northTrackers.forEach((tracker) => {
    const key = Math.round(tracker.x);
    const current = columns.get(key) ?? [];
    current.push(tracker);
    columns.set(key, current);
  });

  columns.forEach((columnTrackers) => {
    columnTrackers.sort((a, b) => a.y - b.y);
  });

  return columns;
};

const computeColumnShiftMap = (
  trackers: Tracker[],
  parcel: Parcel,
  road: RoadGeometry,
  mode: AlignMode,
): Map<number, number> => {
  const columns = buildColumnIndex(trackers, road);
  const shifts = new Map<number, number>();

  columns.forEach((columnTrackers, key) => {
    const topTracker = columnTrackers[0];
    const centerX = topTracker.x + topTracker.width / 2;
    const topBoundary = topBoundaryYAtX(parcel.points, centerX);

    if (topBoundary === null) {
      shifts.set(key, 0);
      return;
    }

    const targetTopY = topBoundary + TRACKER_BORDER_SETBACK_PX;
    const availableShift = Math.max(0, topTracker.y - targetTopY);
    shifts.set(key, availableShift);
  });

  if (mode === 'noodle') {
    return shifts;
  }

  const shiftValues = [...shifts.values()].filter((value) => value > 0);
  if (!shiftValues.length) {
    return new Map([...shifts.keys()].map((key) => [key, 0]));
  }

  const averageShift = shiftValues.reduce((sum, value) => sum + value, 0) / shiftValues.length;
  const rigidShift = Math.max(8, Math.min(32, averageShift * 0.45));

  return new Map([...shifts.keys()].map((key) => [key, rigidShift]));
};

export const applyNorthFieldAlignment = (
  trackers: Tracker[],
  parcel: Parcel,
  road: RoadGeometry,
  mode: AlignMode,
): Tracker[] => {
  const shifts = computeColumnShiftMap(trackers, parcel, road, mode);

  return trackers.map((tracker) => {
    const isNorth = tracker.y + tracker.height / 2 < road.y;
    if (!isNorth) {
      return tracker;
    }

    const key = Math.round(tracker.x);
    const shift = shifts.get(key) ?? 0;

    return {
      ...tracker,
      y: tracker.y - shift,
    };
  });
};

export const generateTrackerLayout = (
  parcel: Parcel,
  fillPattern: FillPattern,
  rowSpacingMeters: number,
  roadWidthMeters: number,
): { trackers: Tracker[]; road: RoadGeometry } => {
  const bounds = getParcelBounds(parcel);
  const road = createRoadGeometry(parcel, roadWidthMeters);
  const trackers: Tracker[] = [];

  const preset = FILL_PRESETS[fillPattern];
  const rowSpacingPx = rowSpacingMeters * CONFIG.pixelsPerMeter * preset.rowFactor;
  const colSpacingPx = 24 * preset.colFactor;

  const trackerW = TRACKER_SIZE_PX.width;
  const trackerH = TRACKER_SIZE_PX.height;
  const roadGap = road.width / 2 + 16;

  let y = bounds.minY + 30;

  while (y + trackerH < bounds.maxY - 12) {
    const rowCenterY = y + trackerH / 2;

    if (Math.abs(rowCenterY - road.y) < roadGap) {
      y = road.y + roadGap + 8;
      continue;
    }

    let x = bounds.minX + 18;
    while (x + trackerW < bounds.maxX - 12) {
      const center = {
        x: x + trackerW / 2,
        y: y + trackerH / 2,
      };

      if (pointInPolygon(center, parcel.points)) {
        trackers.push({
          id: `tracker-${trackers.length}`,
          x,
          y,
          width: trackerW,
          height: trackerH,
          parcelId: parcel.id,
        });
      }

      x += trackerW + colSpacingPx;
    }

    y += trackerH + rowSpacingPx;
  }

  return { trackers, road };
};

const blockFromBounds = (
  id: string,
  ilr: string,
  color: string,
  x: number,
  y: number,
  width: number,
  height: number,
): Block => ({
  id,
  ilr,
  color,
  label: `${ilr} ILR`,
  bounds: { x, y, width, height },
});

const getTrackersBounds = (trackers: Tracker[]) => {
  const minX = Math.min(...trackers.map((tracker) => tracker.x));
  const minY = Math.min(...trackers.map((tracker) => tracker.y));
  const maxX = Math.max(...trackers.map((tracker) => tracker.x + tracker.width));
  const maxY = Math.max(...trackers.map((tracker) => tracker.y + tracker.height));

  return { minX, minY, maxX, maxY };
};

export const generateBlockMasks = (trackers: Tracker[], road: RoadGeometry): Block[] => {
  if (!trackers.length) {
    return [];
  }

  const northTrackers = trackers.filter(
    (tracker) => tracker.y + tracker.height / 2 < road.y,
  );
  const southTrackers = trackers.filter(
    (tracker) => tracker.y + tracker.height / 2 > road.y,
  );

  if (!northTrackers.length || !southTrackers.length) {
    return [];
  }

  const northBounds = getTrackersBounds(northTrackers);
  const southBounds = getTrackersBounds(southTrackers);

  const blocks: Block[] = [];
  const northRatios = [0.32, 0.34, 0.34];
  const southRatios = [0.52, 0.48];

  let cursorX = northBounds.minX - 6;
  const northWidth = northBounds.maxX - northBounds.minX + 12;

  northRatios.forEach((ratio, index) => {
    const width = northWidth * ratio;
    blocks.push(
      blockFromBounds(
        `block-north-${index}`,
        BLOCK_ILR_VALUES[index],
        BLOCK_COLORS[index],
        cursorX,
        northBounds.minY - 6,
        width,
        northBounds.maxY - northBounds.minY + 12,
      ),
    );
    cursorX += width;
  });

  cursorX = southBounds.minX - 6;
  const southWidth = southBounds.maxX - southBounds.minX + 12;

  southRatios.forEach((ratio, ratioIndex) => {
    const blockIndex = ratioIndex + 3;
    const width = southWidth * ratio;
    blocks.push(
      blockFromBounds(
        `block-south-${ratioIndex}`,
        BLOCK_ILR_VALUES[blockIndex],
        BLOCK_COLORS[blockIndex],
        cursorX,
        southBounds.minY - 6,
        width,
        southBounds.maxY - southBounds.minY + 12,
      ),
    );
    cursorX += width;
  });

  return blocks;
};
