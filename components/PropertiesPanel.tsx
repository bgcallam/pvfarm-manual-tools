import React from 'react';
import { DesignState } from '../types';
import {
  Settings2,
  Sliders,
  Maximize2,
  Zap,
  RotateCcw,
  CheckCircle2,
  Circle,
  Magnet,
  Waypoints,
  Move,
  Copy,
} from 'lucide-react';
import {
  DEFAULT_STRING_COUNT,
  DEFAULT_STRING_SIZE,
  MODULE_WATTAGE_W,
} from '../constants';
import {
  estimateRows,
  estimateStringsRange,
  formatApproxRows,
  formatApproxStrings,
} from '../layoutEstimates';

interface PropertiesPanelProps {
  state: DesignState;
  onChange: (updates: Partial<DesignState>) => void;
  trackerCount: number;
  onResetFlow: () => void;
  floating?: boolean;
}

const StepRow: React.FC<{ done: boolean; label: string }> = ({ done, label }) => (
  <div className="flex items-center gap-2 text-xs">
    {done ? (
      <CheckCircle2 size={14} className="text-emerald-400" />
    ) : (
      <Circle size={14} className="text-slate-500" />
    )}
    <span className={done ? 'text-slate-200' : 'text-slate-400'}>{label}</span>
  </div>
);

const PillButton: React.FC<{
  active: boolean;
  label: string;
  onClick: () => void;
}> = ({ active, label, onClick }) => (
  <button
    onClick={onClick}
    className={`px-2 py-1 text-xs rounded border transition-colors ${
      active
        ? 'bg-blue-600/40 border-blue-400 text-blue-100'
        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
    }`}
  >
    {label}
  </button>
);

