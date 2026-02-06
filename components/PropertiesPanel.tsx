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

interface PropertiesPanelProps {
  state: DesignState;
  onChange: (updates: Partial<DesignState>) => void;
  trackerCount: number;
  onResetFlow: () => void;
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

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  state,
  onChange,
  trackerCount,
  onResetFlow,
}) => {
  const capacity = (trackerCount * 0.0092).toFixed(2);

  return (
    <div className="w-full lg:w-80 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col h-[45vh] lg:h-full text-slate-300 z-20 shadow-2xl">
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
              {capacity} <span className="text-xs font-normal text-slate-500">MW</span>
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
                    {state.rowSpacing}m
                  </span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="11"
                  step="0.5"
                  value={state.rowSpacing}
                  onChange={(event) => onChange({ rowSpacing: parseFloat(event.target.value) })}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-sm font-medium text-slate-300">Road Width</label>
                  <span className="text-xs font-mono text-blue-300 bg-blue-900/20 px-1.5 py-0.5 rounded">
                    {state.roadWidth}m
                  </span>
                </div>
                <input
                  type="range"
                  min="6"
                  max="14"
                  step="0.5"
                  value={state.roadWidth}
                  onChange={(event) => onChange({ roadWidth: parseFloat(event.target.value) })}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-sm font-medium text-slate-300">Block Height</label>
                  <span className="text-xs font-mono text-blue-300 bg-blue-900/20 px-1.5 py-0.5 rounded">
                    {state.blockHeight}
                  </span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="8"
                  step="1"
                  value={state.blockHeight}
                  onChange={(event) => onChange({ blockHeight: parseInt(event.target.value, 10) })}
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
                  checked={state.osnapEnabled}
                  onChange={(event) => onChange({ osnapEnabled: event.target.checked })}
                />
              </label>
              <label className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1"><Waypoints size={12} /> Smart Guides</span>
                <input
                  type="checkbox"
                  checked={state.smartGuidesEnabled}
                  onChange={(event) => onChange({ smartGuidesEnabled: event.target.checked })}
                />
              </label>
              <label className="flex items-center justify-between gap-2">
                <span>Adaptive road editing</span>
                <input
                  type="checkbox"
                  checked={state.adaptiveRoadEditing}
                  onChange={(event) => onChange({ adaptiveRoadEditing: event.target.checked })}
                />
              </label>
              <label className="flex items-center justify-between gap-2">
                <span>Equipment removes trackers</span>
                <input
                  type="checkbox"
                  checked={state.equipmentRemovesTrackers}
                  onChange={(event) => onChange({ equipmentRemovesTrackers: event.target.checked })}
                />
              </label>
              <div className="pt-2 border-t border-slate-700/60">
                <div className="text-slate-400 mb-1">Sub-area scope</div>
                <div className="flex gap-2">
                  <PillButton active={state.subAreaScope === 'all'} label="All" onClick={() => onChange({ subAreaScope: 'all' })} />
                  <PillButton active={state.subAreaScope === 'north'} label="North" onClick={() => onChange({ subAreaScope: 'north' })} />
                  <PillButton active={state.subAreaScope === 'south'} label="South" onClick={() => onChange({ subAreaScope: 'south' })} />
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Maximize2 size={12} /> Context Controls
            </div>
            <div className="space-y-2 bg-slate-800/30 rounded-lg p-3 border border-slate-700/50 text-xs">
              <div>Active tool: <span className="text-slate-100 uppercase">{state.activeTool}</span></div>
              {state.activeTool === 'edit' && <div>Edit sub-mode: <span className="text-cyan-300">{state.editSubMode}</span> (`Space` cycles)</div>}
              {state.activeTool === 'trim' && <div>Trim/Extend mode: <span className="text-cyan-300">{state.trimExtendMode}</span> (`Space` toggles)</div>}
              {state.activeTool === 'stamp' && <div>Stamp orientation: <span className="text-cyan-300">{state.stampOrientation}</span> (`Space` toggles)</div>}
              {state.activeTool === 'select' && (
                <>
                  <div>Selection scope: <span className="text-cyan-300">{state.selectionScope}</span> (`Tab` cycles)</div>
                  <div className="flex gap-2 pt-1">
                    <PillButton active={state.moveCopyMode === 'move'} label="Move" onClick={() => onChange({ moveCopyMode: 'move' })} />
                    <PillButton active={state.moveCopyMode === 'copy'} label="Copy" onClick={() => onChange({ moveCopyMode: 'copy' })} />
                    <PillButton active={state.moveCopyMode === 'array'} label="Array" onClick={() => onChange({ moveCopyMode: 'array' })} />
                  </div>
                </>
              )}
              {state.activeTool === 'fill' && (
                <div>Fill pattern: <span className="text-cyan-300">{state.fillPattern}</span> (`Space` cycles)</div>
              )}
              {state.activeTool === 'align' && (
                <div>Align type: <span className="text-cyan-300">{state.alignMode}</span> (`Space` toggles)</div>
              )}
            </div>
          </section>

          <section>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Move size={12} /> Workflow Status
            </div>
            <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/70 space-y-2">
              <StepRow done={state.fillCommitted} label="1. Tracker fill committed" />
              <StepRow done={state.alignReferencePicked} label="2. Align reference picked" />
              <StepRow done={state.alignSelectionPicked} label="3. North field selected" />
              <StepRow done={!!state.alignCommittedMode} label={`4. Align committed${state.alignCommittedMode ? ` (${state.alignCommittedMode})` : ''}`} />
              <StepRow done={state.blockFillCommitted} label="5. Block fill committed" />
              <StepRow done={state.editOps > 0} label={`6. Edit actions (${state.editOps})`} />
              <StepRow done={state.trimOps + state.extendOps > 0} label={`7. Trim/Extend actions (${state.trimOps + state.extendOps})`} />
              <StepRow done={state.stampSegments.length > 0} label={`8. Stamp segments (${state.stampSegments.length})`} />
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
              <div className="bg-slate-800/50 p-2 rounded border border-slate-700">`Tab` selection scope</div>
              <div className="bg-slate-800/50 p-2 rounded border border-slate-700">`Space` context toggle</div>
              <div className="bg-slate-800/50 p-2 rounded border border-slate-700 flex items-center gap-1"><Copy size={11} /> Move/Copy/Array via Select</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PropertiesPanel;
