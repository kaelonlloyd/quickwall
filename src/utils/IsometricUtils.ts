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
  // This method now handles sub-tile precision
  public toScreen(x: number, y: number): Position {
    return {
      x: (x - y) * TILE_WIDTH / 2,
      y: (x + y) * TILE_HEIGHT / 2
    };
  }

  // Convert screen coordinates to isometric grid coordinates
  // Enhanced with higher precision for sub-tile movement
  public toIso(screenX: number, screenY: number): GridPosition {
    // Adjust coordinates relative to world container
    const adjustedX = screenX - this.worldX;
    const adjustedY = screenY - this.worldY;
    
    // Convert to tile coordinates with precise calculation
    const tileX = (adjustedX / (TILE_WIDTH / 2) + adjustedY / (TILE_HEIGHT / 2)) / 2;
    const tileY = (adjustedY / (TILE_HEIGHT / 2) - adjustedX / (TILE_WIDTH / 2)) / 2;
    
    // Log detailed conversion information (useful for debugging)
    console.log('Coordinate Conversion:', {
      screenX, 
      screenY, 
      adjustedX, 
      adjustedY, 
      calculatedTileX: tileX, 
      calculatedTileY: tileY
    });
    
    // Return precise coordinates instead of rounding
    return {
      x: tileX,
      y: tileY
    };
  }

  // Helper method to convert precise isometric coordinates to tile coordinates
  public toTile(x: number, y: number): GridPosition {
    return {
      x: Math.floor(x),
      y: Math.floor(y)
    };
  }

  // Check if a position is adjacent to the villager with sub-tile precision
  public isAdjacentToVillager(villager: Villager, x: number, y: number): boolean {
    const dx = Math.abs(villager.x - x);
    const dy = Math.abs(villager.y - y);
    
    // Allow for sub-tile proximity check with a radius approach
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= 1.2 && distance > 0.1; // Adjacent but not too close
  }

  // Get adjacent tiles with sub-tile precision options
  public getAdjacentPoints(x: number, y: number, subTilePrecision: boolean = false): GridPosition[] {
    if (!subTilePrecision) {
      // Traditional adjacent tiles (whole tile positions)
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
    } else {
      // Sub-tile precision: more points at smaller intervals
      const points: GridPosition[] = [];
      const step = 0.25; // Sub-tile step size
      
      // Generate a grid of points around the center position
      for (let dx = -1; dx <= 1; dx += step) {
        for (let dy = -1; dy <= 1; dy += step) {
          // Skip the center point
          if (dx === 0 && dy === 0) continue;
          
          points.push({ x: x + dx, y: y + dy });
        }
      }
      
      return points;
    }
  }
  
  // Calculate distance between two points
  public distance(a: GridPosition, b: GridPosition): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  // Debug method to visualize the conversion process
  public debugCoordinateConversion(screenX: number, screenY: number): void {
    console.log('Coordinate Conversion Debug:');
    console.log('World Container Position:', { x: this.worldX, y: this.worldY });
    console.log('Screen Coordinates:', { screenX, screenY });
    
    const adjustedX = screenX - this.worldX;
    const adjustedY = screenY - this.worldY;
    
    console.log('Adjusted Coordinates:', { adjustedX, adjustedY });
    
    const tileX = (adjustedX / (TILE_WIDTH / 2) + adjustedY / (TILE_HEIGHT / 2)) / 2;
    const tileY = (adjustedY / (TILE_HEIGHT / 2) - adjustedX / (TILE_WIDTH / 2)) / 2;
    
    console.log('Calculated Precise Coordinates:', { tileX, tileY });
    console.log('Rounded Tile Coordinates:', { 
      x: Math.floor(tileX), 
      y: Math.floor(tileY) 
    });
    
    console.log('In-Tile Position:', {
      x: tileX - Math.floor(tileX),
      y: tileY - Math.floor(tileY)
    });
  }


  /**
 * Convert screen coordinates to precise isometric coordinates without rounding
 * This maintains sub-tile precision for more accurate positioning
 * @param screenX Screen X coordinate
 * @param screenY Screen Y coordinate
 * @returns Precise isometric position
 */
public getPrecisePositionFromScreen(screenX: number, screenY: number): GridPosition {
  // Adjust coordinates relative to world container
  const adjustedX = screenX - this.worldX;
  const adjustedY = screenY - this.worldY;
  
  // Convert to isometric coordinates with precise calculation
  const tileX = (adjustedX / (TILE_WIDTH / 2) + adjustedY / (TILE_HEIGHT / 2)) / 2;
  const tileY = (adjustedY / (TILE_HEIGHT / 2) - adjustedX / (TILE_WIDTH / 2)) / 2;
  
  // Return precise coordinates without rounding
  return {
    x: tileX,
    y: tileY
  };
}

}