import * as PIXI from 'pixi.js';

export enum TileType {
  GRASS = 0,
  WALL = 1,
  TREE = 2,
  STONE = 3
}

export interface Tile {
  type: TileType;
  walkable: boolean;
  sprite: PIXI.DisplayObject | PIXI.Graphics | null;
}

export interface MapData {
  tiles: Tile[][];
}

export interface Position {
  x: number;
  y: number;
}

export interface GridPosition {
  x: number;
  y: number;
}

export interface Resources {
  wood: number;
  stone: number;
}

export interface VillagerTask {
  type: 'move' | 'build' | 'gather';
  target: GridPosition;
  callback?: () => void;
}

export interface Villager {
  sprite: PIXI.Container;
  selectionRing: PIXI.Graphics;
  x: number;
  y: number;
  pixelX: number;
  pixelY: number;
  targetX: number;
  targetY: number;
  moving: boolean;
  speed: number;
  path: GridPosition[];
  task: VillagerTask | null;
}

export interface GameState {
  resources: Resources;
  map: MapData;
  selectedVillager: Villager | null;
  villagers: Villager[];
  buildMenuVisible: boolean;
  buildMode: string | null;
  hoveredTile: GridPosition;
}

export interface BuildingCost {
  wood: number;
  stone: number;
}