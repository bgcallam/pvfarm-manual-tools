import React, { useEffect, useState } from 'react';
import Toolbar from './components/Toolbar';
import PropertiesPanel from './components/PropertiesPanel';
import Canvas from './components/Canvas';
import ToolPanel from './components/ToolPanel';
import { DesignState, ToolType, ViewMode } from './types';
import { INITIAL_PARCELS } from './fixtures';

const initialState: DesignState = {
  ui: {
    viewMode: 'tracker',
    activeTool: 'fill',
    showBlocks: true,
    fillPattern: 'aligned',
    alignMode: 'rigid',
    editSubMode: 'point',
    trimExtendMode: 'trim',
    selectionScope: 'individual',
    moveCopyMode: 'move',
    activeFieldSeedId: null,
    normalSelectionTarget: 'tracker',
    selectedTrackerIds: [],
    selectedRoadId: null,
    selectedBoundaryId: null,
    osnapEnabled: true,
    osnapCategories: {
      rowSpacing: true,
      roadCenterline: true,
      roadEdge: true,
      boundaryVertex: true,
      boundaryEdge: false,
    },
    smartGuidesEnabled: true,
    adaptiveRoadEditing: true,
  },
  flow: {
    fillCommitted: false,
    alignReferencePicked: false,
    alignSelectionPicked: false,
    alignCommittedMode: null,
    blockFillCommitted: false,
  },
  settings: {
    rowToRow: 6,
    arrayOffset: 5,
    roadWidth: 8,
    roadStepDistance: 24,
    roadClearDistance: 6,
    boundarySetback: 5,
    blockHeight: 160,
    blockWidth: 240,
    gapTolerance: 2,
    blockOffset: 5,
    ilrRange: [1.0, 1.25],
    objectRemovesUnderlying: true,
  },
  model: {
    parcels: INITIAL_PARCELS,
    roads: [],
    trackers: [],
    skids: [],
    blocks: [],
  },
};

