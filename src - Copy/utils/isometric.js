import { TILE_WIDTH, TILE_HEIGHT, GRID_SIZE } from '../constants/gameConstants';

/**
 * Converts grid coordinates to screen coordinates in isometric view
 * @param {number} x - Grid x coordinate
 * @param {number} y - Grid y coordinate
 * @param {number} offsetX - Screen x offset
 * @param {number} offsetY - Screen y offset
 * @returns {Object} Screen coordinates {x, y}
 */
export const gridToScreen = (x, y, offsetX = 0, offsetY = 0) => {
  return {
    x: (x - y) * (TILE_WIDTH / 2) + offsetX,
    y: (x + y) * (TILE_HEIGHT / 2) + offsetY
  };
};

/**
 * Converts screen coordinates to grid coordinates
 * @param {number} screenX - Screen x coordinate
 * @param {number} screenY - Screen y coordinate
 * @param {number} offsetX - Screen x offset
 * @param {number} offsetY - Screen y offset
 * @returns {Object} Grid coordinates {x, y}
 */
export const screenToGrid = (screenX, screenY, offsetX = 0, offsetY = 0) => {
  // Adjust for offset
  const adjustedX = screenX - offsetX;
  const adjustedY = screenY - offsetY;
  
  // Convert to grid coordinates
  const x = Math.floor((adjustedX / (TILE_WIDTH / 2) + adjustedY / (TILE_HEIGHT / 2)) / 2);
  const y = Math.floor((adjustedY / (TILE_HEIGHT / 2) - adjustedX / (TILE_WIDTH / 2)) / 2);
  
  return { x, y };
};

/**
 * Calculates the world dimensions based on grid size
 * @returns {Object} World dimensions {width, height}
 */
export const calculateWorldDimensions = () => {
  // Adding extra space around the grid
  const width = (GRID_SIZE + 1) * TILE_WIDTH;
  const height = (GRID_SIZE + 1) * TILE_HEIGHT;
  return { width, height };
};

/**
 * Calculates the center offset for the isometric grid
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 * @returns {Object} Center offset {x, y}
 */
export const calculateCenterOffset = (canvasWidth, canvasHeight) => {
  return {
    x: canvasWidth / 2,
    y: TILE_HEIGHT * 2 // Give some space at the top
  };
};

/**
 * Checks if two grid positions are adjacent (including diagonals)
 * @param {number} x1 - First position x
 * @param {number} y1 - First position y
 * @param {number} x2 - Second position x
 * @param {number} y2 - Second position y
 * @returns {boolean} True if positions are adjacent
 */
export const isAdjacent = (x1, y1, x2, y2) => {
  return Math.abs(x1 - x2) <= 1 && Math.abs(y1 - y2) <= 1 && !(x1 === x2 && y1 === y2);
};

/**
 * Checks if position is within the grid
 * @param {number} x - Grid x coordinate
 * @param {number} y - Grid y coordinate
 * @returns {boolean} True if position is within grid
 */
export const isWithinGrid = (x, y) => {
  return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE;
};

/**
 * Draw an isometric diamond shape
 * @param {PIXI.Graphics} graphics - PIXI Graphics object to draw on
 * @param {number} x - Center x coordinate
 * @param {number} y - Center y coordinate
 * @param {number} width - Width of diamond
 * @param {number} height - Height of diamond
 */
export const drawIsoDiamond = (graphics, x, y, width, height) => {
  graphics.moveTo(x, y - height / 2);           // Top
  graphics.lineTo(x + width / 2, y);            // Right
  graphics.lineTo(x, y + height / 2);           // Bottom
  graphics.lineTo(x - width / 2, y);            // Left
  graphics.lineTo(x, y - height / 2);           // Back to top
};

/**
 * Draw an isometric cube
 * @param {PIXI.Graphics} graphics - PIXI Graphics object to draw on
 * @param {number} x - Base center x coordinate
 * @param {number} y - Base center y coordinate
 * @param {number} width - Width of cube base
 * @param {number} height - Height of cube base
 * @param {number} depth - Depth/height of cube
 * @param {number} topColor - Color for top face
 * @param {number} leftColor - Color for left face
 * @param {number} rightColor - Color for right face
 */
export const drawIsoCube = (graphics, x, y, width, height, depth, topColor, leftColor, rightColor) => {
  // Top face
  graphics.beginFill(topColor);
  drawIsoDiamond(graphics, x, y - depth, width, height);
  graphics.endFill();
  
  // Left face
  graphics.beginFill(leftColor);
  graphics.moveTo(x - width / 2, y);            // Left point of base
  graphics.lineTo(x, y + height / 2);           // Bottom point of base
  graphics.lineTo(x, y + height / 2 - depth);   // Bottom point of top face
  graphics.lineTo(x - width / 2, y - depth);    // Left point of top face
  graphics.endFill();
  
  // Right face
  graphics.beginFill(rightColor);
  graphics.moveTo(x + width / 2, y);            // Right point of base
  graphics.lineTo(x, y + height / 2);           // Bottom point of base
  graphics.lineTo(x, y + height / 2 - depth);   // Bottom point of top face
  graphics.lineTo(x + width / 2, y - depth);    // Right point of top face
  graphics.endFill();
};
