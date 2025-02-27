import { BuildingCost, TileType } from './types';

// Game dimensions
export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;
export const MAP_WIDTH = 20;
export const MAP_HEIGHT = 20;

// Game mechanics
export const VILLAGER_SPEED = 0.8; // Tiles per second

// Building costs
export const BUILDING_COSTS: Record<string, BuildingCost> = {
  'wall': { wood: 5, stone: 2 }
};

// Colors
export const COLORS = {
  GRASS: 0x7CFC00,
  GRASS_OUTLINE: 0x5A8F3A,
  WALL: 0x8B4513,
  WALL_DETAIL: 0x7E5E43,
  TREE_TRUNK: 0x8B4513,
  TREE_LEAVES: 0x006400,
  STONE: 0x808080,
  STONE_DETAIL: 0x707070,
  VILLAGER_BODY: 0xFFD700,
  VILLAGER_HEAD: 0xFFE0BD,
  SELECTION_RING: 0x00FF00,
  SKY: 0x87CEEB
};

// Tile properties
export const TILE_PROPERTIES = {
  [TileType.GRASS]: { walkable: true },
  [TileType.WALL]: { walkable: false },
  [TileType.TREE]: { walkable: false },
  [TileType.STONE]: { walkable: false }
};