const App: React.FC = () => {
  const [state, setState] = useState<DesignState>(initialState);
  const [trackerCount, setTrackerCount] = useState(0);

  const handleStateChange = (updates: Partial<DesignState>) => {
    setState((prev) => {
      const next: DesignState = {
        ...prev,
        ui: { ...prev.ui, ...updates.ui },
        flow: { ...prev.flow, ...updates.flow },
        settings: { ...prev.settings, ...updates.settings },
        model: { ...prev.model, ...updates.model },
      };

      const generatorInputsChanged =
        (updates.ui?.fillPattern !== undefined &&
          updates.ui.fillPattern !== prev.ui.fillPattern) ||
        (updates.settings?.rowToRow !== undefined &&
          updates.settings.rowToRow !== prev.settings.rowToRow) ||
        (updates.settings?.roadWidth !== undefined &&
          updates.settings.roadWidth !== prev.settings.roadWidth);

      if (generatorInputsChanged && next.flow.fillCommitted) {
        next.flow.alignReferencePicked = false;
        next.flow.alignSelectionPicked = false;
        next.flow.alignCommittedMode = null;
        next.flow.blockFillCommitted = false;
        next.ui.activeFieldSeedId = null;
        next.ui.selectedTrackerIds = [];
        next.ui.selectedRoadId = null;
        next.ui.selectedBoundaryId = null;
        next.model.trackers = [];
        next.model.blocks = [];
        next.model.roads = [];
        next.model.skids = [];
      }

      if (
        updates.ui?.viewMode === 'tracker' &&
        prev.ui.viewMode !== 'tracker' &&
        next.ui.activeTool === 'select'
      ) {
        next.ui.activeTool = 'fill';
      }

      return next;
    });
  };

  const handleToolSelect = (tool: ToolType) => {
    handleStateChange({ ui: { activeTool: tool } });
  };

  const handleModeSelect = (mode: ViewMode) => {
    handleStateChange({ ui: { viewMode: mode } });
  };

  const resetFlow = () => {
    setState((prev) => ({
      ...prev,
      ui: {
        ...prev.ui,
        activeTool: 'fill',
        viewMode: 'tracker',
        alignMode: 'rigid',
        editSubMode: 'point',
        trimExtendMode: 'trim',
        selectionScope: 'individual',
        moveCopyMode: 'move',
        activeFieldSeedId: null,
        normalSelectionTarget: 'tracker',
        selectedTrackerIds: [],
        selectedRoadId: null,
        selectedBoundaryId: null,
      },
      flow: {
        fillCommitted: false,
        alignReferencePicked: false,
        alignSelectionPicked: false,
        alignCommittedMode: null,
        blockFillCommitted: false,
      },
      model: {
        ...prev.model,
        roads: [],
        trackers: [],
        skids: [],
        blocks: [],
      },
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

          if (state.ui.activeTool === 'fill' && state.ui.viewMode === 'tracker') {
            const patterns: DesignState['ui']['fillPattern'][] = ['aligned', 'max', 'mega'];
            const nextIndex = (patterns.indexOf(state.ui.fillPattern) + 1) % patterns.length;
            handleStateChange({ ui: { fillPattern: patterns[nextIndex] } });
            return;
          }

          if (
            state.ui.activeTool === 'align' &&
            state.ui.viewMode === 'tracker' &&
            state.flow.alignSelectionPicked
          ) {
            handleStateChange({
              ui: { alignMode: state.ui.alignMode === 'rigid' ? 'noodle' : 'rigid' },
            });
            return;
          }

          if (state.ui.activeTool === 'edit') {
            const modes: DesignState['ui']['editSubMode'][] = ['point', 'segment', 'add_remove'];
            const nextIndex = (modes.indexOf(state.ui.editSubMode) + 1) % modes.length;
            handleStateChange({ ui: { editSubMode: modes[nextIndex] } });
            return;
          }

          if (state.ui.activeTool === 'trim') {
            handleStateChange({
              ui: { trimExtendMode: state.ui.trimExtendMode === 'trim' ? 'extend' : 'trim' },
            });
            return;
          }
          break;
        }
        case 'tab': {
          event.preventDefault();
          if (state.ui.viewMode === 'normal') {
            const targets: DesignState['ui']['normalSelectionTarget'][] = [
              'tracker',
              'road',
              'boundary',
            ];
            const currentIndex = targets.indexOf(state.ui.normalSelectionTarget);
            const nextIndex = event.shiftKey
              ? (currentIndex - 1 + targets.length) % targets.length
              : (currentIndex + 1) % targets.length;
            handleStateChange({ ui: { normalSelectionTarget: targets[nextIndex] } });
            break;
          }
          const scopes: DesignState['ui']['selectionScope'][] = ['individual', 'row', 'field', 'all'];
          const currentIndex = scopes.indexOf(state.ui.selectionScope);
          const nextIndex = event.shiftKey
            ? (currentIndex - 1 + scopes.length) % scopes.length
            : (currentIndex + 1) % scopes.length;
          handleStateChange({ ui: { selectionScope: scopes[nextIndex] } });
          break;
        }
        case 'escape': {
          handleStateChange({
            ui: {
              activeTool: 'select',
              moveCopyMode: 'move',
              activeFieldSeedId: null,
              selectedTrackerIds: [],
              selectedRoadId: null,
              selectedBoundaryId: null,
            },
            flow: {
              alignReferencePicked: false,
              alignSelectionPicked: false,
            },
          });
          break;
        }
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state]);

  return (
    <div className="flex h-screen w-screen flex-col bg-slate-950 overflow-hidden font-sans text-slate-100">
      <Toolbar
        activeTool={state.ui.activeTool}
        viewMode={state.ui.viewMode}
        onSelectTool={handleToolSelect}
        onSelectMode={handleModeSelect}
      />

      <main className="flex-1 relative bg-slate-900 min-h-[50vh]">
        <div className="absolute top-3 left-3 z-10 bg-slate-900/90 backdrop-blur shadow-sm border border-slate-700 rounded-md px-3 py-2 flex flex-wrap items-center gap-3 text-xs lg:text-sm">
          <div className="font-bold text-slate-100">PVFARM</div>
          <div className="text-slate-500">/</div>
          <div className="text-slate-300 font-medium">Manual Blocks Proto</div>
          <div className="text-slate-500">/</div>
          <div className="text-slate-400">Layout Tools MVP</div>

          <div className="w-px h-4 bg-slate-600 mx-1 hidden sm:block" />

          <span className="font-mono text-cyan-300 bg-cyan-900/30 px-2 py-0.5 rounded">
            Mode: {state.ui.viewMode.toUpperCase()}
          </span>
          <span className="font-mono text-blue-300 bg-blue-900/30 px-2 py-0.5 rounded">
            Tool: {state.ui.activeTool.toUpperCase()}
          </span>
          <span className="font-mono text-emerald-300 bg-emerald-900/30 px-2 py-0.5 rounded">
            Select:{' '}
            {state.ui.viewMode === 'normal'
              ? state.ui.normalSelectionTarget.toUpperCase()
              : state.ui.selectionScope.toUpperCase()}
          </span>
        </div>

        <Canvas
          state={state}
          onTrackerCountChange={setTrackerCount}
          onFlowChange={handleStateChange}
        />

        <ToolPanel state={state} onChange={handleStateChange} />

        <div className="absolute right-4 top-16 z-20 hidden lg:block">
          <PropertiesPanel
            state={state}
            onChange={handleStateChange}
            trackerCount={trackerCount}
            onResetFlow={resetFlow}
            floating
          />
        </div>
      </main>
    </div>
  );
};

export default App;
