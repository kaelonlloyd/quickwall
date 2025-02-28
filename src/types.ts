import * as PIXI from 'pixi.js';

export enum TileType {
  GRASS = 0,
  WALL = 1,
  TREE = 2,
  STONE = 3,
  RUBBLE = 4
}

export interface GridPosition {
  x: number;
  y: number;
}

export interface WallFoundationData {
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  assignedVillagers: any[];
  isBuilding: boolean;
  buildProgress: number;
  status: 'foundation' | 'building' | 'complete';
}

export interface BuildTask {
  type: 'wall';
  foundation: WallFoundationData;
  buildPosition?: GridPosition; // Position where villager should stand to build
}

export interface Tile {
  type: TileType;
  walkable: boolean;
  sprite: PIXI.Container | null; // More specific type that works with removeChild
}

export interface MapData {
  tiles: Tile[][];
}

export interface Position {
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
  selectionFlag: PIXI.Graphics | null;
  selectionAnimation: any;
  healthBar: PIXI.Graphics;
  health: number;
  maxHealth: number;
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
  currentBuildTask?: BuildTask;
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