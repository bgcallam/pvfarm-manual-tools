import React from 'react';
import {
  MousePointer2,
  PaintBucket,
  Edit2,
  AlignLeft,
  Scissors,
  Grid,
  Box,
  LayoutTemplate,
} from 'lucide-react';
import { ToolType, ViewMode } from '../types';

interface ToolbarProps {
  activeTool: ToolType;
  viewMode: ViewMode;
  onSelectTool: (tool: ToolType) => void;
  onSelectMode: (mode: ViewMode) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ activeTool, viewMode, onSelectTool, onSelectMode }) => {
  const modes: { id: ViewMode; label: string; shortcut: string; icon: React.ReactNode }[] = [
    { id: 'normal', label: 'Normal', shortcut: 'N', icon: <LayoutTemplate size={17} /> },
    { id: 'tracker', label: 'Tracker', shortcut: 'T', icon: <Grid size={17} /> },
    { id: 'block', label: 'Block', shortcut: 'B', icon: <Box size={17} /> },
  ];

  const tools: { id: ToolType; icon: React.ReactNode; label: string }[] = [
    { id: 'select', icon: <MousePointer2 size={18} />, label: 'Select' },
    { id: 'fill', icon: <PaintBucket size={18} />, label: 'Fill' },
    { id: 'edit', icon: <Edit2 size={18} />, label: 'Edit' },
    { id: 'align', icon: <AlignLeft size={18} />, label: 'Align' },
    { id: 'trim', icon: <Scissors size={18} />, label: 'Trim/Extend' },
  ];

  return (
    <div className="w-full bg-slate-950 border-b border-slate-800 flex items-center justify-between px-4 py-2 gap-4 z-20">
      <div className="flex flex-row gap-2">
        {modes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => onSelectMode(mode.id)}
            className={`
              w-10 h-10 rounded-lg flex flex-col items-center justify-center transition-all duration-150
              ${
                viewMode === mode.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 ring-1 ring-blue-400'
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }
            `}
            title={`${mode.label} Mode (${mode.shortcut})`}
          >
            {mode.icon}
            <span className="text-[9px] font-bold leading-none mt-0.5">{mode.shortcut}</span>
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-x-auto">
        <div className="flex flex-row gap-2 min-w-max">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => onSelectTool(tool.id)}
              className={`
                px-2 w-12 h-10 rounded-xl transition-all duration-150 group relative flex items-center justify-center
                ${
                  activeTool === tool.id
                    ? 'bg-slate-800 text-blue-300 shadow-inner'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }
              `}
              title={tool.label}
            >
              {tool.icon}

              {activeTool === tool.id && (
                <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-blue-400 rounded-r-full" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
