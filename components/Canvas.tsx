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
  pointInPolygon,
} from '../layoutEngine';
import { DesignState, Point, Tracker } from '../types';

interface CanvasProps {
  state: DesignState;
  onTrackerCountChange: (count: number) => void;
  onFlowChange: (updates: Partial<DesignState>) => void;
}

const toPath = (points: Point[]): string => {
  if (!points.length) {
    return '';
  }
  const [first, ...rest] = points;
  const commands = [`M ${first.x} ${first.y}`, ...rest.map((point) => `L ${point.x} ${point.y}`)];
  commands.push('Z');
  return commands.join(' ');
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
      ((point.x - start.x) * dx + (point.y - start.y) * dy) /
        (dx * dx + dy * dy),
    ),
  );

  const projectionX = start.x + t * dx;
  const projectionY = start.y + t * dy;

  return Math.hypot(point.x - projectionX, point.y - projectionY);
};

const distanceToPolyline = (point: Point, polyline: Point[]): number => {
  let minDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < polyline.length - 1; index += 1) {
    const distance = distanceToSegment(point, polyline[index], polyline[index + 1]);
    minDistance = Math.min(minDistance, distance);
  }

  return minDistance;
};

const getTrackerShiftMeters = (before: Tracker[], after: Tracker[]): number => {
  if (!before.length || !after.length) {
    return 0;
  }

  const beforeById = new Map(before.map((tracker) => [tracker.id, tracker]));
  const shifts = after
    .map((tracker) => {
      const original = beforeById.get(tracker.id);
      if (!original) {
        return 0;
      }
      return original.y - tracker.y;
    })
    .filter((shift) => shift > 0);

  if (!shifts.length) {
    return 0;
  }

  const avgShiftPx = shifts.reduce((sum, shift) => sum + shift, 0) / shifts.length;
  return avgShiftPx / 2;
};

