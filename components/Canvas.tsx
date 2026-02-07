import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CANVAS_VIEWBOX,
  NORTH_REFERENCE_POINTS,
  PARCELS,
  TRACKER_BORDER_SETBACK_PX,
} from '../constants';
import {
  applyNorthFieldAlignment,
  generateBlockMasks,
  generateTrackerLayout,
  getParcelBounds,
  pointInPolygon,
} from '../layoutEngine';
import { DesignState, Point, StampSegment, Tracker } from '../types';

interface CanvasProps {
  state: DesignState;
  onTrackerCountChange: (count: number) => void;
  onFlowChange: (updates: Partial<DesignState>) => void;
}

interface SnapTarget {
  point: Point;
  label: string;
  distance: number;
}

const SNAP_THRESHOLD = 16;

const toPath = (points: Point[]): string => {
  if (!points.length) {
    return '';
  }
  const [first, ...rest] = points;
  return [`M ${first.x} ${first.y}`, ...rest.map((point) => `L ${point.x} ${point.y}`), 'Z'].join(' ');
};

const distanceToSegment = (point: Point, start: Point, end: Point): number => {
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

const distanceToPolyline = (point: Point, polyline: Point[]): number => {
  let minDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < polyline.length - 1; index += 1) {
    minDistance = Math.min(minDistance, distanceToSegment(point, polyline[index], polyline[index + 1]));
  }
  return minDistance;
};

