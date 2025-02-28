import * as PIXI from 'pixi.js';
import { VillagerStateMachine } from './components/Villager'; // Adjust import path as needed


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
  type: 'wall' | 'gather' | 'move';
  foundation?: {
    x: number;
    y: number;
    health: number;
    maxHealth: number;
  };
  buildPosition?: GridPosition;
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


export interface VillagerAnimation {
  active: boolean;
  update: () => void;
}

// Then modify the Villager interface to use this type
export interface Villager {
  sprite: PIXI.Container;
  selectionRing: PIXI.Graphics;
  selectionFlag?: PIXI.Graphics | null;
  selectionAnimation?: VillagerAnimation | null; // Updated type
  healthBar?: PIXI.Graphics;
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
  currentBuildTask: BuildTask | null;
  health: number;
  maxHealth?: number;
  stateMachine: VillagerStateMachine;
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