const Canvas: React.FC<CanvasProps> = ({ state, onTrackerCountChange, onFlowChange }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [cursorPoint, setCursorPoint] = useState<Point | null>(null);

  const workingParcel = PARCELS.find((parcel) => parcel.isWorking);

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

  const committedTrackers = useMemo(() => {
    if (!baseLayout || !state.fillCommitted || !workingParcel) {
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
  }, [baseLayout, state.fillCommitted, state.alignCommittedMode, workingParcel]);

  const alignPreviewTrackers = useMemo(() => {
    if (
      !baseLayout ||
      !workingParcel ||
      !state.fillCommitted ||
      !state.alignReferencePicked ||
      !state.alignSelectionPicked ||
      state.alignCommittedMode
    ) {
      return [];
    }

    return applyNorthFieldAlignment(
      baseLayout.trackers,
      workingParcel,
      baseLayout.road,
      state.alignMode,
    );
  }, [
    baseLayout,
    workingParcel,
    state.fillCommitted,
    state.alignReferencePicked,
    state.alignSelectionPicked,
    state.alignCommittedMode,
    state.alignMode,
  ]);

  const blockMasks = useMemo(() => {
    if (!baseLayout || !committedTrackers.length) {
      return [];
    }
    return generateBlockMasks(committedTrackers, baseLayout.road);
  }, [baseLayout, committedTrackers]);

  const northTrackerIds = useMemo(() => {
    if (!baseLayout) {
      return new Set<string>();
    }

    return new Set(
      baseLayout.trackers
        .filter((tracker) => tracker.y + tracker.height / 2 < baseLayout.road.y)
        .map((tracker) => tracker.id),
    );
  }, [baseLayout]);

  const previewCapacityMw = useMemo(() => {
    if (!baseLayout) {
      return '0.0';
    }
    return (baseLayout.trackers.length * 0.0092).toFixed(1);
  }, [baseLayout]);

  useEffect(() => {
    onTrackerCountChange(committedTrackers.length);
  }, [committedTrackers.length, onTrackerCountChange]);

  if (!baseLayout || !workingParcel) {
    return <div className="w-full h-full bg-slate-950" />;
  }

  const isInsideWorkingParcel =
    cursorPoint !== null && pointInPolygon(cursorPoint, workingParcel.points);
  const isHoveringNorthBoundary =
    cursorPoint !== null &&
    cursorPoint.y < baseLayout.road.y + 20 &&
    distanceToPolyline(cursorPoint, NORTH_REFERENCE_POINTS) < 12;

  const fillPreviewActive =
    state.activeTool === 'fill' &&
    state.viewMode === 'tracker' &&
    !state.fillCommitted &&
    isInsideWorkingParcel;

  const alignPreviewActive = alignPreviewTrackers.length > 0;

  const blockPreviewActive =
    state.activeTool === 'fill' &&
    state.viewMode === 'block' &&
    state.fillCommitted &&
    !state.blockFillCommitted &&
    isInsideWorkingParcel;

  const blocksVisible = state.showBlocks && (state.blockFillCommitted || blockPreviewActive);

  const tooltip = (() => {
    if (state.activeTool === 'fill' && state.viewMode === 'tracker') {
      if (!state.fillCommitted && isInsideWorkingParcel) {
        return `${state.fillPattern[0].toUpperCase()}${state.fillPattern.slice(1)} · +${previewCapacityMw} MW · ${baseLayout.trackers.length} trackers`;
      }
      if (!state.fillCommitted) {
        return 'Hover inside the left parcel to preview Fill';
      }
      return 'Fill committed. Switch to Align for boundary conformance';
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
        const shiftMeters = getTrackerShiftMeters(baseLayout.trackers, alignPreviewTrackers).toFixed(1);
        return `Align: ${state.alignMode[0].toUpperCase()}${state.alignMode.slice(1)} · ↑ ${shiftMeters}m`;
      }

      return `Aligned (${state.alignCommittedMode}) committed`;
    }

    if (state.activeTool === 'fill' && state.viewMode === 'block') {
      if (!state.fillCommitted) {
        return 'Commit tracker Fill first';
      }

      if (state.blockFillCommitted) {
        return 'Block Fill committed · 5 blocks · ILR range 1.29–1.34';
      }

      if (isInsideWorkingParcel) {
        return 'Block Fill · 5 blocks · ILR range 1.29–1.34';
      }

      return 'Hover inside the left parcel to preview block fill';
    }

    return null;
  })();

  const renderTrackers = () => {
    if (fillPreviewActive) {
      return (
        <g opacity={0.55}>
          {baseLayout.trackers.map((tracker) => (
            <rect
              key={`fill-preview-${tracker.id}`}
              x={tracker.x}
              y={tracker.y}
              width={tracker.width}
              height={tracker.height}
              fill="#1d4ed8"
              stroke="#93c5fd"
              strokeWidth={0.7}
            />
          ))}
        </g>
      );
    }

    if (!state.fillCommitted) {
      return null;
    }

    const ghostOpacity = state.viewMode === 'block' ? 0.3 : 1;

    if (alignPreviewActive) {
      const previewById = new Map(alignPreviewTrackers.map((tracker) => [tracker.id, tracker]));
      const previewNorthTrackers = alignPreviewTrackers.filter((tracker) =>
        northTrackerIds.has(tracker.id),
      );

      return (
        <>
          <g opacity={ghostOpacity}>
            {baseLayout.trackers.map((tracker) => {
              const isNorth = northTrackerIds.has(tracker.id);
              return (
                <rect
                  key={`base-${tracker.id}`}
                  x={tracker.x}
                  y={tracker.y}
                  width={tracker.width}
                  height={tracker.height}
                  fill="#2563eb"
                  opacity={isNorth ? 0.32 : 0.95}
                />
              );
            })}
          </g>

          <g opacity={state.viewMode === 'block' ? 0.35 : 0.9}>
            {previewNorthTrackers.map((tracker) => {
              const original = previewById.get(tracker.id);
              if (!original) {
                return null;
              }
              return (
                <rect
                  key={`preview-${tracker.id}`}
                  x={tracker.x}
                  y={tracker.y}
                  width={tracker.width}
                  height={tracker.height}
                  fill="#38bdf8"
                  stroke="#a5f3fc"
                  strokeWidth={1.2}
                />
              );
            })}
          </g>
        </>
      );
    }

    return (
      <g opacity={ghostOpacity}>
        {committedTrackers.map((tracker) => (
          <rect
            key={tracker.id}
            x={tracker.x}
            y={tracker.y}
            width={tracker.width}
            height={tracker.height}
            fill="#2563eb"
          />
        ))}
      </g>
    );
  };

  const eventToWorldPoint = (
    event: React.MouseEvent<SVGSVGElement>,
  ): Point | null => {
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

  const handleClick = (event: React.MouseEvent<SVGSVGElement>) => {
    const clickedPoint = eventToWorldPoint(event);
    if (!clickedPoint) {
      return;
    }

    const clickedInsideWorkingParcel = pointInPolygon(clickedPoint, workingParcel.points);
    const clickedNorthBoundary =
      clickedPoint.y < baseLayout.road.y + 20 &&
      distanceToPolyline(clickedPoint, NORTH_REFERENCE_POINTS) < 12;

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
      });
      return;
    }

    if (
      state.activeTool === 'align' &&
      state.viewMode === 'tracker' &&
      state.fillCommitted
    ) {
      if (!state.alignReferencePicked && clickedNorthBoundary) {
        onFlowChange({
          alignReferencePicked: true,
          alignSelectionPicked: false,
          alignCommittedMode: null,
        });
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
    }
  };

  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) {
      return;
    }

    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;

    const ctm = svg.getScreenCTM();
    if (!ctm) {
      return;
    }

    const world = point.matrixTransform(ctm.inverse());
    setCursorPoint({ x: world.x, y: world.y });
  };

  const roadVisible = fillPreviewActive || state.fillCommitted;

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
            <line
              key={`v-${index}`}
              x1={index * 40}
              y1={0}
              x2={index * 40}
              y2={CANVAS_VIEWBOX.height}
              stroke="#1e293b"
              strokeWidth={1}
            />
          ))}
          {Array.from({ length: 22 }).map((_, index) => (
            <line
              key={`h-${index}`}
              x1={0}
              y1={index * 40}
              x2={CANVAS_VIEWBOX.width}
              y2={index * 40}
              stroke="#1e293b"
              strokeWidth={1}
            />
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

        {roadVisible && (
          <g opacity={state.viewMode === 'block' ? 0.26 : fillPreviewActive ? 0.55 : 0.9}>
            <line
              x1={baseLayout.road.x1}
              y1={baseLayout.road.y}
              x2={baseLayout.road.x2}
              y2={baseLayout.road.y}
              stroke="#cbd5e1"
              strokeWidth={baseLayout.road.width}
            />
            <line
              x1={baseLayout.road.x1}
              y1={baseLayout.road.y}
              x2={baseLayout.road.x2}
              y2={baseLayout.road.y}
              stroke="#475569"
              strokeWidth={1.5}
              strokeDasharray="8 8"
            />
          </g>
        )}

        {renderTrackers()}

        {(state.alignReferencePicked || isHoveringNorthBoundary) &&
          state.activeTool === 'align' &&
          state.fillCommitted && (
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
                <rect
                  x={block.bounds.x}
                  y={block.bounds.y}
                  width={block.bounds.width}
                  height={block.bounds.height}
                  fill={block.color}
                  stroke={block.color.replace('0.45', '0.95')}
                  strokeWidth={state.viewMode === 'block' ? 2 : 1}
                />
                <rect
                  x={block.bounds.x + block.bounds.width / 2 - 28}
                  y={block.bounds.y + block.bounds.height / 2 - 11}
                  width={56}
                  height={22}
                  rx={4}
                  fill="rgba(15, 23, 42, 0.78)"
                />
                <text
                  x={block.bounds.x + block.bounds.width / 2}
                  y={block.bounds.y + block.bounds.height / 2 + 4}
                  textAnchor="middle"
                  fill="#f8fafc"
                  fontSize={10}
                  fontWeight={700}
                >
                  {block.label}
                </text>
              </g>
            ))}
          </g>
        )}

        {state.activeTool === 'align' && state.alignSelectionPicked && !state.alignCommittedMode && (
          <text
            x={126}
            y={86}
            fill="#67e8f9"
            fontSize={11}
            fontWeight={700}
          >
            Setback target: {TRACKER_BORDER_SETBACK_PX / 2}m from north boundary
          </text>
        )}
      </svg>

      {tooltip && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur text-white px-4 py-2 rounded-full text-sm font-medium border border-white/10 pointer-events-none">
          {tooltip}
        </div>
      )}

      <div className="absolute top-4 right-4 bg-slate-900/90 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-200 flex gap-3">
        <span className={state.fillCommitted ? 'text-emerald-300' : 'text-slate-400'}>
          Fill {state.fillCommitted ? 'done' : 'pending'}
        </span>
        <span className={state.alignCommittedMode ? 'text-emerald-300' : 'text-slate-400'}>
          Align {state.alignCommittedMode ? state.alignCommittedMode : 'pending'}
        </span>
        <span className={state.blockFillCommitted ? 'text-emerald-300' : 'text-slate-400'}>
          Blocks {state.blockFillCommitted ? 'done' : 'pending'}
        </span>
      </div>

      <div className="absolute bottom-4 left-4 flex items-center gap-3 text-xs">
        <div className="bg-slate-900/85 border border-slate-700 rounded px-2 py-1 text-slate-300">
          Scale 1:200
        </div>
        <div className="bg-slate-900/85 border border-slate-700 rounded px-2 py-1 text-slate-300">
          Demo solver: local deterministic
        </div>
      </div>
    </div>
  );
};

export default Canvas;
