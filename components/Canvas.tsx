import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CANVAS_VIEWBOX,
  CONFIG,
  DEFAULT_STRING_COUNT,
  DEFAULT_STRING_SIZE,
  MODULE_WATTAGE_W,
} from '../constants';
import {
  applyNorthFieldAlignment,
  generateBlockMasks,
  generateTrackerLayout,
  getParcelBounds,
  pointInPolygon,
} from '../layoutEngine';
import { DesignState, Point, Road, Tracker } from '../types';
import { distanceToPolyline, projectPointOnSegment } from '../geometry';

interface CanvasProps {
  state: DesignState;
  onTrackerCountChange: (count: number) => void;
  onFlowChange: (updates: Partial<DesignState>) => void;
}

interface SnapTarget {
  point: Point;
  label: string;
  distance: number;
  color: string;
}

const SNAP_THRESHOLD = 16;
const SELECTION_THRESHOLD = 18;

const toPath = (points: Point[]): string => {
  if (!points.length) {
    return '';
  }
  const [first, ...rest] = points;
  return [`M ${first.x} ${first.y}`, ...rest.map((point) => `L ${point.x} ${point.y}`), 'Z'].join(' ');
};

const getRoadCenterlineY = (road: Road): number =>
  road.points.reduce((sum, point) => sum + point.y, 0) / Math.max(road.points.length, 1);

const getRoadSegment = (road: Road) => {
  const xs = road.points.map((point) => point.x);
  const x1 = Math.min(...xs);
  const x2 = Math.max(...xs);
  return {
    x1,
    x2,
    y: getRoadCenterlineY(road),
    width: road.width,
  };
};

const getPolygonBounds = (points: Point[]) => {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
};

const isNorthOfRoad = (tracker: Tracker, roadY: number): boolean =>
  tracker.y + tracker.height / 2 < roadY;

const groupRows = (trackers: Tracker[]): Tracker[][] => {
  const buckets = new Map<number, Tracker[]>();

  trackers.forEach((tracker) => {
    const key = Math.round(tracker.y / 6) * 6;
    const current = buckets.get(key) ?? [];
    current.push(tracker);
    buckets.set(key, current);
  });

  return [...buckets.values()].sort((a, b) => a[0].y - b[0].y);
};

const getNearestTracker = (trackers: Tracker[], point: Point): Tracker | null => {
  if (!trackers.length) {
    return null;
  }

  let nearest: Tracker | null = null;
  let minDistance = Number.POSITIVE_INFINITY;

  trackers.forEach((tracker) => {
    const centerX = tracker.x + tracker.width / 2;
    const centerY = tracker.y + tracker.height / 2;
    const distance = Math.hypot(centerX - point.x, centerY - point.y);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = tracker;
    }
  });

  return minDistance < 80 ? nearest : null;
};

const getContiguousTrackerField = (
  trackers: Tracker[],
  seed: Tracker,
  roadY: number,
): Tracker[] => {
  const seedIsNorth = isNorthOfRoad(seed, roadY);

  const isAdjacent = (a: Tracker, b: Tracker): boolean => {
    if (isNorthOfRoad(b, roadY) !== seedIsNorth) {
      return false;
    }

    const centerAX = a.x + a.width / 2;
    const centerAY = a.y + a.height / 2;
    const centerBX = b.x + b.width / 2;
    const centerBY = b.y + b.height / 2;

    const dx = Math.abs(centerAX - centerBX);
    const dy = Math.abs(centerAY - centerBY);

    const maxDx = Math.max(a.width, b.width) * 4.8;
    const maxDy = Math.max(a.height, b.height) * 1.65;

    return dx <= maxDx && dy <= maxDy;
  };

  const visited = new Set<string>([seed.id]);
  const queue: Tracker[] = [seed];
  const field: Tracker[] = [seed];

  while (queue.length) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    trackers.forEach((candidate) => {
      if (visited.has(candidate.id)) {
        return;
      }

      if (isAdjacent(current, candidate)) {
        visited.add(candidate.id);
        queue.push(candidate);
        field.push(candidate);
      }
    });
  }

  return field;
};

const getFieldBySeedId = (trackers: Tracker[], seedId: string, roadY: number): Tracker[] => {
  const seed = trackers.find((tracker) => tracker.id === seedId);
  if (!seed) {
    return [];
  }
  return getContiguousTrackerField(trackers, seed, roadY);
};

const applyMoveOffset = (
  trackers: Tracker[],
  roadY: number,
  activeFieldSeedId: string | null,
  moveOps: number,
): Tracker[] => {
  if (moveOps === 0 || !activeFieldSeedId) {
    return trackers;
  }

  const fieldTrackers = getFieldBySeedId(trackers, activeFieldSeedId, roadY);
  if (!fieldTrackers.length) {
    return trackers;
  }
  const fieldIds = new Set(fieldTrackers.map((tracker) => tracker.id));

  const dx = moveOps * 6;
  const dy = moveOps * -4;

  return trackers.map((tracker) => {
    if (!fieldIds.has(tracker.id)) {
      return tracker;
    }

    return { ...tracker, x: tracker.x + dx, y: tracker.y + dy };
  });
};

