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
  public toIso(x: number, y: number): GridPosition {
    // Adjust coordinates relative to world container
    x -= this.worldX;
    y -= this.worldY;
    
    // Convert to tile coordinates
    const tileX = (x / (TILE_WIDTH / 2) + y / (TILE_HEIGHT / 2)) / 2;
    const tileY = (y / (TILE_HEIGHT / 2) - x / (TILE_WIDTH / 2)) / 2;
    
    return {
      x: Math.floor(tileX),
      y: Math.floor(tileY)
    };
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