const nextStampSegment = (orientation: 'horizontal' | 'vertical', point: Point, roadStepDistance: number): StampSegment => {
  const length = Math.max(80, roadStepDistance * 2);
  if (orientation === 'horizontal') {
    return {
      id: `stamp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      x1: point.x - length / 2,
      y1: point.y,
      x2: point.x + length / 2,
      y2: point.y,
      orientation,
    };
  }

  return {
    id: `stamp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    x1: point.x,
    y1: point.y - length / 2,
    x2: point.x,
    y2: point.y + length / 2,
    orientation,
  };
};

const scopeMatches = (tracker: Tracker, roadY: number, scope: DesignState['subAreaScope']): boolean => {
  if (scope === 'all') {
    return true;
  }

  const isNorth = tracker.y + tracker.height / 2 < roadY;
  return scope === 'north' ? isNorth : !isNorth;
};

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
): Tracker[] => {
  const isAdjacent = (a: Tracker, b: Tracker): boolean => {
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);

    const lateralNeighbor = dx <= 44 && dy <= 16;
    const verticalNeighbor = dx <= 16 && dy <= 66;
    const diagonalNeighbor = dx <= 36 && dy <= 56;

    return lateralNeighbor || verticalNeighbor || diagonalNeighbor;
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

const applyMoveOffset = (
  trackers: Tracker[],
  roadY: number,
  subAreaScope: DesignState['subAreaScope'],
  moveOps: number,
): Tracker[] => {
  if (moveOps === 0) {
    return trackers;
  }

  const dx = moveOps * 6;
  const dy = moveOps * -4;

  return trackers.map((tracker) => {
    if (!scopeMatches(tracker, roadY, subAreaScope)) {
      return tracker;
    }

    return { ...tracker, x: tracker.x + dx, y: tracker.y + dy };
  });
};

const Canvas: React.FC<CanvasProps> = ({ state, onTrackerCountChange, onFlowChange }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [cursorPoint, setCursorPoint] = useState<Point | null>(null);
  const [moveOps, setMoveOps] = useState(0);
  const [copiedTrackers, setCopiedTrackers] = useState<Tracker[]>([]);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);

  const workingParcel = PARCELS.find((parcel) => parcel.isWorking);

  useEffect(() => {
    if (!flashMessage) {
      return undefined;
    }

    const timeout = window.setTimeout(() => setFlashMessage(null), 1400);
    return () => window.clearTimeout(timeout);
  }, [flashMessage]);

  useEffect(() => {
    if (!state.fillCommitted) {
      setMoveOps(0);
      setCopiedTrackers([]);
    }
  }, [state.fillCommitted]);

  const baseLayout = useMemo(() => {
    if (!workingParcel) {
      return null;
    }

    return generateTrackerLayout(
      workingParcel,
      state.fillPattern,
      state.rowSpacing,
      state.roadWidth,
    );
  }, [workingParcel, state.fillPattern, state.rowSpacing, state.roadWidth]);

  if (!baseLayout || !workingParcel) {
    return <div className="w-full h-full bg-slate-950" />;
  }

  const parcelBounds = getParcelBounds(workingParcel);

  const roadFromEdit = useMemo(() => {
    const shift = state.editOps * (state.adaptiveRoadEditing ? 2.5 : 1.6);
    const direction = state.subAreaScope === 'south' ? 1 : -1;
    return {
      ...baseLayout.road,
      y: baseLayout.road.y + shift * direction,
    };
  }, [baseLayout.road, state.editOps, state.adaptiveRoadEditing, state.subAreaScope]);

  const trackersAfterAlign = useMemo(() => {
    if (!state.fillCommitted) {
      return [];
    }

    if (state.alignCommittedMode) {
      return applyNorthFieldAlignment(
        baseLayout.trackers,
        workingParcel,
        baseLayout.road,
        state.alignCommittedMode,
      );
    }

    return baseLayout.trackers;
  }, [baseLayout.trackers, baseLayout.road, state.fillCommitted, state.alignCommittedMode, workingParcel]);

  const trackersAfterEdit = useMemo(() => {
    if (!state.fillCommitted) {
      return [];
    }

    let trackers = trackersAfterAlign;

    if (state.editOps > 0) {
      const influence = state.editSubMode === 'segment' ? 1.4 : state.editSubMode === 'add_remove' ? 0.9 : 1;
      const nudge = Math.round(state.editOps * 1.2 * influence);

      trackers = trackers
        .map((tracker) => {
          if (!scopeMatches(tracker, roadFromEdit.y, state.subAreaScope)) {
            return tracker;
          }

          const distanceToRoad = Math.abs(tracker.y + tracker.height / 2 - roadFromEdit.y);
          if (distanceToRoad > 140) {
            return tracker;
          }

          const towardEdge = tracker.y + tracker.height / 2 < roadFromEdit.y ? -1 : 1;
          return {
            ...tracker,
            y: tracker.y + towardEdge * nudge,
          };
        })
        .filter((tracker) => {
          if (!scopeMatches(tracker, roadFromEdit.y, state.subAreaScope)) {
            return true;
          }

          if (!state.equipmentRemovesTrackers && state.editSubMode !== 'add_remove') {
            return true;
          }

          const distanceToRoad = Math.abs(tracker.y + tracker.height / 2 - roadFromEdit.y);
          return distanceToRoad > roadFromEdit.width / 2 + 7;
        });
    }

    return trackers;
  }, [
    state.fillCommitted,
    state.editOps,
    state.editSubMode,
    state.subAreaScope,
    state.equipmentRemovesTrackers,
    trackersAfterAlign,
    roadFromEdit,
  ]);

  const trackersAfterTrimExtend = useMemo(() => {
    if (!state.fillCommitted) {
      return [];
    }

    let trackers = trackersAfterEdit;

    if (state.trimOps > 0) {
      const northCutoff = parcelBounds.minY + 26 + state.trimOps * 11;
      const southCutoff = parcelBounds.maxY - 26 - state.trimOps * 11;

      trackers = trackers.filter((tracker) => {
        if (!scopeMatches(tracker, roadFromEdit.y, state.subAreaScope)) {
          return true;
        }

        if (tracker.y + tracker.height / 2 < roadFromEdit.y) {
          return tracker.y > northCutoff;
        }

        return tracker.y + tracker.height < southCutoff;
      });
    }

    if (state.extendOps > 0) {
      const sourceRows = groupRows(
        trackers.filter((tracker) => scopeMatches(tracker, roadFromEdit.y, state.subAreaScope)),
      );

      const rowsToExtend = sourceRows.length ? [sourceRows[0], sourceRows[sourceRows.length - 1]].filter(Boolean) : [];
      const additions: Tracker[] = [];

      for (let op = 1; op <= state.extendOps; op += 1) {
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
    state.fillCommitted,
    state.trimOps,
    state.extendOps,
    state.subAreaScope,
    trackersAfterEdit,
    roadFromEdit.y,
    parcelBounds.minY,
    parcelBounds.maxY,
    workingParcel.points,
  ]);

  const trackersAfterMove = useMemo(
    () => applyMoveOffset(trackersAfterTrimExtend, roadFromEdit.y, state.subAreaScope, moveOps),
    [trackersAfterTrimExtend, roadFromEdit.y, state.subAreaScope, moveOps],
  );

  const renderedTrackers = useMemo(() => {
    if (!state.fillCommitted) {
      return [];
    }

    return [...trackersAfterMove, ...copiedTrackers];
  }, [state.fillCommitted, trackersAfterMove, copiedTrackers]);

  const alignPreviewTrackers = useMemo(() => {
    if (
      !state.fillCommitted ||
      !state.alignReferencePicked ||
      !state.alignSelectionPicked ||
      state.alignCommittedMode
    ) {
      return [];
    }

    return applyNorthFieldAlignment(baseLayout.trackers, workingParcel, baseLayout.road, state.alignMode);
  }, [
    baseLayout.trackers,
    baseLayout.road,
    state.fillCommitted,
    state.alignReferencePicked,
    state.alignSelectionPicked,
    state.alignCommittedMode,
    state.alignMode,
    workingParcel,
  ]);

  const blockMasks = useMemo(() => {
    if (!state.fillCommitted) {
      return [];
    }
    return generateBlockMasks(renderedTrackers, roadFromEdit);
  }, [renderedTrackers, roadFromEdit, state.fillCommitted]);

  const previewCapacityMw = useMemo(() => {
    if (!baseLayout.trackers.length) {
      return '0.0';
    }
    return (baseLayout.trackers.length * 0.0092).toFixed(1);
  }, [baseLayout.trackers.length]);

  useEffect(() => {
    onTrackerCountChange(renderedTrackers.length);
  }, [renderedTrackers.length, onTrackerCountChange]);

  const isInsideWorkingParcel =
    cursorPoint !== null && pointInPolygon(cursorPoint, workingParcel.points);

  const isHoveringNorthBoundary =
    cursorPoint !== null &&
    cursorPoint.y < baseLayout.road.y + 24 &&
    distanceToPolyline(cursorPoint, NORTH_REFERENCE_POINTS) < 12;

  const fillPreviewActive =
    state.activeTool === 'fill' &&
    state.viewMode === 'tracker' &&
    !state.fillCommitted &&
    isInsideWorkingParcel;

  const blockPreviewActive =
    state.activeTool === 'fill' &&
    state.viewMode === 'block' &&
    state.fillCommitted &&
    !state.blockFillCommitted &&
    isInsideWorkingParcel;

  const blocksVisible = state.showBlocks && (state.blockFillCommitted || blockPreviewActive);

  const northTrackerIds = new Set(baseLayout.trackers.filter((t) => t.y + t.height / 2 < baseLayout.road.y).map((t) => t.id));

  const getSnapTarget = (point: Point): SnapTarget | null => {
    if (!state.osnapEnabled) {
      return null;
    }

    const roadX = Math.max(roadFromEdit.x1, Math.min(roadFromEdit.x2, point.x));
    const candidates: SnapTarget[] = [
      ...workingParcel.points.map((vertex) => ({
        point: vertex,
        label: 'Boundary vertex',
        distance: Math.hypot(vertex.x - point.x, vertex.y - point.y),
      })),
      {
        point: { x: roadX, y: roadFromEdit.y },
        label: 'Road centerline',
        distance: Math.hypot(roadX - point.x, roadFromEdit.y - point.y),
      },
      {
        point: { x: roadX, y: roadFromEdit.y - roadFromEdit.width / 2 },
        label: 'Road edge',
        distance: Math.hypot(roadX - point.x, roadFromEdit.y - roadFromEdit.width / 2 - point.y),
      },
      {
        point: { x: roadX, y: roadFromEdit.y + roadFromEdit.width / 2 },
        label: 'Road edge',
        distance: Math.hypot(roadX - point.x, roadFromEdit.y + roadFromEdit.width / 2 - point.y),
      },
    ];

    const sorted = candidates.sort((a, b) => a.distance - b.distance);
    return sorted[0].distance <= SNAP_THRESHOLD ? sorted[0] : null;
  };

  const snapTarget = cursorPoint ? getSnapTarget(cursorPoint) : null;

  const effectiveCursorPoint = snapTarget ? snapTarget.point : cursorPoint;

  const selectedTrackers = useMemo(() => {
    if (
      !effectiveCursorPoint ||
      !renderedTrackers.length ||
      state.activeTool !== 'select' ||
      !state.fillCommitted
    ) {
      return [];
    }

    const inScope = renderedTrackers.filter((tracker) => scopeMatches(tracker, roadFromEdit.y, state.subAreaScope));

    if (!inScope.length) {
      return [];
    }

    const nearest = getNearestTracker(inScope, effectiveCursorPoint);
    if (!nearest) {
      return [];
    }

    if (state.selectionScope === 'individual') {
      return [nearest];
    }

    if (state.selectionScope === 'row') {
      return inScope.filter((tracker) => Math.abs(tracker.x - nearest.x) <= 8);
    }

    if (state.selectionScope === 'field') {
      return inScope;
    }

    return getContiguousTrackerField(inScope, nearest);
  }, [
    effectiveCursorPoint,
    renderedTrackers,
    state.activeTool,
    state.fillCommitted,
    state.selectionScope,
    state.subAreaScope,
    roadFromEdit.y,
  ]);

  const selectIds = new Set(selectedTrackers.map((tracker) => tracker.id));

  const tooltip = (() => {
    if (flashMessage) {
      return flashMessage;
    }

    if (state.activeTool === 'fill' && state.viewMode === 'tracker') {
      if (!state.fillCommitted && isInsideWorkingParcel) {
        return `${state.fillPattern[0].toUpperCase()}${state.fillPattern.slice(1)} · +${previewCapacityMw} MW · ${baseLayout.trackers.length} trackers`;
      }
      if (!state.fillCommitted) {
        return 'Hover inside the left parcel to preview Fill';
      }
      return 'Fill committed. Use Edit/Align/Trim/Stamp tools for manual operations';
    }

    if (state.activeTool === 'align' && state.viewMode === 'tracker') {
      if (!state.fillCommitted) {
        return 'Commit Fill before running Align';
      }
      if (!state.alignReferencePicked) {
        return 'Pick 1: select north boundary';
      }
      if (!state.alignSelectionPicked) {
        return 'Pick 2: select north field (above road)';
      }
      if (!state.alignCommittedMode) {
        return `Align: ${state.alignMode} preview (Space toggles)`;
      }
      return `Aligned (${state.alignCommittedMode}) committed`;
    }

    if (state.activeTool === 'edit') {
      if (!state.fillCommitted) {
        return 'Commit Fill first';
      }
      return `Edit (${state.editSubMode}) · click to apply local adaptive change in ${state.subAreaScope} scope`;
    }

    if (state.activeTool === 'trim') {
      if (!state.fillCommitted) {
        return 'Commit Fill first';
      }
      return `${state.trimExtendMode.toUpperCase()} · click to ${state.trimExtendMode} in ${state.subAreaScope} scope`;
    }

    if (state.activeTool === 'stamp') {
      return `Stamp (${state.stampOrientation}) · click to place road segment`;
    }

    if (state.activeTool === 'select') {
      if (!state.fillCommitted) {
        return 'Commit Fill first';
      }
      return `Select ${state.selectionScope} · ${selectedTrackers.length} selected · ${state.moveCopyMode.toUpperCase()} on click`;
    }

    if (state.activeTool === 'fill' && state.viewMode === 'block') {
      if (!state.fillCommitted) {
        return 'Commit tracker Fill first';
      }
      if (state.blockFillCommitted) {
        return 'Block Fill committed · 5 blocks · ILR range 1.29–1.34';
      }
      return isInsideWorkingParcel
        ? 'Block Fill · 5 blocks · ILR range 1.29–1.34'
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
    const selection = selectedTrackers;
    if (!selection.length) {
      setFlashMessage('No trackers in selection target');
      return;
    }

    if (state.moveCopyMode === 'move') {
      setMoveOps((prev) => prev + 1);
      setFlashMessage(`Moved ${selection.length} trackers`);
      return;
    }

    const seed = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const step = Math.max(18, state.roadStepDistance * 0.6);

    if (state.moveCopyMode === 'copy') {
      const clones = selection.map((tracker, index) => ({
        ...tracker,
        id: `${tracker.id}-copy-${seed}-${index}`,
        x: tracker.x + step,
        y: tracker.y,
      }));
      setCopiedTrackers((prev) => [...prev, ...clones]);
      setFlashMessage(`Copied ${selection.length} trackers`);
      return;
    }

    const arrayClones: Tracker[] = [];
    for (let i = 1; i <= 3; i += 1) {
      selection.forEach((tracker, index) => {
        arrayClones.push({
          ...tracker,
          id: `${tracker.id}-array-${seed}-${i}-${index}`,
          x: tracker.x + i * step,
          y: tracker.y + i * 4,
        });
      });
    }

    setCopiedTrackers((prev) => [...prev, ...arrayClones]);
    setFlashMessage(`Array copied ${selection.length} trackers x3`);
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
      clickedPoint.y < baseLayout.road.y + 20 && distanceToPolyline(clickedPoint, NORTH_REFERENCE_POINTS) < 12;

    if (
      state.activeTool === 'fill' &&
      state.viewMode === 'tracker' &&
      !state.fillCommitted &&
      clickedInsideWorkingParcel
    ) {
      onFlowChange({
        fillCommitted: true,
        alignReferencePicked: false,
        alignSelectionPicked: false,
        alignCommittedMode: null,
        blockFillCommitted: false,
        editOps: 0,
        trimOps: 0,
        extendOps: 0,
        stampSegments: [],
      });
      setMoveOps(0);
      setCopiedTrackers([]);
      return;
    }

    if (state.activeTool === 'align' && state.viewMode === 'tracker' && state.fillCommitted) {
      if (!state.alignReferencePicked && clickedNorthBoundary) {
        onFlowChange({ alignReferencePicked: true, alignSelectionPicked: false, alignCommittedMode: null });
        return;
      }

      if (
        state.alignReferencePicked &&
        !state.alignSelectionPicked &&
        clickedInsideWorkingParcel &&
        clickedPoint.y < baseLayout.road.y
      ) {
        onFlowChange({ alignSelectionPicked: true });
        return;
      }

      if (
        state.alignReferencePicked &&
        state.alignSelectionPicked &&
        !state.alignCommittedMode &&
        clickedInsideWorkingParcel
      ) {
        onFlowChange({ alignCommittedMode: state.alignMode });
      }

      return;
    }

    if (
      state.activeTool === 'fill' &&
      state.viewMode === 'block' &&
      state.fillCommitted &&
      !state.blockFillCommitted &&
      clickedInsideWorkingParcel
    ) {
      onFlowChange({ blockFillCommitted: true });
      return;
    }

    if (state.activeTool === 'edit' && state.fillCommitted && clickedInsideWorkingParcel) {
      onFlowChange({ editOps: state.editOps + 1, blockFillCommitted: false });
      setFlashMessage(`Edit ${state.editSubMode} applied`);
      return;
    }

    if (state.activeTool === 'trim' && state.fillCommitted && clickedInsideWorkingParcel) {
      if (state.trimExtendMode === 'trim') {
        onFlowChange({ trimOps: state.trimOps + 1, blockFillCommitted: false });
        setFlashMessage('Trim applied');
      } else {
        onFlowChange({ extendOps: state.extendOps + 1, blockFillCommitted: false });
        setFlashMessage('Extend applied');
      }
      return;
    }

    if (state.activeTool === 'stamp' && clickedInsideWorkingParcel) {
      const segment = nextStampSegment(state.stampOrientation, clickedPoint, state.roadStepDistance);
      onFlowChange({ stampSegments: [...state.stampSegments, segment] });
      setFlashMessage(`Stamp placed (${state.stampOrientation})`);
      return;
    }

    if (state.activeTool === 'select' && state.fillCommitted && clickedInsideWorkingParcel) {
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

  const roadVisible = fillPreviewActive || state.fillCommitted || state.stampSegments.length > 0;

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

        {PARCELS.map((parcel) => (
          <path
            key={parcel.id}
            d={toPath(parcel.points)}
            fill={parcel.isWorking ? 'rgba(37, 99, 235, 0.08)' : 'rgba(2, 6, 23, 0.25)'}
            stroke={parcel.isWorking ? '#93c5fd' : '#64748b'}
            strokeDasharray={parcel.isWorking ? '' : '5 5'}
            strokeWidth={parcel.isWorking ? 2.5 : 1.6}
          />
        ))}

        {state.subAreaScope !== 'all' && (
          <rect
            x={parcelBounds.minX - 10}
            width={parcelBounds.maxX - parcelBounds.minX + 20}
            y={state.subAreaScope === 'north' ? parcelBounds.minY - 10 : roadFromEdit.y}
            height={state.subAreaScope === 'north' ? roadFromEdit.y - parcelBounds.minY + 12 : parcelBounds.maxY - roadFromEdit.y + 10}
            fill="rgba(16, 185, 129, 0.08)"
            stroke="rgba(16, 185, 129, 0.5)"
            strokeDasharray="6 5"
          />
        )}

        {roadVisible && (
          <g opacity={state.viewMode === 'block' ? 0.26 : fillPreviewActive ? 0.55 : 0.9}>
            <line x1={roadFromEdit.x1} y1={roadFromEdit.y} x2={roadFromEdit.x2} y2={roadFromEdit.y} stroke="#cbd5e1" strokeWidth={roadFromEdit.width} />
            <line x1={roadFromEdit.x1} y1={roadFromEdit.y} x2={roadFromEdit.x2} y2={roadFromEdit.y} stroke="#475569" strokeWidth={1.5} strokeDasharray="8 8" />
          </g>
        )}

        {state.stampSegments.map((segment) => (
          <g key={segment.id} opacity={state.viewMode === 'block' ? 0.2 : 0.92}>
            <line x1={segment.x1} y1={segment.y1} x2={segment.x2} y2={segment.y2} stroke="#f8fafc" strokeWidth={Math.max(4, state.roadWidth)} />
            <line x1={segment.x1} y1={segment.y1} x2={segment.x2} y2={segment.y2} stroke="#475569" strokeWidth={1} strokeDasharray="7 6" />
          </g>
        ))}

        {fillPreviewActive && (
          <g opacity={0.55}>
            {baseLayout.trackers.map((tracker) => (
              <rect key={`fill-preview-${tracker.id}`} x={tracker.x} y={tracker.y} width={tracker.width} height={tracker.height} fill="#1d4ed8" stroke="#93c5fd" strokeWidth={0.7} />
            ))}
          </g>
        )}

        {!fillPreviewActive && state.fillCommitted && (
          <g opacity={state.viewMode === 'block' ? 0.3 : 1}>
            {renderedTrackers.map((tracker) => {
              const isPreviewNorth = alignPreviewTrackers.length > 0 && northTrackerIds.has(tracker.id);
              const isSelected = selectIds.has(tracker.id) && state.activeTool === 'select';
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

        {alignPreviewTrackers.length > 0 && !state.alignCommittedMode && (
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

        {(state.alignReferencePicked || isHoveringNorthBoundary) && state.activeTool === 'align' && state.fillCommitted && (
          <polyline
            points={NORTH_REFERENCE_POINTS.map((point) => `${point.x},${point.y}`).join(' ')}
            fill="none"
            stroke="#22d3ee"
            strokeWidth={3}
            strokeLinecap="round"
          />
        )}

        {state.alignReferencePicked && !state.alignSelectionPicked && (
          <rect
            x={110}
            y={110}
            width={500}
            height={baseLayout.road.y - 120}
            fill="rgba(34, 211, 238, 0.08)"
            stroke="rgba(34, 211, 238, 0.45)"
            strokeDasharray="7 7"
          />
        )}

        {blocksVisible && (
          <g opacity={state.blockFillCommitted ? 0.78 : 0.52}>
            {blockMasks.map((block) => (
              <g key={block.id}>
                <rect x={block.bounds.x} y={block.bounds.y} width={block.bounds.width} height={block.bounds.height} fill={block.color} stroke={block.color.replace('0.45', '0.95')} strokeWidth={state.viewMode === 'block' ? 2 : 1} />
                <rect x={block.bounds.x + block.bounds.width / 2 - 28} y={block.bounds.y + block.bounds.height / 2 - 11} width={56} height={22} rx={4} fill="rgba(15, 23, 42, 0.78)" />
                <text x={block.bounds.x + block.bounds.width / 2} y={block.bounds.y + block.bounds.height / 2 + 4} textAnchor="middle" fill="#f8fafc" fontSize={10} fontWeight={700}>
                  {block.label}
                </text>
              </g>
            ))}
          </g>
        )}

        {state.activeTool === 'align' && state.alignSelectionPicked && !state.alignCommittedMode && (
          <text x={126} y={86} fill="#67e8f9" fontSize={11} fontWeight={700}>
            Setback target: {TRACKER_BORDER_SETBACK_PX / 2}m from north boundary
          </text>
        )}

        {state.smartGuidesEnabled && effectiveCursorPoint && (
          <g opacity={0.62}>
            <line x1={effectiveCursorPoint.x} y1={0} x2={effectiveCursorPoint.x} y2={CANVAS_VIEWBOX.height} stroke="#22d3ee" strokeDasharray="5 5" strokeWidth={1} />
            <line x1={0} y1={effectiveCursorPoint.y} x2={CANVAS_VIEWBOX.width} y2={effectiveCursorPoint.y} stroke="#22d3ee" strokeDasharray="5 5" strokeWidth={1} />
          </g>
        )}

        {snapTarget && (
          <g>
            <circle cx={snapTarget.point.x} cy={snapTarget.point.y} r={5} fill="#22d3ee" stroke="#cffafe" strokeWidth={1} />
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

      <div className="absolute top-4 right-4 bg-slate-900/90 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-200 flex gap-3">
        <span className={state.fillCommitted ? 'text-emerald-300' : 'text-slate-400'}>Fill {state.fillCommitted ? 'done' : 'pending'}</span>
        <span className={state.alignCommittedMode ? 'text-emerald-300' : 'text-slate-400'}>Align {state.alignCommittedMode ? state.alignCommittedMode : 'pending'}</span>
        <span className={state.blockFillCommitted ? 'text-emerald-300' : 'text-slate-400'}>Blocks {state.blockFillCommitted ? 'done' : 'pending'}</span>
      </div>

      <div className="absolute bottom-4 left-4 flex items-center gap-3 text-xs">
        <div className="bg-slate-900/85 border border-slate-700 rounded px-2 py-1 text-slate-300">Scale 1:200</div>
        <div className="bg-slate-900/85 border border-slate-700 rounded px-2 py-1 text-slate-300">Sub-area: {state.subAreaScope}</div>
        <div className="bg-slate-900/85 border border-slate-700 rounded px-2 py-1 text-slate-300">Demo solver: local deterministic</div>
      </div>
    </div>
  );
};

export default Canvas;
