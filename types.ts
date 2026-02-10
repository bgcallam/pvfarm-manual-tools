export interface Point {
  x: number;
  y: number;
}

export type Polygon = Point[];

export type Orientation = 'portrait' | 'landscape';
export type AssignmentState = 'unassigned' | 'assigned';
export type StringCount = 1 | 2 | 3;

export interface Tracker {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  parcelId: string;
  stringCount: StringCount;
  stringSize: number;
  orientation: Orientation;
  blockId: string | null;
  rowIndex: number | null;
  assignmentState: AssignmentState;
}

export interface Parcel {
  id: string;
  points: Polygon;
  exclusions?: Polygon[];
  isWorking: boolean;
}

export interface Road {
  id: string;
  points: Point[];
  width: number;
}

export interface Skid {
  id: string;
  center: Point;
  size: number;
  capacityKw: number;
  blockId: string | null;
}

export interface Block {
  id: string;
  color: string;
  trackerIds: string[];
  skidId: string | null;
  boundary: Polygon;
  ilr: number;
  dcPowerKw: number;
}

export type ViewMode = 'normal' | 'tracker' | 'block';
export type ToolType = 'select' | 'fill' | 'edit' | 'align' | 'trim' | 'assignment';
export type FillPattern = 'mega' | 'max' | 'aligned';
export type AlignMode = 'rigid' | 'noodle';
export type EditSubMode = 'point' | 'segment' | 'add_remove';
export type TrimExtendMode = 'trim' | 'extend';
export type SelectionScope = 'individual' | 'row' | 'field' | 'all';
export type MoveCopyMode = 'move' | 'copy' | 'array';

export interface UIState {
  viewMode: ViewMode;
  activeTool: ToolType;
  showBlocks: boolean;
  fillPattern: FillPattern;
  alignMode: AlignMode;
  editSubMode: EditSubMode;
  trimExtendMode: TrimExtendMode;
  selectionScope: SelectionScope;
  moveCopyMode: MoveCopyMode;
  activeFieldSeedId: string | null;
  osnapEnabled: boolean;
  smartGuidesEnabled: boolean;
  adaptiveRoadEditing: boolean;
}

export interface FlowState {
  fillCommitted: boolean;
  alignReferencePicked: boolean;
  alignSelectionPicked: boolean;
  alignCommittedMode: AlignMode | null;
  blockFillCommitted: boolean;
}

export interface LayoutSettings {
  rowToRow: number;
  arrayOffset: number;
  roadWidth: number;
  roadStepDistance: number;
  roadClearDistance: number;
  boundarySetback: number;
  blockHeight: number;
  blockWidth: number;
  gapTolerance: number;
  blockOffset: number;
  ilrRange: [number, number];
  objectRemovesUnderlying: boolean;
}

export interface SiteModel {
  parcels: Parcel[];
  roads: Road[];
  trackers: Tracker[];
  skids: Skid[];
  blocks: Block[];
}

export interface DesignState {
  ui: UIState;
  flow: FlowState;
  settings: LayoutSettings;
  model: SiteModel;
}

export interface AppConfig {
  pixelsPerMeter: number;
}
