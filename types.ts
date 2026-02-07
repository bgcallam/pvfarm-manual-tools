export interface Point {
  x: number;
  y: number;
}

export type Polygon = Point[];

export interface Tracker {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  parcelId: string;
}

export interface Parcel {
  id: string;
  points: Polygon;
  isWorking: boolean;
}

export interface Block {
  id: string;
  label: string;
  color: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  ilr: string;
}

export interface RoadGeometry {
  x1: number;
  x2: number;
  y: number;
  width: number;
}

export type ViewMode = 'normal' | 'tracker' | 'block';
export type ToolType = 'select' | 'fill' | 'edit' | 'align' | 'trim';
export type FillPattern = 'mega' | 'max' | 'aligned';
export type AlignMode = 'rigid' | 'noodle';
export type EditSubMode = 'point' | 'segment' | 'add_remove';
export type TrimExtendMode = 'trim' | 'extend';
export type SelectionScope = 'individual' | 'row' | 'field' | 'all';
export type MoveCopyMode = 'move' | 'copy' | 'array';

export interface DesignState {
  viewMode: ViewMode;
  activeTool: ToolType;
  rowSpacing: number;
  roadWidth: number;
  showBlocks: boolean;
  fillPattern: FillPattern;
  alignMode: AlignMode;
  fillCommitted: boolean;
  alignReferencePicked: boolean;
  alignSelectionPicked: boolean;
  alignCommittedMode: AlignMode | null;
  blockFillCommitted: boolean;
  editSubMode: EditSubMode;
  trimExtendMode: TrimExtendMode;
  selectionScope: SelectionScope;
  moveCopyMode: MoveCopyMode;
  activeFieldSeedId: string | null;
  osnapEnabled: boolean;
  smartGuidesEnabled: boolean;
  adaptiveRoadEditing: boolean;
  equipmentRemovesTrackers: boolean;
  blockHeight: number;
  roadStepDistance: number;
  editOps: number;
  trimOps: number;
  extendOps: number;
}

export interface AppConfig {
  pixelsPerMeter: number;
}
