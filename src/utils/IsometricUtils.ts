import { TILE_WIDTH, TILE_HEIGHT } from '../constants';
import { GridPosition, Position, Villager } from '../types';

export class IsometricUtils {
  private worldX: number;
  private worldY: number;

  constructor(worldX: number, worldY: number) {
    this.worldX = worldX;
    this.worldY = worldY;
  }

  public updateWorldPosition(x: number, y: number): void {
    this.worldX = x;
    this.worldY = y;
  }

  // Convert isometric coordinates to screen coordinates
  public toScreen(x: number, y: number): Position {
    return {
      x: (x - y) * TILE_WIDTH / 2,
      y: (x + y) * TILE_HEIGHT / 2
    };
  }

  // Convert screen coordinates to isometric grid coordinates
// Convert screen coordinates to isometric grid coordinates
public toIso(screenX: number, screenY: number): GridPosition {
  // Detailed logging for coordinate conversion
  console.log('Conversion Inputs:', {
    screenX, 
    screenY, 
    worldX: this.worldX, 
    worldY: this.worldY
  });

  // Adjust coordinates relative to world container
  const adjustedX = screenX - this.worldX;
  const adjustedY = screenY - this.worldY;
  
  // Convert to tile coordinates using more precise calculation
  const tileX = (adjustedX / (TILE_WIDTH / 2) + adjustedY / (TILE_HEIGHT / 2)) / 2;
  const tileY = (adjustedY / (TILE_HEIGHT / 2) - adjustedX / (TILE_WIDTH / 2)) / 2;
  
  // Detailed logging of intermediate calculations
  console.log('Conversion Calculations:', {
    adjustedX, 
    adjustedY, 
    calculatedTileX: tileX, 
    calculatedTileY: tileY
  });

  // Round to nearest whole number
  const result = {
    x: Math.round(tileX),
    y: Math.round(tileY)
  };

  console.log('Conversion Result:', result);
  return result;
}

// New method to help debug coordinate translation
public debugCoordinateConversion(screenX: number, screenY: number): void {
  console.log('Coordinate Conversion Debug:');
  console.log('World Container Position:', { x: this.worldX, y: this.worldY });
  console.log('Screen Coordinates:', { screenX, screenY });
  
  const adjustedX = screenX - this.worldX;
  const adjustedY = screenY - this.worldY;
  
  console.log('Adjusted Coordinates:', { adjustedX, adjustedY });
  
  const tileX = (adjustedX / (TILE_WIDTH / 2) + adjustedY / (TILE_HEIGHT / 2)) / 2;
  const tileY = (adjustedY / (TILE_HEIGHT / 2) - adjustedX / (TILE_WIDTH / 2)) / 2;
  
  console.log('Calculated Tile Coordinates:', { tileX, tileY });
  console.log('Rounded Tile Coordinates:', { 
    x: Math.round(tileX), 
    y: Math.round(tileY) 
  });
}

  // Check if a position is adjacent to the villager
  public isAdjacentToVillager(villager: Villager, x: number, y: number): boolean {
    const dx = Math.abs(Math.floor(villager.x) - x);
    const dy = Math.abs(Math.floor(villager.y) - y);
    return (dx <= 1 && dy <= 1) && !(dx === 0 && dy === 0);
  }

  // Get adjacent tiles (for pathfinding and building placement)
  public getAdjacentTiles(x: number, y: number): GridPosition[] {
    return [
      { x: x - 1, y: y },     // Left
      { x: x + 1, y: y },     // Right
      { x: x, y: y - 1 },     // Top
      { x: x, y: y + 1 },     // Bottom
      { x: x - 1, y: y - 1 }, // Top-Left
      { x: x + 1, y: y - 1 }, // Top-Right
      { x: x - 1, y: y + 1 }, // Bottom-Left
      { x: x + 1, y: y + 1 }  // Bottom-Right
    ];
  }
}