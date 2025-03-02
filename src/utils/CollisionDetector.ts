// src/utils/CollisionDetector.ts
import * as PIXI from 'pixi.js';
import { GameMap } from '../components/Map';
import { Villager, GridPosition } from '../types';
import { IsometricUtils } from './IsometricUtils';
import { TILE_WIDTH, TILE_HEIGHT } from '../constants';

/**
 * A utility class to detect and visualize collisions between villagers and unwalkable tiles
 */
export class CollisionDetector {
  private gameMap: GameMap;
  private isoUtils: IsometricUtils;
  private visualizationContainer: PIXI.Container;
  private collisionMarkers: Map<string, PIXI.Graphics> = new Map();
  private isEnabled: boolean = false;
  private visualizationTimeout: number = 2000; // How long to show collision markers (ms)
  
  constructor(gameMap: GameMap, isoUtils: IsometricUtils, container: PIXI.Container) {
    this.gameMap = gameMap;
    this.isoUtils = isoUtils;
    this.visualizationContainer = container;
  }
  
  /**
   * Toggle collision detection visualization
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    
    // Clear all visualizations when disabled
    if (!enabled) {
      this.clearAllVisualizations();
    }
  }
  
  /**
   * Check if a villager is currently on an unwalkable tile
   * @returns true if a collision is detected
   */
  public checkVillagerCollision(villager: Villager): boolean {
    if (!this.isEnabled) return false;
    
    const tileX = Math.floor(villager.x);
    const tileY = Math.floor(villager.y);
    
    // Check if the tile is walkable
    const isWalkable = this.gameMap.isTileWalkable(tileX, tileY);
    
    if (!isWalkable) {
      // Collision detected! Visualize it
      this.visualizeCollision(villager, tileX, tileY);
      return true;
    }
    
    return false;
  }
  
  /**
   * Check if a path segment crosses any unwalkable tiles
   */
  public checkPathSegment(start: GridPosition, end: GridPosition): boolean {
    if (!this.isEnabled) return false;
    
    // Quick check of endpoints
    if (!this.gameMap.isTileWalkable(Math.floor(start.x), Math.floor(start.y)) ||
        !this.gameMap.isTileWalkable(Math.floor(end.x), Math.floor(end.y))) {
      this.visualizePathCollision(start, end);
      return true;
    }
    
    // For diagonal movements between tiles, check if it's valid
    if (Math.floor(start.x) !== Math.floor(end.x) && 
        Math.floor(start.y) !== Math.floor(end.y)) {
      
      // Check if we can move diagonally through this corner
      const isMovementValid = this.gameMap.isMovementValid(
        start.x, start.y, end.x, end.y
      );
      
      if (!isMovementValid) {
        this.visualizePathCollision(start, end);
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Visualize a collision at a specific tile
   */
  private visualizeCollision(villager: Villager, tileX: number, tileY: number): void {
    const markerId = `collision_${villager.x.toFixed(2)}_${villager.y.toFixed(2)}`;
    
    // Check if we already have a marker for this collision
    if (this.collisionMarkers.has(markerId)) {
      return;
    }
    
    // Create a visual marker for the collision
    const marker = new PIXI.Graphics();
    
    // Convert to screen coordinates
    const pos = this.isoUtils.toScreen(tileX, tileY);
    
    // Draw a red X over the tile
    marker.lineStyle(3, 0xFF0000, 0.8);
    
    // First diagonal line
    marker.moveTo(pos.x, pos.y);
    marker.lineTo(pos.x + TILE_WIDTH, pos.y + TILE_HEIGHT);
    
    // Second diagonal line
    marker.moveTo(pos.x + TILE_WIDTH, pos.y);
    marker.lineTo(pos.x, pos.y + TILE_HEIGHT);
    
    // Add a text label
    const label = new PIXI.Text('COLLISION!', {
      fontFamily: 'Arial',
      fontSize: 12,
      fill: 0xFF0000,
      stroke: 0x000000,
      strokeThickness: 3
    });
    
    label.x = pos.x + TILE_WIDTH / 2;
    label.y = pos.y;
    label.anchor.set(0.5, 0);
    
    marker.addChild(label);
    
    // Add to container
    this.visualizationContainer.addChild(marker);
    this.collisionMarkers.set(markerId, marker);
    
    // Remove after timeout
    setTimeout(() => {
      if (this.collisionMarkers.has(markerId)) {
        const marker = this.collisionMarkers.get(markerId);
        if (marker) {
          this.visualizationContainer.removeChild(marker);
          marker.destroy();
          this.collisionMarkers.delete(markerId);
        }
      }
    }, this.visualizationTimeout);
  }
  
  /**
   * Visualize a collision on a path segment
   */
  private visualizePathCollision(start: GridPosition, end: GridPosition): void {
    const markerId = `path_${start.x.toFixed(2)}_${start.y.toFixed(2)}_${end.x.toFixed(2)}_${end.y.toFixed(2)}`;
    
    // Check if we already have a marker for this collision
    if (this.collisionMarkers.has(markerId)) {
      return;
    }
    
    // Create a visual marker for the collision
    const marker = new PIXI.Graphics();
    
    // Convert to screen coordinates
    const startPos = this.isoUtils.toScreen(start.x, start.y);
    const endPos = this.isoUtils.toScreen(end.x, end.y);
    
    // Draw a red line showing the blocked path
    marker.lineStyle(3, 0xFF0000, 0.8);
    marker.moveTo(startPos.x, startPos.y);
    marker.lineTo(endPos.x, endPos.y);
    
    // Add a warning symbol at midpoint
    const midX = (startPos.x + endPos.x) / 2;
    const midY = (startPos.y + endPos.y) / 2;
    
    marker.beginFill(0xFF0000, 0.7);
    marker.drawCircle(midX, midY, 8);
    marker.endFill();
    
    marker.lineStyle(2, 0xFFFFFF, 1);
    marker.moveTo(midX, midY - 3);
    marker.lineTo(midX, midY - 1);
    marker.moveTo(midX, midY + 1);
    marker.lineTo(midX, midY + 3);
    
    // Add to container
    this.visualizationContainer.addChild(marker);
    this.collisionMarkers.set(markerId, marker);
    
    // Remove after timeout
    setTimeout(() => {
      if (this.collisionMarkers.has(markerId)) {
        const marker = this.collisionMarkers.get(markerId);
        if (marker) {
          this.visualizationContainer.removeChild(marker);
          marker.destroy();
          this.collisionMarkers.delete(markerId);
        }
      }
    }, this.visualizationTimeout);
  }
  
  /**
   * Clear all collision visualizations
   */
  public clearAllVisualizations(): void {
    this.collisionMarkers.forEach((marker, id) => {
      this.visualizationContainer.removeChild(marker);
      marker.destroy();
    });
    
    this.collisionMarkers.clear();
  }
}
