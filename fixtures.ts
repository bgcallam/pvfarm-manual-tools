import { Parcel } from './types';

export const INITIAL_PARCELS: Parcel[] = [
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
