// src/utils/CoordinateTransformer.ts
import { TILE_WIDTH, TILE_HEIGHT } from '../constants';
import { GridPosition, Position } from '../types';

/**
 * Rendering modes supported by the game
 */
export enum RenderingMode {
  ISOMETRIC = 'isometric',
  ORTHOGONAL = 'orthogonal'
}

/**
 * A unified coordinate transformer that can switch between different rendering modes
 */
export class CoordinateTransformer {
  private worldX: number;
  private worldY: number;
  private renderingMode: RenderingMode;

  constructor(worldX: number, worldY: number, initialMode: RenderingMode = RenderingMode.ISOMETRIC) {
    this.worldX = worldX;
    this.worldY = worldY;
    this.renderingMode = initialMode;
  }

  /**
   * Update the world container position
   */
  public updateWorldPosition(x: number, y: number): void {
    this.worldX = x;
    this.worldY = y;
  }

  /**
   * Set the rendering mode (isometric or orthogonal)
   */
  public setRenderingMode(mode: RenderingMode): void {
    console.log(`Switching rendering mode from ${this.renderingMode} to ${mode}`);
    this.renderingMode = mode;
  }

  /**
   * Get the current rendering mode
   */
  public getRenderingMode(): RenderingMode {
    return this.renderingMode;
  }

  /**
   * Convert grid coordinates to screen coordinates based on current rendering mode
   */
  public toScreen(x: number, y: number): Position {
    if (this.renderingMode === RenderingMode.ISOMETRIC) {
      return this.toIsometricScreen(x, y);
    } else {
      return this.toOrthogonalScreen(x, y);
    }
  }

  /**
   * Convert screen coordinates to grid coordinates based on current rendering mode
   */
  public toGrid(screenX: number, screenY: number): GridPosition {
    if (this.renderingMode === RenderingMode.ISOMETRIC) {
      return this.toIsometricGrid(screenX, screenY);
    } else {
      return this.toOrthogonalGrid(screenX, screenY);
    }
  }

  /**
   * Get precise position from screen coordinates
   */
  public getPrecisePositionFromScreen(screenX: number, screenY: number): GridPosition {
    if (this.renderingMode === RenderingMode.ISOMETRIC) {
      return this.toIsometricGrid(screenX, screenY);
    } else {
      return this.toOrthogonalGrid(screenX, screenY);
    }
  }

  /**
   * Helper to convert to tile coordinates
   */
  public toTile(x: number, y: number): GridPosition {
    return {
      x: Math.floor(x),
      y: Math.floor(y)
    };
  }

  /**
   * Calculate distance between two points
   */
  public distance(a: GridPosition, b: GridPosition): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Private implementation methods

  /**
   * Convert grid coordinates to isometric screen coordinates
   */
  private toIsometricScreen(x: number, y: number): Position {
    return {
      x: (x - y) * TILE_WIDTH / 2,
      y: (x + y) * TILE_HEIGHT / 2
    };
  }

  /**
   * Convert screen coordinates to isometric grid coordinates
   */
  private toIsometricGrid(screenX: number, screenY: number): GridPosition {
    // Adjust coordinates relative to world container
    const adjustedX = screenX - this.worldX;
    const adjustedY = screenY - this.worldY;
    
    // Convert to tile coordinates with precise calculation
    const tileX = (adjustedX / (TILE_WIDTH / 2) + adjustedY / (TILE_HEIGHT / 2)) / 2;
    const tileY = (adjustedY / (TILE_HEIGHT / 2) - adjustedX / (TILE_WIDTH / 2)) / 2;
    
    return {
      x: tileX,
      y: tileY
    };
  }

  /**
   * Convert grid coordinates to orthogonal screen coordinates
   */
  private toOrthogonalScreen(x: number, y: number): Position {
    return {
      x: x * TILE_WIDTH,
      y: y * TILE_HEIGHT
    };
  }

  /**
   * Convert screen coordinates to orthogonal grid coordinates
   */
  private toOrthogonalGrid(screenX: number, screenY: number): GridPosition {
    // Adjust coordinates relative to world container
    const adjustedX = screenX - this.worldX;
    const adjustedY = screenY - this.worldY;
    
    // Convert to grid coordinates
    const gridX = adjustedX / TILE_WIDTH;
    const gridY = adjustedY / TILE_HEIGHT;
    
    return {
      x: gridX,
      y: gridY
    };
  }
}
