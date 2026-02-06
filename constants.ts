import { Parcel, AppConfig, Point } from './types';

export const CONFIG: AppConfig = {
  pixelsPerMeter: 2,
};

export const CANVAS_VIEWBOX = {
  width: 1000,
  height: 800,
};

export const PARCELS: Parcel[] = [
  {
    id: 'parcel-left',
    isWorking: true,
    points: [
      { x: 180, y: 170 },
      { x: 250, y: 120 },
      { x: 340, y: 152 },
      { x: 430, y: 112 },
      { x: 540, y: 190 },
      { x: 590, y: 660 },
      { x: 110, y: 645 },
    ],
  },
  {
    id: 'parcel-right',
    isWorking: false,
    points: [
      { x: 650, y: 240 },
      { x: 860, y: 280 },
      { x: 810, y: 560 },
      { x: 675, y: 590 },
    ],
  },
];

export const NORTH_REFERENCE_POINTS: Point[] = [
  { x: 180, y: 170 },
  { x: 250, y: 120 },
  { x: 340, y: 152 },
  { x: 430, y: 112 },
  { x: 540, y: 190 },
];

export const BLOCK_COLORS = [
  'rgba(56, 189, 248, 0.45)',
  'rgba(251, 146, 60, 0.45)',
  'rgba(74, 222, 128, 0.45)',
  'rgba(192, 132, 252, 0.45)',
  'rgba(250, 204, 21, 0.45)',
];

export const BLOCK_ILR_VALUES = ['1.31', '1.34', '1.29', '1.33', '1.30'];

export const TRACKER_SIZE_PX = {
  width: 8,
  height: 36,
};

export const TRACKER_BORDER_SETBACK_PX = 10;