const METERS_TO_FEET = 3.28084;

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  state,
  onChange,
  trackerCount,
  onResetFlow,
  floating = false,
}) => {
  const trackerDcKw =
    (DEFAULT_STRING_COUNT * DEFAULT_STRING_SIZE * MODULE_WATTAGE_W) / 1000;
  const capacityMw = ((trackerCount * trackerDcKw) / 1000).toFixed(2);
  const rowToRowFt = state.settings.rowToRow * METERS_TO_FEET;
  const blockWidthRows = estimateRows(state.settings.blockWidth, rowToRowFt);
  const blockHeightStrings = estimateStringsRange(
    state.settings.blockHeight,
    rowToRowFt
  );

  const containerClass = floating
    ? 'w-80 bg-slate-900/95 border border-slate-800 rounded-xl flex flex-col h-[70vh] text-slate-300 shadow-2xl backdrop-blur'
    : 'w-full lg:w-80 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col h-[45vh] lg:h-full text-slate-300 z-20 shadow-2xl';

  return (
    <div className={containerClass}>
      <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900">
        <h2 className="font-semibold text-white flex items-center gap-2 text-xs uppercase tracking-wide">
          <Settings2 size={15} className="text-blue-500" />
          Generation Settings
        </h2>
        <button
          onClick={onResetFlow}
          className="text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1"
        >
          <RotateCcw size={12} /> Reset
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-2 border-b border-slate-800">
          <div className="p-3 border-r border-slate-800">
            <div className="text-[10px] text-slate-500 font-mono mb-1">CAPACITY</div>
            <div className="text-lg font-bold text-white">
              {capacityMw} <span className="text-xs font-normal text-slate-500">MW</span>
            </div>
          </div>
          <div className="p-3">
            <div className="text-[10px] text-slate-500 font-mono mb-1">TRACKERS</div>
            <div className="text-lg font-bold text-white">{trackerCount}</div>
          </div>
        </div>

        <div className="p-4 space-y-6">
          <section>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Sliders size={12} /> Global Offsets
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-sm font-medium text-slate-300">Row Spacing (R2R)</label>
                  <span className="text-xs font-mono text-blue-300 bg-blue-900/20 px-1.5 py-0.5 rounded">
                    {state.settings.rowToRow}m
                  </span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="11"
                  step="0.5"
                  value={state.settings.rowToRow}
                  onChange={(event) =>
                    onChange({ settings: { rowToRow: parseFloat(event.target.value) } })
                  }
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-sm font-medium text-slate-300">Road Width</label>
                  <span className="text-xs font-mono text-blue-300 bg-blue-900/20 px-1.5 py-0.5 rounded">
                    {state.settings.roadWidth}m
                  </span>
                </div>
                <input
                  type="range"
                  min="6"
                  max="14"
                  step="0.5"
                  value={state.settings.roadWidth}
                  onChange={(event) =>
                    onChange({ settings: { roadWidth: parseFloat(event.target.value) } })
                  }
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-sm font-medium text-slate-300">Block Width</label>
                  <span className="text-xs font-mono text-blue-300 bg-blue-900/20 px-1.5 py-0.5 rounded">
                    {state.settings.blockWidth}ft
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 mb-1">
                  {formatApproxRows(
                    state.settings.blockWidth,
                    'ft',
                    blockWidthRows
                  )}
                </div>
                <input
                  type="range"
                  min="50"
                  max="300"
                  step="10"
                  value={state.settings.blockWidth}
                  onChange={(event) =>
                    onChange({ settings: { blockWidth: parseInt(event.target.value, 10) } })
                  }
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-sm font-medium text-slate-300">Block Height</label>
                  <span className="text-xs font-mono text-blue-300 bg-blue-900/20 px-1.5 py-0.5 rounded">
                    {state.settings.blockHeight}ft
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 mb-1">
                  {formatApproxStrings(
                    state.settings.blockHeight,
                    'ft',
                    blockHeightStrings
                  )}
                </div>
                <input
                  type="range"
                  min="50"
                  max="300"
                  step="10"
                  value={state.settings.blockHeight}
                  onChange={(event) =>
                    onChange({ settings: { blockHeight: parseInt(event.target.value, 10) } })
                  }
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
            </div>
          </section>

          <section>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Magnet size={12} /> Infrastructure
            </div>
            <div className="space-y-3 bg-slate-800/30 rounded-lg p-3 border border-slate-700/50 text-xs">
              <label className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1"><Magnet size={12} /> Running OSnap</span>
                <input
                  type="checkbox"
                  checked={state.ui.osnapEnabled}
                  onChange={(event) => onChange({ ui: { osnapEnabled: event.target.checked } })}
                />
              </label>
              {state.ui.osnapEnabled && (
                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-300 pl-4">
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={state.ui.osnapCategories.rowSpacing}
                      onChange={(event) =>
                        onChange({
                          ui: {
                            osnapCategories: {
                              ...state.ui.osnapCategories,
                              rowSpacing: event.target.checked,
                            },
                          },
                        })
                      }
                    />
                    R2R spacing
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={state.ui.osnapCategories.roadCenterline}
                      onChange={(event) =>
                        onChange({
                          ui: {
                            osnapCategories: {
                              ...state.ui.osnapCategories,
                              roadCenterline: event.target.checked,
                            },
                          },
                        })
                      }
                    />
                    Road center
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={state.ui.osnapCategories.roadEdge}
                      onChange={(event) =>
                        onChange({
                          ui: {
                            osnapCategories: {
                              ...state.ui.osnapCategories,
                              roadEdge: event.target.checked,
                            },
                          },
                        })
                      }
                    />
                    Road edge
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={state.ui.osnapCategories.boundaryVertex}
                      onChange={(event) =>
                        onChange({
                          ui: {
                            osnapCategories: {
                              ...state.ui.osnapCategories,
                              boundaryVertex: event.target.checked,
                            },
                          },
                        })
                      }
                    />
                    Boundary vertex
                  </label>
                  <label className="flex items-center gap-1 col-span-2">
                    <input
                      type="checkbox"
                      checked={state.ui.osnapCategories.boundaryEdge}
                      onChange={(event) =>
                        onChange({
                          ui: {
                            osnapCategories: {
                              ...state.ui.osnapCategories,
                              boundaryEdge: event.target.checked,
                            },
                          },
                        })
                      }
                    />
                    Boundary edge
                  </label>
                </div>
              )}
              <label className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1"><Waypoints size={12} /> Smart Guides</span>
                <input
                  type="checkbox"
                  checked={state.ui.smartGuidesEnabled}
                  onChange={(event) => onChange({ ui: { smartGuidesEnabled: event.target.checked } })}
                />
              </label>
              <label className="flex items-center justify-between gap-2">
                <span>Adaptive road editing</span>
                <input
                  type="checkbox"
                  checked={state.ui.adaptiveRoadEditing}
                  onChange={(event) => onChange({ ui: { adaptiveRoadEditing: event.target.checked } })}
                />
              </label>
              <label className="flex items-center justify-between gap-2">
                <span>Objects remove underlying</span>
                <input
                  type="checkbox"
                  checked={state.settings.objectRemovesUnderlying}
                  onChange={(event) =>
                    onChange({ settings: { objectRemovesUnderlying: event.target.checked } })
                  }
                />
              </label>
            </div>
          </section>

          <section>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Maximize2 size={12} /> Context Controls
            </div>
            <div className="space-y-2 bg-slate-800/30 rounded-lg p-3 border border-slate-700/50 text-xs">
              <div>Active tool: <span className="text-slate-100 uppercase">{state.ui.activeTool}</span></div>
              {state.ui.activeTool === 'edit' && (
                <div>Edit sub-mode: <span className="text-cyan-300">{state.ui.editSubMode}</span> (`Space` cycles)</div>
              )}
              {state.ui.activeTool === 'trim' && (
                <div>Trim/Extend mode: <span className="text-cyan-300">{state.ui.trimExtendMode}</span> (`Space` toggles)</div>
              )}
              {state.ui.activeTool === 'select' && (
                <>
                  {state.ui.viewMode === 'normal' ? (
                    <div>
                      Normal target: <span className="text-cyan-300">{state.ui.normalSelectionTarget}</span> (
                      `Tab` cycles)
                    </div>
                  ) : (
                    <>
                      <div>Selection scope: <span className="text-cyan-300">{state.ui.selectionScope}</span> (`Tab` cycles)</div>
                      <div>All = contiguous array field (single-site)</div>
                    </>
                  )}
                  <div className="flex gap-2 pt-1">
                    <PillButton
                      active={state.ui.moveCopyMode === 'move'}
                      label="Move"
                      onClick={() => onChange({ ui: { moveCopyMode: 'move' } })}
                    />
                    <PillButton
                      active={state.ui.moveCopyMode === 'copy'}
                      label="Copy"
                      onClick={() => onChange({ ui: { moveCopyMode: 'copy' } })}
                    />
                    <PillButton
                      active={state.ui.moveCopyMode === 'array'}
                      label="Array"
                      onClick={() => onChange({ ui: { moveCopyMode: 'array' } })}
                    />
                  </div>
                </>
              )}
              <div>Active field seed: <span className="text-cyan-300">{state.ui.activeFieldSeedId ?? 'none'}</span></div>
              <div>
                Selected trackers: <span className="text-cyan-300">{state.ui.selectedTrackerIds.length}</span>
              </div>
              {state.ui.activeTool === 'fill' && (
                <div>Fill pattern: <span className="text-cyan-300">{state.ui.fillPattern}</span> (`Space` cycles)</div>
              )}
              {state.ui.activeTool === 'align' && (
                <div>Align type: <span className="text-cyan-300">{state.ui.alignMode}</span> (`Space` toggles)</div>
              )}
            </div>
          </section>

          <section>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Move size={12} /> Workflow Status
            </div>
            <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/70 space-y-2">
              <StepRow done={state.flow.fillCommitted} label="1. Tracker fill committed" />
              <StepRow done={state.flow.alignReferencePicked} label="2. Align reference picked" />
              <StepRow done={state.flow.alignSelectionPicked} label="3. North field selected" />
              <StepRow
                done={!!state.flow.alignCommittedMode}
                label={`4. Align committed${state.flow.alignCommittedMode ? ` (${state.flow.alignCommittedMode})` : ''}`}
              />
              <StepRow done={state.flow.blockFillCommitted} label="5. Block fill committed" />
            </div>
          </section>

          <section>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Zap size={12} /> Keyboard Guide
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-800/50 p-2 rounded border border-slate-700">`T` Tracker mode</div>
              <div className="bg-slate-800/50 p-2 rounded border border-slate-700">`B` Block mode</div>
              <div className="bg-slate-800/50 p-2 rounded border border-slate-700">`N` Normal mode</div>
              <div className="bg-slate-800/50 p-2 rounded border border-slate-700">`Tab` scope (T/B) or target (N)</div>
              <div className="bg-slate-800/50 p-2 rounded border border-slate-700">`Space` context toggle</div>
              <div className="bg-slate-800/50 p-2 rounded border border-slate-700">`Esc` exit active command</div>
              <div className="bg-slate-800/50 p-2 rounded border border-slate-700 flex items-center gap-1"><Copy size={11} /> Move/Copy/Array via Select</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PropertiesPanel;
