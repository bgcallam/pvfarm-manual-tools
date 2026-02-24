import React from 'react';
import { DesignState } from '../types';

interface ToolPanelProps {
  state: DesignState;
  onChange: (updates: Partial<DesignState>) => void;
}

const PillButton: React.FC<{ active: boolean; label: string; onClick: () => void }> = ({
  active,
  label,
  onClick,
}) => (
  <button
    onClick={onClick}
    className={`px-2 py-1 text-xs rounded-full border transition-colors ${
      active
        ? 'bg-blue-600/40 border-blue-400 text-blue-100'
        : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
    }`}
  >
    {label}
  </button>
);

const ToolPanel: React.FC<ToolPanelProps> = ({ state, onChange }) => {
  const { ui } = state;

  return (
    <div className="absolute left-4 top-16 z-20 bg-slate-950/95 border border-slate-800 rounded-xl px-3 py-3 text-xs text-slate-200 shadow-xl backdrop-blur w-64">
      <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Tool Settings</div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold">{ui.activeTool.toUpperCase()}</div>
        <div className="text-[10px] text-slate-500">{ui.viewMode.toUpperCase()} mode</div>
      </div>

      {ui.activeTool === 'fill' && ui.viewMode === 'tracker' && (
        <div className="space-y-2">
          <div className="text-[10px] text-slate-500 uppercase tracking-wide">Fill Mode</div>
          <div className="flex flex-wrap gap-2">
            <PillButton
              active={ui.fillPattern === 'mega'}
              label="Mega DC"
              onClick={() => onChange({ ui: { fillPattern: 'mega' } })}
            />
            <PillButton
              active={ui.fillPattern === 'max'}
              label="Max DC"
              onClick={() => onChange({ ui: { fillPattern: 'max' } })}
            />
            <PillButton
              active={ui.fillPattern === 'aligned'}
              label="Aligned"
              onClick={() => onChange({ ui: { fillPattern: 'aligned' } })}
            />
          </div>
        </div>
      )}

      {ui.activeTool === 'align' && (
        <div className="space-y-2">
          <div className="text-[10px] text-slate-500 uppercase tracking-wide">Align Mode</div>
          <div className="flex gap-2">
            <PillButton
              active={ui.alignMode === 'rigid'}
              label="Rigid"
              onClick={() => onChange({ ui: { alignMode: 'rigid' } })}
            />
            <PillButton
              active={ui.alignMode === 'noodle'}
              label="Noodle"
              onClick={() => onChange({ ui: { alignMode: 'noodle' } })}
            />
          </div>
        </div>
      )}

      {ui.activeTool === 'edit' && (
        <div className="space-y-2">
          <div className="text-[10px] text-slate-500 uppercase tracking-wide">Edit Sub-Mode</div>
          <div className="flex flex-wrap gap-2">
            <PillButton
              active={ui.editSubMode === 'point'}
              label="Point"
              onClick={() => onChange({ ui: { editSubMode: 'point' } })}
            />
            <PillButton
              active={ui.editSubMode === 'segment'}
              label="Segment"
              onClick={() => onChange({ ui: { editSubMode: 'segment' } })}
            />
            <PillButton
              active={ui.editSubMode === 'add_remove'}
              label="Add/Remove"
              onClick={() => onChange({ ui: { editSubMode: 'add_remove' } })}
            />
          </div>
          {ui.viewMode === 'tracker' && (
            <div className="flex items-center gap-2 pt-2">
              <PillButton
                active={ui.roadDrawMode}
                label={ui.roadDrawMode ? 'Road Draw: On' : 'Road Draw: Off'}
                onClick={() => onChange({ ui: { roadDrawMode: !ui.roadDrawMode } })}
              />
              <span className="text-[10px] text-slate-500">Click to add points, double-click or Enter to finish.</span>
            </div>
          )}
        </div>
      )}

      {ui.activeTool === 'trim' && (
        <div className="space-y-2">
          <div className="text-[10px] text-slate-500 uppercase tracking-wide">Trim / Extend</div>
          <div className="flex gap-2">
            <PillButton
              active={ui.trimExtendMode === 'trim'}
              label="Trim"
              onClick={() => onChange({ ui: { trimExtendMode: 'trim' } })}
            />
            <PillButton
              active={ui.trimExtendMode === 'extend'}
              label="Extend"
              onClick={() => onChange({ ui: { trimExtendMode: 'extend' } })}
            />
          </div>
        </div>
      )}

      {ui.activeTool === 'select' && (
        <div className="space-y-2">
          <div className="text-[10px] text-slate-500 uppercase tracking-wide">Selection</div>
          {ui.viewMode === 'normal' ? (
            <div className="flex gap-2 flex-wrap">
              <PillButton
                active={ui.normalSelectionTarget === 'tracker'}
                label="Tracker"
                onClick={() => onChange({ ui: { normalSelectionTarget: 'tracker' } })}
              />
              <PillButton
                active={ui.normalSelectionTarget === 'road'}
                label="Road"
                onClick={() => onChange({ ui: { normalSelectionTarget: 'road' } })}
              />
              <PillButton
                active={ui.normalSelectionTarget === 'boundary'}
                label="Boundary"
                onClick={() => onChange({ ui: { normalSelectionTarget: 'boundary' } })}
              />
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap">
              <PillButton
                active={ui.selectionScope === 'individual'}
                label="Individual"
                onClick={() => onChange({ ui: { selectionScope: 'individual' } })}
              />
              <PillButton
                active={ui.selectionScope === 'row'}
                label="Row"
                onClick={() => onChange({ ui: { selectionScope: 'row' } })}
              />
              <PillButton
                active={ui.selectionScope === 'field'}
                label="Field"
                onClick={() => onChange({ ui: { selectionScope: 'field' } })}
              />
              <PillButton
                active={ui.selectionScope === 'all'}
                label="All"
                onClick={() => onChange({ ui: { selectionScope: 'all' } })}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ToolPanel;
