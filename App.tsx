import React, { useEffect, useState } from 'react';
import Toolbar from './components/Toolbar';
import PropertiesPanel from './components/PropertiesPanel';
import Canvas from './components/Canvas';
import { DesignState, ToolType, ViewMode } from './types';

const initialState: DesignState = {
  viewMode: 'tracker',
  activeTool: 'fill',
  rowSpacing: 6,
  roadWidth: 8,
  showBlocks: true,
  fillPattern: 'aligned',
  alignMode: 'rigid',
  fillCommitted: false,
  alignReferencePicked: false,
  alignSelectionPicked: false,
  alignCommittedMode: null,
  blockFillCommitted: false,
  editSubMode: 'point',
  trimExtendMode: 'trim',
  selectionScope: 'individual',
  moveCopyMode: 'move',
  activeFieldSeedId: null,
  osnapEnabled: true,
  smartGuidesEnabled: true,
  adaptiveRoadEditing: true,
  equipmentRemovesTrackers: true,
  blockHeight: 4,
  roadStepDistance: 24,
  editOps: 0,
  trimOps: 0,
  extendOps: 0,
};

const App: React.FC = () => {
  const [state, setState] = useState<DesignState>(initialState);
  const [trackerCount, setTrackerCount] = useState(0);

  const handleStateChange = (updates: Partial<DesignState>) => {
    setState((prev) => {
      const next = { ...prev, ...updates };

      const generatorInputsChanged =
        (updates.fillPattern !== undefined && updates.fillPattern !== prev.fillPattern) ||
        (updates.rowSpacing !== undefined && updates.rowSpacing !== prev.rowSpacing) ||
        (updates.roadWidth !== undefined && updates.roadWidth !== prev.roadWidth);

      if (generatorInputsChanged && next.fillCommitted) {
        next.alignReferencePicked = false;
        next.alignSelectionPicked = false;
        next.alignCommittedMode = null;
        next.blockFillCommitted = false;
        next.editOps = 0;
        next.trimOps = 0;
        next.extendOps = 0;
        next.activeFieldSeedId = null;
      }

      if (updates.viewMode === 'tracker' && prev.viewMode !== 'tracker' && next.activeTool === 'select') {
        next.activeTool = 'fill';
      }

      return next;
    });
  };

  const handleToolSelect = (tool: ToolType) => {
    handleStateChange({ activeTool: tool });
  };

  const handleModeSelect = (mode: ViewMode) => {
    handleStateChange({ viewMode: mode });
  };

  const resetFlow = () => {
    setState((prev) => ({
      ...prev,
      activeTool: 'fill',
      viewMode: 'tracker',
      alignMode: 'rigid',
      fillCommitted: false,
      alignReferencePicked: false,
      alignSelectionPicked: false,
      alignCommittedMode: null,
      blockFillCommitted: false,
      editSubMode: 'point',
      trimExtendMode: 'trim',
      selectionScope: 'individual',
      moveCopyMode: 'move',
      activeFieldSeedId: null,
      editOps: 0,
      trimOps: 0,
      extendOps: 0,
    }));
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case 't':
          handleModeSelect('tracker');
          break;
        case 'b':
          handleModeSelect('block');
          break;
        case 'n':
          handleModeSelect('normal');
          break;
        case ' ': {
          event.preventDefault();

          if (state.activeTool === 'fill' && state.viewMode === 'tracker') {
            const patterns: DesignState['fillPattern'][] = ['aligned', 'max', 'mega'];
            const nextIndex = (patterns.indexOf(state.fillPattern) + 1) % patterns.length;
            handleStateChange({ fillPattern: patterns[nextIndex] });
            return;
          }

          if (
            state.activeTool === 'align' &&
            state.viewMode === 'tracker' &&
            state.alignSelectionPicked
          ) {
            handleStateChange({ alignMode: state.alignMode === 'rigid' ? 'noodle' : 'rigid' });
            return;
          }

          if (state.activeTool === 'edit') {
            const modes: DesignState['editSubMode'][] = ['point', 'segment', 'add_remove'];
            const nextIndex = (modes.indexOf(state.editSubMode) + 1) % modes.length;
            handleStateChange({ editSubMode: modes[nextIndex] });
            return;
          }

          if (state.activeTool === 'trim') {
            handleStateChange({ trimExtendMode: state.trimExtendMode === 'trim' ? 'extend' : 'trim' });
            return;
          }
          break;
        }
        case 'tab': {
          event.preventDefault();
          const scopes: DesignState['selectionScope'][] = ['individual', 'row', 'field', 'all'];
          const currentIndex = scopes.indexOf(state.selectionScope);
          const nextIndex = event.shiftKey
            ? (currentIndex - 1 + scopes.length) % scopes.length
            : (currentIndex + 1) % scopes.length;
          handleStateChange({ selectionScope: scopes[nextIndex] });
          break;
        }
        case 'escape': {
          handleStateChange({
            activeTool: 'select',
            alignReferencePicked: false,
            alignSelectionPicked: false,
            moveCopyMode: 'move',
            activeFieldSeedId: null,
          });
          break;
        }
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    state.activeTool,
    state.alignCommittedMode,
    state.alignMode,
    state.alignSelectionPicked,
    state.editSubMode,
    state.fillPattern,
    state.selectionScope,
    state.trimExtendMode,
    state.viewMode,
  ]);

  return (
    <div className="flex h-screen w-screen flex-col lg:flex-row bg-slate-950 overflow-hidden font-sans text-slate-100">
      <Toolbar
        activeTool={state.activeTool}
        viewMode={state.viewMode}
        onSelectTool={handleToolSelect}
        onSelectMode={handleModeSelect}
      />

      <main className="flex-1 relative h-full bg-slate-900 min-h-[50vh]">
        <div className="absolute top-3 left-3 z-10 bg-slate-900/90 backdrop-blur shadow-sm border border-slate-700 rounded-md px-3 py-2 flex flex-wrap items-center gap-3 text-xs lg:text-sm">
          <div className="font-bold text-slate-100">PVFARM</div>
          <div className="text-slate-500">/</div>
          <div className="text-slate-300 font-medium">Manual Blocks Proto</div>
          <div className="text-slate-500">/</div>
          <div className="text-slate-400">Layout Tools MVP</div>

          <div className="w-px h-4 bg-slate-600 mx-1 hidden sm:block" />

          <span className="font-mono text-cyan-300 bg-cyan-900/30 px-2 py-0.5 rounded">
            Mode: {state.viewMode.toUpperCase()}
          </span>
          <span className="font-mono text-blue-300 bg-blue-900/30 px-2 py-0.5 rounded">
            Fill: {state.fillPattern.toUpperCase()}
          </span>
          <span className="font-mono text-amber-300 bg-amber-900/30 px-2 py-0.5 rounded">
            Align: {state.alignMode.toUpperCase()}
          </span>
          <span className="font-mono text-emerald-300 bg-emerald-900/30 px-2 py-0.5 rounded">
            Select: {state.selectionScope.toUpperCase()}
          </span>
        </div>

        <Canvas
          state={state}
          onTrackerCountChange={setTrackerCount}
          onFlowChange={handleStateChange}
        />
      </main>

      <PropertiesPanel
        state={state}
        onChange={handleStateChange}
        trackerCount={trackerCount}
        onResetFlow={resetFlow}
      />
    </div>
  );
};

export default App;