const Canvas: React.FC<CanvasProps> = ({ state, onTrackerCountChange, onFlowChange }) => {
  const { ui, flow, settings, model } = state;
  const svgRef = useRef<SVGSVGElement>(null);
  const [cursorPoint, setCursorPoint] = useState<Point | null>(null);
  const [moveOps, setMoveOps] = useState(0);
  const [editOps, setEditOps] = useState(0);
  const [trimOps, setTrimOps] = useState(0);
  const [extendOps, setExtendOps] = useState(0);
  const [copiedTrackers, setCopiedTrackers] = useState<Tracker[]>([]);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);
  const [isSnapSuppressed, setIsSnapSuppressed] = useState(false);

  const workingParcel = model.parcels.find((parcel) => parcel.isWorking);

  useEffect(() => {
    if (!flashMessage) {
      return undefined;
    }

    const timeout = window.setTimeout(() => setFlashMessage(null), 1400);
    return () => window.clearTimeout(timeout);
  }, [flashMessage]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey) {
        setIsSnapSuppressed(true);
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (!event.altKey) {
        setIsSnapSuppressed(false);
      }
    };
    const handleBlur = () => setIsSnapSuppressed(false);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  useEffect(() => {
    if (!flow.fillCommitted) {
      setMoveOps(0);
      setEditOps(0);
      setTrimOps(0);
      setExtendOps(0);
      setCopiedTrackers([]);
    }
  }, [flow.fillCommitted]);

  const baseLayout = useMemo(() => {
    if (!workingParcel) {
      return null;
    }

    return generateTrackerLayout(
      workingParcel,
      ui.fillPattern,
      settings.rowToRow,
      settings.roadWidth,
    );
  }, [workingParcel, ui.fillPattern, settings.rowToRow, settings.roadWidth]);

  if (!baseLayout || !workingParcel) {
    return <div className="w-full h-full bg-slate-950" />;
  }

  const parcelBounds = getParcelBounds(workingParcel);
  const baseRoadSegment = useMemo(() => getRoadSegment(baseLayout.road), [baseLayout.road]);

  const trackersAfterAlign = useMemo(() => {
    if (!flow.fillCommitted) {
      return [];
    }

    if (flow.alignCommittedMode) {
      return applyNorthFieldAlignment(
        baseLayout.trackers,
        workingParcel,
        baseLayout.road,
        settings,
        flow.alignCommittedMode,
      );
    }

    return baseLayout.trackers;
  }, [
    baseLayout.trackers,
    baseLayout.road,
    flow.fillCommitted,
    flow.alignCommittedMode,
    settings,
    workingParcel,
  ]);

  const activeFieldSide = useMemo<'north' | 'south' | null>(() => {
    if (!ui.activeFieldSeedId) {
      return null;
    }

    const seed = trackersAfterAlign.find((tracker) => tracker.id === ui.activeFieldSeedId);
    if (!seed) {
      return null;
    }

    return isNorthOfRoad(seed, baseRoadSegment.y) ? 'north' : 'south';
  }, [ui.activeFieldSeedId, trackersAfterAlign, baseRoadSegment.y]);

  const roadFromEdit = useMemo(() => {
    const shift = editOps * (ui.adaptiveRoadEditing ? 2.5 : 1.6);
    const direction = activeFieldSide === 'south' ? 1 : -1;
    const delta = shift * direction;
    return {
      ...baseLayout.road,
      points: baseLayout.road.points.map((point) => ({ ...point, y: point.y + delta })),
    };
  }, [baseLayout.road, editOps, ui.adaptiveRoadEditing, activeFieldSide]);

  const roadSegment = useMemo(() => getRoadSegment(roadFromEdit), [roadFromEdit]);

  const activeFieldIds = useMemo<Set<string> | null>(() => {
    if (!flow.fillCommitted || !ui.activeFieldSeedId) {
      return null;
    }

    const fieldTrackers = getFieldBySeedId(trackersAfterAlign, ui.activeFieldSeedId, roadSegment.y);
    if (!fieldTrackers.length) {
      return null;
    }

    return new Set(fieldTrackers.map((tracker) => tracker.id));
  }, [flow.fillCommitted, ui.activeFieldSeedId, trackersAfterAlign, roadSegment.y]);

  const trackersAfterEdit = useMemo(() => {
    if (!flow.fillCommitted) {
      return [];
    }

    let trackers = trackersAfterAlign;

    if (editOps > 0) {
      const influence = ui.editSubMode === 'segment' ? 1.4 : ui.editSubMode === 'add_remove' ? 0.9 : 1;
      const nudge = Math.round(editOps * 1.2 * influence);

      trackers = trackers
        .map((tracker) => {
          if (activeFieldIds && !activeFieldIds.has(tracker.id)) {
            return tracker;
          }

          const distanceToRoad = Math.abs(tracker.y + tracker.height / 2 - roadSegment.y);
          if (distanceToRoad > 140) {
            return tracker;
          }

          const towardEdge = tracker.y + tracker.height / 2 < roadSegment.y ? -1 : 1;
          return {
            ...tracker,
            y: tracker.y + towardEdge * nudge,
          };
        })
        .filter((tracker) => {
          if (activeFieldIds && !activeFieldIds.has(tracker.id)) {
            return true;
          }

          if (!settings.objectRemovesUnderlying && ui.editSubMode !== 'add_remove') {
            return true;
          }

          const distanceToRoad = Math.abs(tracker.y + tracker.height / 2 - roadSegment.y);
          return distanceToRoad > roadSegment.width / 2 + 7;
        });
    }

    return trackers;
  }, [
    flow.fillCommitted,
    editOps,
    ui.editSubMode,
    settings.objectRemovesUnderlying,
    activeFieldIds,
    trackersAfterAlign,
    roadSegment,
  ]);

  const trackersAfterTrimExtend = useMemo(() => {
    if (!flow.fillCommitted) {
      return [];
    }

    let trackers = trackersAfterEdit;

    if (trimOps > 0) {
      const northCutoff = parcelBounds.minY + 26 + trimOps * 11;
      const southCutoff = parcelBounds.maxY - 26 - trimOps * 11;

      trackers = trackers.filter((tracker) => {
        if (activeFieldIds && !activeFieldIds.has(tracker.id)) {
          return true;
        }

        if (tracker.y + tracker.height / 2 < roadSegment.y) {
          return tracker.y > northCutoff;
        }

        return tracker.y + tracker.height < southCutoff;
      });
    }

    if (extendOps > 0) {
      const sourceRows = groupRows(
        trackers.filter((tracker) => (activeFieldIds ? activeFieldIds.has(tracker.id) : true)),
      );

      const rowsToExtend = sourceRows.length ? [sourceRows[0], sourceRows[sourceRows.length - 1]].filter(Boolean) : [];
      const additions: Tracker[] = [];

      for (let op = 1; op <= extendOps; op += 1) {
        rowsToExtend.forEach((row, rowIndex) => {
          if (!row || !row.length) {
            return;
          }

          const direction = rowIndex === 0 ? -1 : 1;
          row.forEach((tracker) => {
            const y = tracker.y + direction * op * (tracker.height + 8);
            const center = { x: tracker.x + tracker.width / 2, y: y + tracker.height / 2 };

            if (!pointInPolygon(center, workingParcel.points)) {
              return;
            }

            additions.push({
              ...tracker,
              id: `${tracker.id}-ext-${op}-${direction}-${tracker.x}`,
              y,
            });
          });
        });
      }

      trackers = [...trackers, ...additions];
    }

    return trackers;
  }, [
    flow.fillCommitted,
    trimOps,
    extendOps,
    activeFieldIds,
    trackersAfterEdit,
    roadSegment.y,
    parcelBounds.minY,
    parcelBounds.maxY,
    workingParcel.points,
  ]);

  const trackersAfterMove = useMemo(
    () => applyMoveOffset(trackersAfterTrimExtend, roadSegment.y, ui.activeFieldSeedId, moveOps),
    [trackersAfterTrimExtend, roadSegment.y, ui.activeFieldSeedId, moveOps],
  );

  const renderedTrackers = useMemo(() => {
    if (!flow.fillCommitted) {
      return [];
    }

    return [...trackersAfterMove, ...copiedTrackers];
  }, [flow.fillCommitted, trackersAfterMove, copiedTrackers]);

  const alignPreviewTrackers = useMemo(() => {
    if (
      !flow.fillCommitted ||
      !flow.alignReferencePicked ||
      !flow.alignSelectionPicked ||
      flow.alignCommittedMode
    ) {
      return [];
    }

    return applyNorthFieldAlignment(
      baseLayout.trackers,
      workingParcel,
      baseLayout.road,
      settings,
      ui.alignMode,
    );
  }, [
    baseLayout.trackers,
    baseLayout.road,
    flow.fillCommitted,
    flow.alignReferencePicked,
    flow.alignSelectionPicked,
    flow.alignCommittedMode,
    ui.alignMode,
    settings,
    workingParcel,
  ]);

  const blockMasks = useMemo(() => {
    if (!flow.fillCommitted) {
      return [];
    }
    return generateBlockMasks(renderedTrackers, roadFromEdit, settings);
  }, [renderedTrackers, roadFromEdit, settings, flow.fillCommitted]);

  const previewCapacityMw = useMemo(() => {
    if (!baseLayout.trackers.length) {
      return '0.0';
    }
    const trackerDcKw =
      (DEFAULT_STRING_COUNT * DEFAULT_STRING_SIZE * MODULE_WATTAGE_W) / 1000;
    return ((baseLayout.trackers.length * trackerDcKw) / 1000).toFixed(1);
  }, [baseLayout.trackers.length]);

  useEffect(() => {
    onTrackerCountChange(renderedTrackers.length);
  }, [renderedTrackers.length, onTrackerCountChange]);

  const northReferencePoints = useMemo(
    () => (workingParcel ? workingParcel.points.slice(0, 5) : []),
    [workingParcel],
  );
  const boundaryPolyline = useMemo(
    () => (workingParcel ? [...workingParcel.points, workingParcel.points[0]] : []),
    [workingParcel],
  );

  const isInsideWorkingParcel =
    cursorPoint !== null && pointInPolygon(cursorPoint, workingParcel.points);

  const isHoveringNorthBoundary =
    cursorPoint !== null &&
    cursorPoint.y < baseRoadSegment.y + 24 &&
    distanceToPolyline(cursorPoint, northReferencePoints) < 12;

  const fillPreviewActive =
    ui.activeTool === 'fill' &&
    ui.viewMode === 'tracker' &&
    !flow.fillCommitted &&
    isInsideWorkingParcel;

  const blockPreviewActive =
    ui.activeTool === 'fill' &&
    ui.viewMode === 'block' &&
    flow.fillCommitted &&
    !flow.blockFillCommitted &&
    isInsideWorkingParcel;

  const blocksVisible = ui.showBlocks && (flow.blockFillCommitted || blockPreviewActive);

  const northTrackerIds = new Set(
    baseLayout.trackers.filter((t) => t.y + t.height / 2 < baseRoadSegment.y).map((t) => t.id),
  );

  const getSnapTarget = (point: Point): SnapTarget | null => {
    if (!ui.osnapEnabled || isSnapSuppressed) {
      return null;
    }

    const roadX = Math.max(roadSegment.x1, Math.min(roadSegment.x2, point.x));
    const candidates: SnapTarget[] = [];

    if (ui.osnapCategories.boundaryVertex) {
      candidates.push(
        ...workingParcel.points.map((vertex) => ({
          point: vertex,
          label: 'Boundary vertex',
          distance: Math.hypot(vertex.x - point.x, vertex.y - point.y),
          color: '#22d3ee',
        })),
      );
    }

    if (ui.osnapCategories.boundaryEdge && boundaryPolyline.length > 1) {
      let bestPoint: Point | null = null;
      let bestDistance = Number.POSITIVE_INFINITY;
      for (let index = 0; index < boundaryPolyline.length - 1; index += 1) {
        const start = boundaryPolyline[index];
        const end = boundaryPolyline[index + 1];
        const projected = projectPointOnSegment(point, start, end);
        const distance = Math.hypot(projected.x - point.x, projected.y - point.y);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestPoint = projected;
        }
      }
      if (bestPoint) {
        candidates.push({
          point: bestPoint,
          label: 'Boundary edge',
          distance: bestDistance,
          color: '#38bdf8',
        });
      }
    }

    if (ui.osnapCategories.roadCenterline) {
      candidates.push({
        point: { x: roadX, y: roadSegment.y },
        label: 'Road centerline',
        distance: Math.hypot(roadX - point.x, roadSegment.y - point.y),
        color: '#fb923c',
      });
    }

    if (ui.osnapCategories.roadEdge) {
      candidates.push(
        {
          point: { x: roadX, y: roadSegment.y - roadSegment.width / 2 },
          label: 'Road edge',
          distance: Math.hypot(
            roadX - point.x,
            roadSegment.y - roadSegment.width / 2 - point.y,
          ),
          color: '#f97316',
        },
        {
          point: { x: roadX, y: roadSegment.y + roadSegment.width / 2 },
          label: 'Road edge',
          distance: Math.hypot(
            roadX - point.x,
            roadSegment.y + roadSegment.width / 2 - point.y,
          ),
          color: '#f97316',
        },
      );
    }

    if (ui.osnapCategories.rowSpacing) {
      const rowSpacingPx = settings.rowToRow * CONFIG.pixelsPerMeter;
      if (rowSpacingPx > 0) {
        const snapY =
          parcelBounds.minY +
          Math.round((point.y - parcelBounds.minY) / rowSpacingPx) * rowSpacingPx;
        candidates.push({
          point: { x: point.x, y: snapY },
          label: 'R2R spacing',
          distance: Math.abs(point.y - snapY),
          color: '#4ade80',
        });
      }
    }

    if (!candidates.length) {
      return null;
    }
    const sorted = candidates.sort((a, b) => a.distance - b.distance);
    return sorted[0].distance <= SNAP_THRESHOLD ? sorted[0] : null;
  };

  const snapTarget = cursorPoint ? getSnapTarget(cursorPoint) : null;

  const effectiveCursorPoint = snapTarget ? snapTarget.point : cursorPoint;

  const hoveredFieldTrackers = useMemo(() => {
    if (!effectiveCursorPoint || !renderedTrackers.length || !flow.fillCommitted) {
      return [];
    }

    const nearest = getNearestTracker(renderedTrackers, effectiveCursorPoint);
    if (!nearest) {
      return [];
    }

    return getContiguousTrackerField(renderedTrackers, nearest, roadSegment.y);
  }, [effectiveCursorPoint, renderedTrackers, flow.fillCommitted, roadSegment.y]);

  const activeFieldTrackers = useMemo(() => {
    if (!ui.activeFieldSeedId || !renderedTrackers.length || !flow.fillCommitted) {
      return [];
    }
    return getFieldBySeedId(renderedTrackers, ui.activeFieldSeedId, roadSegment.y);
  }, [ui.activeFieldSeedId, renderedTrackers, flow.fillCommitted, roadSegment.y]);

  const hoverSelectionTrackers = useMemo(() => {
    if (
      !effectiveCursorPoint ||
      !renderedTrackers.length ||
      ui.activeTool !== 'select' ||
      !flow.fillCommitted
    ) {
      return [];
    }

    const nearest = getNearestTracker(renderedTrackers, effectiveCursorPoint);
    if (!nearest) {
      return [];
    }

    const hoverField =
      hoveredFieldTrackers.length > 0
        ? hoveredFieldTrackers
        : getContiguousTrackerField(renderedTrackers, nearest, roadSegment.y);
    const activeField = activeFieldTrackers.length > 0 ? activeFieldTrackers : hoverField;

    if (ui.viewMode === 'normal' || ui.selectionScope === 'individual') {
      return [nearest];
    }

    if (ui.selectionScope === 'row') {
      const nearestCenterX = nearest.x + nearest.width / 2;
      return hoverField.filter((tracker) => {
        const centerX = tracker.x + tracker.width / 2;
        return Math.abs(centerX - nearestCenterX) <= 8;
      });
    }

    if (ui.selectionScope === 'field') {
      return hoverField;
    }

    return renderedTrackers;
  }, [
    effectiveCursorPoint,
    renderedTrackers,
    ui.activeTool,
    flow.fillCommitted,
    ui.viewMode,
    ui.selectionScope,
    ui.activeFieldSeedId,
    hoveredFieldTrackers,
    activeFieldTrackers,
    roadSegment.y,
  ]);
  const hoverIds = new Set(hoverSelectionTrackers.map((tracker) => tracker.id));
  const selectedIds = new Set(ui.selectedTrackerIds);

  const normalHover = useMemo(() => {
    if (!effectiveCursorPoint || ui.viewMode !== 'normal') {
      return null;
    }
    if (ui.normalSelectionTarget === 'road') {
      const distance = distanceToPolyline(effectiveCursorPoint, roadFromEdit.points);
      return distance <= SELECTION_THRESHOLD ? { type: 'road' as const } : null;
    }
    if (ui.normalSelectionTarget === 'boundary') {
      const distance = distanceToPolyline(effectiveCursorPoint, boundaryPolyline);
      return distance <= SELECTION_THRESHOLD ? { type: 'boundary' as const } : null;
    }
    if (ui.normalSelectionTarget === 'tracker') {
      return hoverSelectionTrackers.length ? { type: 'tracker' as const } : null;
    }
    return null;
  }, [
    effectiveCursorPoint,
    ui.viewMode,
    ui.normalSelectionTarget,
    roadFromEdit.points,
    boundaryPolyline,
    hoverSelectionTrackers.length,
  ]);

  const ilrLabel = `${settings.ilrRange[0].toFixed(2)}–${settings.ilrRange[1].toFixed(2)}`;

  const tooltip = (() => {
    if (flashMessage) {
      return flashMessage;
    }

    if (ui.activeTool === 'fill' && ui.viewMode === 'tracker') {
      if (!flow.fillCommitted && isInsideWorkingParcel) {
        return `${ui.fillPattern[0].toUpperCase()}${ui.fillPattern.slice(1)} · +${previewCapacityMw} MW · ${baseLayout.trackers.length} trackers`;
      }
      if (!flow.fillCommitted) {
        return 'Hover inside the left parcel to preview Fill';
      }
      return 'Fill committed. Use Edit/Align/Trim/Select for manual operations';
    }

    if (ui.activeTool === 'align' && ui.viewMode === 'tracker') {
      if (!flow.fillCommitted) {
        return 'Commit Fill before running Align';
      }
      if (!flow.alignReferencePicked) {
        return 'Pick 1: select north boundary';
      }
      if (!flow.alignSelectionPicked) {
        return 'Pick 2: select north field (above road)';
      }
      if (!flow.alignCommittedMode) {
        return `Align: ${ui.alignMode} preview (Space toggles)`;
      }
      return `Aligned (${flow.alignCommittedMode}) committed`;
    }

    if (ui.activeTool === 'edit') {
      if (!flow.fillCommitted) {
        return 'Commit Fill first';
      }
      return `Edit (${ui.editSubMode}) · click to apply local adaptive change in active field`;
    }

    if (ui.activeTool === 'trim') {
      if (!flow.fillCommitted) {
        return 'Commit Fill first';
      }
      return `${ui.trimExtendMode.toUpperCase()} · click to ${ui.trimExtendMode} in active field`;
    }

    if (ui.activeTool === 'select') {
      if (!flow.fillCommitted && ui.viewMode !== 'normal') {
        return 'Commit Fill first';
      }
      if (ui.viewMode === 'normal') {
        return `Select ${ui.normalSelectionTarget} · ${ui.selectedTrackerIds.length} selected`;
      }
      return `Select ${ui.selectionScope} · ${ui.selectedTrackerIds.length} selected`;
    }

    if (ui.activeTool === 'fill' && ui.viewMode === 'block') {
      if (!flow.fillCommitted) {
        return 'Commit tracker Fill first';
      }
      if (flow.blockFillCommitted) {
        return `Block Fill committed · 5 blocks · ILR range ${ilrLabel}`;
      }
      return isInsideWorkingParcel
        ? `Block Fill · 5 blocks · ILR range ${ilrLabel}`
        : 'Hover inside the left parcel to preview block fill';
    }

    return null;
  })();

  const eventToWorldPoint = (event: React.MouseEvent<SVGSVGElement>): Point | null => {
    const svg = svgRef.current;
    if (!svg) {
      return null;
    }

    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;

    const ctm = svg.getScreenCTM();
    if (!ctm) {
      return null;
    }

    const world = point.matrixTransform(ctm.inverse());
    return { x: world.x, y: world.y };
  };

  const onSelectAction = (clickedPoint: Point) => {
    if (ui.viewMode === 'normal') {
      if (ui.normalSelectionTarget === 'road') {
        const distance = distanceToPolyline(clickedPoint, roadFromEdit.points);
        if (distance > SELECTION_THRESHOLD) {
          setFlashMessage('No road in selection target');
          return;
        }
        onFlowChange({
          ui: {
            selectedTrackerIds: [],
            selectedRoadId: roadFromEdit.id,
            selectedBoundaryId: null,
          },
        });
        setFlashMessage('Road selected');
        return;
      }

      if (ui.normalSelectionTarget === 'boundary') {
        const distance = distanceToPolyline(clickedPoint, boundaryPolyline);
        if (distance > SELECTION_THRESHOLD) {
          setFlashMessage('No boundary in selection target');
          return;
        }
        onFlowChange({
          ui: {
            selectedTrackerIds: [],
            selectedRoadId: null,
            selectedBoundaryId: workingParcel.id,
          },
        });
        setFlashMessage('Boundary selected');
        return;
      }
    }

    const nearest = getNearestTracker(renderedTrackers, clickedPoint);
    if (!nearest) {
      setFlashMessage('No trackers in selection target');
      return;
    }

    const field = getContiguousTrackerField(renderedTrackers, nearest, roadSegment.y);
    const nearestCenterX = nearest.x + nearest.width / 2;
    const selection = (() => {
      if (ui.selectionScope === 'individual' || ui.viewMode === 'normal') {
        return [nearest];
      }

      if (ui.selectionScope === 'row') {
        return field.filter((tracker) => {
          const centerX = tracker.x + tracker.width / 2;
          return Math.abs(centerX - nearestCenterX) <= 8;
        });
      }

      if (ui.selectionScope === 'field') {
        return field;
      }

      return renderedTrackers;
    })();

    onFlowChange({
      ui: {
        activeFieldSeedId: nearest.id,
        selectedTrackerIds: selection.map((tracker) => tracker.id),
        selectedRoadId: null,
        selectedBoundaryId: null,
      },
    });
    setFlashMessage(`Selected ${selection.length} tracker${selection.length === 1 ? '' : 's'}`);
  };

  const handleClick = (event: React.MouseEvent<SVGSVGElement>) => {
    const rawPoint = eventToWorldPoint(event);
    if (!rawPoint) {
      return;
    }

    const snap = getSnapTarget(rawPoint);
    const clickedPoint = snap ? snap.point : rawPoint;

    const clickedInsideWorkingParcel = pointInPolygon(clickedPoint, workingParcel.points);
    const clickedNorthBoundary =
      rawPoint.y < baseRoadSegment.y + 20 &&
      distanceToPolyline(rawPoint, northReferencePoints) < 12;

    if (
      ui.activeTool === 'fill' &&
      ui.viewMode === 'tracker' &&
      !flow.fillCommitted &&
      clickedInsideWorkingParcel
    ) {
      onFlowChange({
        flow: {
          fillCommitted: true,
          alignReferencePicked: false,
          alignSelectionPicked: false,
          alignCommittedMode: null,
          blockFillCommitted: false,
        },
        ui: {
          activeFieldSeedId: null,
          selectedTrackerIds: [],
          selectedRoadId: null,
          selectedBoundaryId: null,
        },
      });
      setMoveOps(0);
      setEditOps(0);
      setTrimOps(0);
      setExtendOps(0);
      setCopiedTrackers([]);
      return;
    }

    if (ui.activeTool === 'align' && ui.viewMode === 'tracker' && flow.fillCommitted) {
      if (!flow.alignReferencePicked && clickedNorthBoundary) {
        onFlowChange({
          flow: { alignReferencePicked: true, alignSelectionPicked: false, alignCommittedMode: null },
        });
        return;
      }

      if (
        flow.alignReferencePicked &&
        !flow.alignSelectionPicked &&
        clickedInsideWorkingParcel &&
        clickedPoint.y < baseRoadSegment.y
      ) {
        onFlowChange({ flow: { alignSelectionPicked: true } });
        return;
      }

      if (
        flow.alignReferencePicked &&
        flow.alignSelectionPicked &&
        !flow.alignCommittedMode &&
        clickedInsideWorkingParcel
      ) {
        onFlowChange({ flow: { alignCommittedMode: ui.alignMode } });
      }

      return;
    }

    if (
      ui.activeTool === 'fill' &&
      ui.viewMode === 'block' &&
      flow.fillCommitted &&
      !flow.blockFillCommitted &&
      clickedInsideWorkingParcel
    ) {
      onFlowChange({ flow: { blockFillCommitted: true } });
      return;
    }

    if (ui.activeTool === 'edit' && flow.fillCommitted && clickedInsideWorkingParcel) {
      const nearest = getNearestTracker(renderedTrackers, clickedPoint);
      if (!nearest) {
        setFlashMessage('No trackers in edit target');
        return;
      }
      setEditOps((prev) => prev + 1);
      onFlowChange({
        flow: { blockFillCommitted: false },
        ui: { activeFieldSeedId: nearest.id },
      });
      setFlashMessage(`Edit ${ui.editSubMode} applied`);
      return;
    }

    if (ui.activeTool === 'trim' && flow.fillCommitted && clickedInsideWorkingParcel) {
      const nearest = getNearestTracker(renderedTrackers, clickedPoint);
      if (!nearest) {
        setFlashMessage('No trackers in trim target');
        return;
      }
      if (ui.trimExtendMode === 'trim') {
        setTrimOps((prev) => prev + 1);
        onFlowChange({
          flow: { blockFillCommitted: false },
          ui: { activeFieldSeedId: nearest.id },
        });
        setFlashMessage('Trim applied');
      } else {
        setExtendOps((prev) => prev + 1);
        onFlowChange({
          flow: { blockFillCommitted: false },
          ui: { activeFieldSeedId: nearest.id },
        });
        setFlashMessage('Extend applied');
      }
      return;
    }

    if (ui.activeTool === 'select' && clickedInsideWorkingParcel) {
      if (!flow.fillCommitted && ui.viewMode !== 'normal') {
        setFlashMessage('Commit Fill first');
        return;
      }
      onSelectAction(clickedPoint);
    }
  };

  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const point = eventToWorldPoint(event);
    if (!point) {
      return;
    }
    setCursorPoint(point);
  };

  const roadVisible = fillPreviewActive || flow.fillCommitted;
  const roadHighlighted =
    ui.selectedRoadId === roadFromEdit.id || (normalHover && normalHover.type === 'road');
  const boundaryHighlighted =
    ui.selectedBoundaryId === workingParcel.id ||
    (normalHover && normalHover.type === 'boundary');
  const selectionActive =
    ui.selectedTrackerIds.length > 0 || ui.selectedRoadId !== null || ui.selectedBoundaryId !== null;

  return (
    <div className="w-full h-full bg-slate-950 overflow-hidden relative select-none">
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${CANVAS_VIEWBOX.width} ${CANVAS_VIEWBOX.height}`}
        preserveAspectRatio="xMidYMid meet"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setCursorPoint(null)}
        onClick={handleClick}
        className="block cursor-crosshair"
      >
        <rect x={0} y={0} width={CANVAS_VIEWBOX.width} height={CANVAS_VIEWBOX.height} fill="#0b1220" />

        <g opacity={0.24}>
          {Array.from({ length: 26 }).map((_, index) => (
            <line key={`v-${index}`} x1={index * 40} y1={0} x2={index * 40} y2={CANVAS_VIEWBOX.height} stroke="#1e293b" strokeWidth={1} />
          ))}
          {Array.from({ length: 22 }).map((_, index) => (
            <line key={`h-${index}`} x1={0} y1={index * 40} x2={CANVAS_VIEWBOX.width} y2={index * 40} stroke="#1e293b" strokeWidth={1} />
          ))}
        </g>

        {model.parcels.map((parcel) => (
          <path
            key={parcel.id}
            d={toPath(parcel.points)}
            fill={parcel.isWorking ? 'rgba(37, 99, 235, 0.08)' : 'rgba(2, 6, 23, 0.25)'}
            stroke={parcel.isWorking ? '#93c5fd' : '#64748b'}
            strokeDasharray={parcel.isWorking ? '' : '5 5'}
            strokeWidth={parcel.isWorking ? 2.5 : 1.6}
          />
        ))}

        {boundaryHighlighted && (
          <path
            d={toPath(workingParcel.points)}
            fill="none"
            stroke="#fbbf24"
            strokeWidth={3}
            strokeDasharray="6 4"
          />
        )}

        {roadVisible && (
          <g opacity={ui.viewMode === 'block' ? 0.26 : fillPreviewActive ? 0.55 : 0.9}>
            <line
              x1={roadSegment.x1}
              y1={roadSegment.y}
              x2={roadSegment.x2}
              y2={roadSegment.y}
              stroke={roadHighlighted ? '#fbbf24' : '#cbd5e1'}
              strokeWidth={roadSegment.width}
            />
            <line
              x1={roadSegment.x1}
              y1={roadSegment.y}
              x2={roadSegment.x2}
              y2={roadSegment.y}
              stroke={roadHighlighted ? '#f59e0b' : '#475569'}
              strokeWidth={1.5}
              strokeDasharray="8 8"
            />
          </g>
        )}

        {fillPreviewActive && (
          <g opacity={0.55}>
            {baseLayout.trackers.map((tracker) => (
              <rect key={`fill-preview-${tracker.id}`} x={tracker.x} y={tracker.y} width={tracker.width} height={tracker.height} fill="#1d4ed8" stroke="#93c5fd" strokeWidth={0.7} />
            ))}
          </g>
        )}

        {!fillPreviewActive && flow.fillCommitted && (
          <g opacity={ui.viewMode === 'block' ? 0.3 : 1}>
            {renderedTrackers.map((tracker) => {
              const isPreviewNorth = alignPreviewTrackers.length > 0 && northTrackerIds.has(tracker.id);
              const isSelected = selectedIds.has(tracker.id);
              return (
                <rect
                  key={tracker.id}
                  x={tracker.x}
                  y={tracker.y}
                  width={tracker.width}
                  height={tracker.height}
                  fill={isSelected ? '#22d3ee' : isPreviewNorth ? '#38bdf8' : '#2563eb'}
                  stroke={isSelected ? '#a5f3fc' : 'none'}
                  strokeWidth={isSelected ? 1 : 0}
                  opacity={isPreviewNorth ? 0.8 : 1}
                />
              );
            })}
          </g>
        )}

        {ui.activeTool === 'select' && hoverSelectionTrackers.length > 0 && (
          <g opacity={0.9}>
            {hoverSelectionTrackers.map((tracker) => (
              <rect
                key={`hover-${tracker.id}`}
                x={tracker.x - 1}
                y={tracker.y - 1}
                width={tracker.width + 2}
                height={tracker.height + 2}
                fill="none"
                stroke="#fbbf24"
                strokeWidth={1}
                strokeDasharray="3 2"
              />
            ))}
          </g>
        )}

        {alignPreviewTrackers.length > 0 && !flow.alignCommittedMode && (
          <g opacity={0.75}>
            {alignPreviewTrackers.filter((tracker) => northTrackerIds.has(tracker.id)).map((tracker) => (
              <rect
                key={`align-preview-${tracker.id}`}
                x={tracker.x}
                y={tracker.y}
                width={tracker.width}
                height={tracker.height}
                fill="none"
                stroke="#a5f3fc"
                strokeWidth={1}
                strokeDasharray="4 3"
              />
            ))}
          </g>
        )}

        {(flow.alignReferencePicked || isHoveringNorthBoundary) &&
          ui.activeTool === 'align' &&
          flow.fillCommitted && (
            <polyline
              points={northReferencePoints.map((point) => `${point.x},${point.y}`).join(' ')}
              fill="none"
              stroke="#22d3ee"
              strokeWidth={3}
              strokeLinecap="round"
            />
          )}

        {flow.alignReferencePicked && !flow.alignSelectionPicked && (
          <rect
            x={110}
            y={110}
            width={500}
            height={baseRoadSegment.y - 120}
            fill="rgba(34, 211, 238, 0.08)"
            stroke="rgba(34, 211, 238, 0.45)"
            strokeDasharray="7 7"
          />
        )}

        {blocksVisible && (
          <g opacity={flow.blockFillCommitted ? 0.78 : 0.52}>
            {blockMasks.map((block, index) => {
              const bounds = getPolygonBounds(block.boundary);
              const centerX = bounds.minX + bounds.width / 2;
              const centerY = bounds.minY + bounds.height / 2;
              return (
                <g key={block.id}>
                  <path
                    d={toPath(block.boundary)}
                    fill={block.color}
                    stroke={block.color.replace('0.45', '0.95')}
                    strokeWidth={ui.viewMode === 'block' ? 2 : 1}
                  />
                  <rect
                    x={centerX - 28}
                    y={centerY - 11}
                    width={56}
                    height={22}
                    rx={4}
                    fill="rgba(15, 23, 42, 0.78)"
                  />
                  <text
                    x={centerX}
                    y={centerY + 4}
                    textAnchor="middle"
                    fill="#f8fafc"
                    fontSize={10}
                    fontWeight={700}
                  >
                    Block {index + 1}
                  </text>
                </g>
              );
            })}
          </g>
        )}

        {ui.activeTool === 'align' && flow.alignSelectionPicked && !flow.alignCommittedMode && (
          <text x={126} y={86} fill="#67e8f9" fontSize={11} fontWeight={700}>
            Setback target: {settings.boundarySetback}m from north boundary
          </text>
        )}

        {ui.smartGuidesEnabled && effectiveCursorPoint && (
          <g opacity={0.62}>
            <line x1={effectiveCursorPoint.x} y1={0} x2={effectiveCursorPoint.x} y2={CANVAS_VIEWBOX.height} stroke="#22d3ee" strokeDasharray="5 5" strokeWidth={1} />
            <line x1={0} y1={effectiveCursorPoint.y} x2={CANVAS_VIEWBOX.width} y2={effectiveCursorPoint.y} stroke="#22d3ee" strokeDasharray="5 5" strokeWidth={1} />
          </g>
        )}

        {snapTarget && (
          <g>
            <circle
              cx={snapTarget.point.x}
              cy={snapTarget.point.y}
              r={5}
              fill={snapTarget.color}
              stroke="#0f172a"
              strokeWidth={1}
            />
            <rect x={snapTarget.point.x + 8} y={snapTarget.point.y - 16} width={96} height={16} rx={4} fill="rgba(8, 47, 73, 0.85)" />
            <text x={snapTarget.point.x + 12} y={snapTarget.point.y - 5} fill="#ecfeff" fontSize={10}>
              {snapTarget.label}
            </text>
          </g>
        )}
      </svg>

      {tooltip && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur text-white px-4 py-2 rounded-full text-sm font-medium border border-white/10 pointer-events-none">
          {tooltip}
        </div>
      )}

      {selectionActive && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-950/90 border border-slate-700 rounded-full px-3 py-2 text-xs text-slate-100 flex items-center gap-2 shadow-xl">
          <span className="text-slate-400 uppercase tracking-wide">Selection</span>
          <button
            className={`px-2 py-1 rounded-full border ${
              ui.moveCopyMode === 'move'
                ? 'bg-blue-600/30 border-blue-400 text-blue-100'
                : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
            onClick={() => onFlowChange({ ui: { moveCopyMode: 'move' } })}
          >
            Move
          </button>
          <button
            className={`px-2 py-1 rounded-full border ${
              ui.moveCopyMode === 'copy'
                ? 'bg-blue-600/30 border-blue-400 text-blue-100'
                : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
            onClick={() => onFlowChange({ ui: { moveCopyMode: 'copy' } })}
          >
            Copy
          </button>
          <button
            className={`px-2 py-1 rounded-full border ${
              ui.moveCopyMode === 'array'
                ? 'bg-blue-600/30 border-blue-400 text-blue-100'
                : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
            onClick={() => onFlowChange({ ui: { moveCopyMode: 'array' } })}
          >
            Array
          </button>
          <button
            className="px-2 py-1 rounded-full border border-slate-700 text-slate-300 hover:bg-slate-800"
            onClick={() =>
              onFlowChange({
                ui: {
                  selectedTrackerIds: [],
                  selectedRoadId: null,
                  selectedBoundaryId: null,
                },
              })
            }
          >
            Clear
          </button>
        </div>
      )}

      <div className="absolute top-4 right-4 bg-slate-900/90 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-200 flex gap-3">
        <span className={flow.fillCommitted ? 'text-emerald-300' : 'text-slate-400'}>Fill {flow.fillCommitted ? 'done' : 'pending'}</span>
        <span className={flow.alignCommittedMode ? 'text-emerald-300' : 'text-slate-400'}>Align {flow.alignCommittedMode ? flow.alignCommittedMode : 'pending'}</span>
        <span className={flow.blockFillCommitted ? 'text-emerald-300' : 'text-slate-400'}>Blocks {flow.blockFillCommitted ? 'done' : 'pending'}</span>
      </div>

      <div className="absolute bottom-4 left-4 flex items-center gap-3 text-xs">
        <div className="bg-slate-900/85 border border-slate-700 rounded px-2 py-1 text-slate-300">Scale 1:200</div>
        <div className="bg-slate-900/85 border border-slate-700 rounded px-2 py-1 text-slate-300">Demo solver: local deterministic</div>
      </div>
    </div>
  );
};

export default Canvas;
