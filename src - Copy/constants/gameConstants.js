// Game configuration constants
export const GRID_SIZE = 15;
export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;
export const WALL_COST = 2;

// Movement and collision constants
export const VILLAGER_SPEED = 0.8; // tiles per second
export const BUILD_SPEED = 40; // percent per second
export const VILLAGER_COLLISION_SIZE = 0.2;
export const VILLAGER_VISUAL_SIZE = 0.3;
export const ENEMY_COLLISION_SIZE = 0.3;
export const ENEMY_VISUAL_SIZE = 0.4;

// Difficulty settings
export const DIFFICULTY_SETTINGS = {
  easy: {
    spawnRate: 3000, // ms
    enemySpeed: 0.4
  },
  medium: {
    spawnRate: 2000,
    enemySpeed: 0.6
  },
  hard: {
    spawnRate: 1000,
    enemySpeed: 0.8
  }
};

// Colors
export const COLORS = {
  TILE_LIGHT: 0x5CAD2F,
  TILE_DARK: 0x3E8E21,
  TILE_SELECTED: 0x7AD4FF,
  TILE_BUILDABLE: 0xD4AF37,
  TILE_TARGET: 0x7BB8FF,
  WALL_TOP: 0xCD9F3F,
  WALL_LEFT: 0x8B6914,
  WALL_RIGHT: 0xAB8322,
  FOUNDATION_OUTLINE: 0xFFD700,
  FOUNDATION_FILL: 0xD4AF37,
  VILLAGER_BODY: 0x2E63BB,
  VILLAGER_HEAD: 0xFFE5B4,
  ENEMY_BODY: 0xB22222,
  ENEMY_HEAD: 0x1A1A1A
};

// Game state
export const INITIAL_GAME_TIME = 60; // seconds
export const INITIAL_WOOD = 200;
export const INITIAL_VILLAGER_POSITION = { x: 7, y: 7 };

// UI Settings
export const FONT_FAMILY = 'Arial';
export const UI_SCALE = 1;
