// src/utils/DynamicPathfinder.ts
import { GridPosition, Villager } from '../types';
import { GameMap } from '../components/Map';
import { SubTilePathFinder } from './pathfinding';
import { PathVisualizer } from './PathVisualizer';

/**
 * DynamicPathfinder class that extends existing pathfinding with obstacle detection
 * and dynamic path recalculation
 */
export class DynamicPathfinder {
  private gameMap: GameMap;
  private subTilePathfinder: SubTilePathFinder;
  private pathVisualizer: PathVisualizer | null = null;
  
  constructor(gameMap: GameMap, pathVisualizer?: PathVisualizer) {
    this.gameMap = gameMap;
    this.subTilePathfinder = new SubTilePathFinder(gameMap);
    this.pathVisualizer = pathVisualizer || null;
  }

  /**
   * Validates if a planned path is fully walkable
   * @param path The path to validate
   * @returns True if path is valid, false if any segment is unwalkable
   */
  public validatePath(path: GridPosition[]): boolean {
    if (path.length === 0) return true;
    
    // Check each segment of the path
    for (let i = 0; i < path.length; i++) {
      const point = path[i];
      const tileX = Math.floor(point.x);
      const tileY = Math.floor(point.y);
      
      // Check if tile is walkable
      if (!this.gameMap.isTileWalkable(tileX, tileY)) {
        console.log(`Path validation failed at point (${tileX}, ${tileY})`);
        return false;
      }
      
      // For long paths, we might want to check only every few points to save performance
      if (path.length > 20 && i % 3 !== 0) continue;
      
      // If two consecutive points cross different tiles, check if the transition is valid
      if (i > 0) {
        const prevPoint = path[i-1];
        const prevTileX = Math.floor(prevPoint.x);
        const prevTileY = Math.floor(prevPoint.y);
        
        // If crossing diagonally between tiles, ensure both adjacent tiles are walkable
        if (prevTileX !== tileX && prevTileY !== tileY) {
          const diagTile1Walkable = this.gameMap.isTileWalkable(prevTileX, tileY);
          const diagTile2Walkable = this.gameMap.isTileWalkable(tileX, prevTileY);
          
          if (!diagTile1Walkable || !diagTile2Walkable) {
            console.log(`Diagonal path validation failed from (${prevTileX}, ${prevTileY}) to (${tileX}, ${tileY})`);
            return false;
          }
        }
      }
    }
    
    return true;
  }

  /**
   * Find a path from villager to target, with obstacle awareness
   * @param villager The villager to move
   * @param targetX Target X coordinate
   * @param targetY Target Y coordinate
   * @returns A valid path or empty array if no path found
   */
  public findPath(
    villager: Villager, 
    targetX: number, 
    targetY: number, 
    options: { maxRetries?: number, maxIterations?: number } = {}
  ): GridPosition[] {
    const { maxRetries = 3, maxIterations = 500 } = options;
    
    console.log(`Finding path for villager at (${villager.x}, ${villager.y}) to (${targetX}, ${targetY})`);
    
    let path: GridPosition[] = [];
    let retries = 0;
    
    // Try to find a path, with multiple attempts if necessary
    while (retries < maxRetries) {
      path = this.subTilePathfinder.findPath(
        villager.x, 
        villager.y, 
        targetX, 
        targetY, 
        { 
          maxIterations,
          diagonalMovement: true,
          preciseTarget: retries < 1 // Try precise targeting first, then allow approximate
        }
      );
      
      // Validate the path
      if (path.length > 0 && this.validatePath(path)) {
        // We found a valid path
        if (this.pathVisualizer && this.pathVisualizer.isDebugEnabled()) {
          this.pathVisualizer.visualizePath(path, 0x00FF00); // Green for valid paths
        }
        return path;
      }
      
      // If we get here, we need to retry with different parameters
      retries++;
      console.log(`Path attempt ${retries} failed, retrying...`);
      
      // Try with alternate strategies for finding a path
      if (retries === 1) {
        // On first retry, try to get closer to the target by finding nearby walkable point
        const nearestPoint = this.subTilePathfinder.findNearestAccessiblePoint(
          { x: villager.x, y: villager.y },
          { x: targetX, y: targetY }
        );
        
        if (nearestPoint) {
          console.log(`Retrying with nearest accessible point: (${nearestPoint.x}, ${nearestPoint.y})`);
          targetX = nearestPoint.x;
          targetY = nearestPoint.y;
        }
      } else if (retries === 2) {
        // On second retry, use a spiral search for a valid destination
        const alternativeTile = this.gameMap.findAlternativeWalkableTile(
          Math.floor(targetX), 
          Math.floor(targetY), 
          3
        );
        
        if (alternativeTile) {
          console.log(`Retrying with alternative tile: (${alternativeTile.x}, ${alternativeTile.y})`);
          targetX = alternativeTile.x + 0.5; // Aim for center of tile
          targetY = alternativeTile.y + 0.5;
        }
      }
    }
    
    // If we got here, we couldn't find a valid path
    console.error(`Failed to find a valid path after ${maxRetries} attempts`);
    if (this.pathVisualizer && this.pathVisualizer.isDebugEnabled()) {
      // Draw a red X at the target to show it's unreachable
      this.pathVisualizer.markPoint(targetX, targetY, 0xFF0000, 10);
    }
    
    return [];
  }

  /**
   * Check if a villager's current path is still valid or needs recalculation
   * @param villager The villager to check
   * @returns True if path needs to be recalculated
   */
  public shouldRecalculatePath(villager: Villager): boolean {
    // If not moving or no path, no need to recalculate
    if (!villager.moving || villager.path.length === 0) {
      return false;
    }
    
    // Check if the immediate next waypoint is still walkable
    const nextWaypoint = villager.path[0];
    const nextTileX = Math.floor(nextWaypoint.x);
    const nextTileY = Math.floor(nextWaypoint.y);
    
    if (!this.gameMap.isTileWalkable(nextTileX, nextTileY)) {
      console.log(`Next waypoint (${nextTileX}, ${nextTileY}) is no longer walkable, recalculating path`);
      return true;
    }
    
    // Periodically check further ahead (every 10 frames or so)
    if (Math.random() < 0.1 && villager.path.length > 3) {
      // Check a point further along the path
      const futureIndex = Math.min(3, villager.path.length - 1);
      const futureWaypoint = villager.path[futureIndex];
      const futureTileX = Math.floor(futureWaypoint.x);
      const futureTileY = Math.floor(futureWaypoint.y);
      
      if (!this.gameMap.isTileWalkable(futureTileX, futureTileY)) {
        console.log(`Future waypoint (${futureTileX}, ${futureTileY}) is no longer walkable, recalculating path`);
        return true;
      }
    }
    
    return false;
  }

  /**
   * Recalculate a villager's path if needed
   * @param villager The villager to update
   * @returns True if path was successfully recalculated
   */
  public recalculatePathIfNeeded(villager: Villager): boolean {
    if (!this.shouldRecalculatePath(villager)) {
      return false;
    }
    
    // Save the original target
    const targetX = villager.targetX;
    const targetY = villager.targetY;
    
    // Find a new path
    const newPath = this.findPath(villager, targetX, targetY);
    
    if (newPath.length > 0) {
      // Update the villager's path
      villager.path = newPath;
      console.log(`Path recalculated successfully, new path has ${newPath.length} waypoints`);
      
      // Keep the original target
      villager.targetX = targetX;
      villager.targetY = targetY;
      
      return true;
    } else {
      console.warn(`Failed to recalculate path for villager at (${villager.x}, ${villager.y})`);
      return false;
    }
  }
}
