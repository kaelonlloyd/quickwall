// src/components/Map.ts - Fully decoupled rendering from logic
import { MAP_HEIGHT, MAP_WIDTH, TILE_PROPERTIES } from '../constants';
import { GridPosition, MapData, Tile, TileType, Villager} from '../types';
import { WallManager, WallFoundation } from './WallManager';
import { VillagerManager } from './Villager';
import { BuildingState } from './BuildingStateMachine';

/**
 * GameMap class - Pure logic, no rendering
 * Handles the game map's logical state including tiles, walkability, and path finding
 */
export class GameMap {
  private mapData: MapData;
  private villagerManager: VillagerManager | null = null;
  public wallManager: WallManager | null = null;
  private groundLayerTiles: any[] = [];

  constructor() {
    this.mapData = { tiles: [] };
  }
  
  // Setter methods for dependencies
  public setVillagerManager(villagerManager: VillagerManager): void {
    this.villagerManager = villagerManager;
  }
  
  public setWallManager(wallManager: WallManager): void {
    this.wallManager = wallManager;
    console.log("WallManager set in GameMap");
  }
  
  // Helper methods to safely access managers
  private ensureVillagerManager(): VillagerManager {
    if (!this.villagerManager) {
      throw new Error('VillagerManager not initialized in GameMap');
    }
    return this.villagerManager;
  }
  
  private ensureWallManager(): WallManager {
    if (!this.wallManager) {
      throw new Error('WallManager not initialized in GameMap');
    }
    return this.wallManager;
  }
  
  /**
   * Initialize the map with tiles
   */
  public initMap(): void {
    // Initialize map grid
    const tiles: Tile[][] = [];
    
    for (let y = 0; y < MAP_HEIGHT; y++) {
      tiles[y] = [];
      for (let x = 0; x < MAP_WIDTH; x++) {
        // Default to grass if not specified
        let tileType = TileType.GRASS;
        
        // Add some random trees and stone deposits
        const randomVal = Math.random();
        if (randomVal < 0.1) {
          tileType = TileType.TREE;
        } else if (randomVal < 0.05) {
          tileType = TileType.STONE;
        }
        
        tiles[y][x] = {
          type: tileType,
          walkable: TILE_PROPERTIES[tileType].walkable,
          sprite: null // Sprite will be managed by renderer
        };
      }
    }
    
    this.mapData.tiles = tiles;
    console.log("Map initialized with size:", MAP_WIDTH, MAP_HEIGHT);
  }
  
  /**
   * Get the map data (read-only)
   */
  public getMapData(): MapData {
    return this.mapData;
  }
  
  /**
   * Get a tile at the specified coordinates
   */
  public getTile(x: number, y: number): Tile | null {
    const roundedX = Math.floor(x);
    const roundedY = Math.floor(y);
    
    if (roundedX < 0 || roundedX >= MAP_WIDTH || roundedY < 0 || roundedY >= MAP_HEIGHT) {
      return null;
    }
    
    return this.mapData.tiles[roundedY][roundedX];
  }
  
  /**
   * Check if a movement between two points is valid
   */
  public isMovementValid(fromX: number, fromY: number, toX: number, toY: number): boolean {
    // If start or end is unwalkable, movement is invalid
    if (!this.isTileWalkable(Math.floor(fromX), Math.floor(fromY)) || 
        !this.isTileWalkable(Math.floor(toX), Math.floor(toY))) {
      return false;
    }
    
    // If start and end are in the same tile, movement is valid
    if (Math.floor(fromX) === Math.floor(toX) && Math.floor(fromY) === Math.floor(toY)) {
      return true;
    }
    
    // If moving diagonally between tiles, check adjacent tiles for walkability
    if (Math.floor(fromX) !== Math.floor(toX) && Math.floor(fromY) !== Math.floor(toY)) {
      // Check both adjacent tiles to ensure we can move diagonally
      const isAdjacentXWalkable = this.isTileWalkable(Math.floor(toX), Math.floor(fromY));
      const isAdjacentYWalkable = this.isTileWalkable(Math.floor(fromX), Math.floor(toY));
      
      // Allow diagonal movement only if at least one adjacent tile is walkable
      return isAdjacentXWalkable || isAdjacentYWalkable;
    }
    
    // Horizontal or vertical movement is valid as long as both endpoints are walkable
    return true;
  }
  
  /**
   * Check if a tile is walkable
   */
  public isTileWalkable(x: number, y: number): boolean {
    // More robust boundary and type checking
    const floorX = Math.floor(x);
    const floorY = Math.floor(y);
    
    // Out of bounds check
    if (floorX < 0 || floorX >= MAP_WIDTH || floorY < 0 || floorY >= MAP_HEIGHT) {
      return false;
    }
    
    // Ensure mapData exists
    if (!this.mapData || !this.mapData.tiles) {
      console.error('Map data is incomplete');
      return false;
    }
    
    // Get tile data
    const tile = this.mapData.tiles[floorY][floorX];
    
    // Quick check for always walkable tile types
    if (tile.type === TileType.GRASS || tile.type === TileType.RUBBLE) {
      // Do additional checking if needed (e.g., temporary obstacles)
      // For now, grass and rubble are always walkable
      return true;
    }
    
    // Wall tiles may or may not be walkable depending on construction state
    if (tile.type === TileType.WALL) {
      // Check if there's a foundation at this position and if it's in an unbuilt state
      const foundation = this.findFoundationAtPosition(floorX, floorY);
      
      if (foundation) {
        // Foundation is walkable only if it's not actively being built
        return foundation.status === 'foundation' && !foundation.isBuilding;
      }
      
      // Otherwise, walls are not walkable
      return false;
    }
    
    // Trees and stones are never walkable
    if (tile.type === TileType.TREE || tile.type === TileType.STONE) {
      return false;
    }
    
    // Default to using the tile's walkable property for any other tile types
    return tile.walkable;
  }
  
  /**
   * Get all unwalkable tiles within a radius
   */
  public getUnwalkableTilesInRadius(centerX: number, centerY: number, radius: number): GridPosition[] {
    const unwalkableTiles: GridPosition[] = [];
    
    // Check all tiles within the given radius
    for (let y = Math.floor(centerY) - radius; y <= Math.floor(centerY) + radius; y++) {
      for (let x = Math.floor(centerX) - radius; x <= Math.floor(centerX) + radius; x++) {
        // Skip out of bounds tiles
        if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) {
          continue;
        }
        
        // If the tile is not walkable, add it to the list
        if (!this.isTileWalkable(x, y)) {
          unwalkableTiles.push({ x, y });
        }
      }
    }
    
    return unwalkableTiles;
  }
  
  /**
   * Find a walkable tile adjacent to the given coordinates
   */
  public getAdjacentWalkableTile(x: number, y: number): GridPosition | null {
    // Check map boundaries and ensure valid input
    x = Math.floor(x);
    y = Math.floor(y);

    if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) {
      console.warn(`Invalid coordinates: x=${x}, y=${y}`);
      return null;
    }

    // Define potential adjacent tiles
    const adjacentPositions: GridPosition[] = [
      { x: x - 1, y: y },     // Left
      { x: x + 1, y: y },     // Right
      { x: x, y: y - 1 },     // Top
      { x: x, y: y + 1 },     // Bottom
      { x: x - 1, y: y - 1 }, // Top-Left
      { x: x + 1, y: y - 1 }, // Top-Right
      { x: x - 1, y: y + 1 }, // Bottom-Left
      { x: x + 1, y: y + 1 }  // Bottom-Right
    ];

    // Find the first walkable adjacent tile
    for (const pos of adjacentPositions) {
      if (this.isTileWalkable(pos.x, pos.y)) {
        return pos;
      }
    }

    console.warn(`No walkable adjacent tile found near x=${x}, y=${y}`);
    return null;
  }
  
  /**
   * Find a walkable position near a target point
   */
  public findNearestWalkableTile(targetX: number, targetY: number, maxRadius: number = 5): GridPosition | null {
    // Check if the target itself is walkable
    if (this.isTileWalkable(targetX, targetY)) {
      return { x: targetX, y: targetY };
    }
    
    // Spiral search pattern (more efficient than checking every tile in a square)
    const directions = [
      [0, -1], // Up
      [1, 0],  // Right
      [0, 1],  // Down
      [-1, 0]  // Left
    ];
    
    let x = Math.floor(targetX);
    let y = Math.floor(targetY);
    let direction = 0;
    let stepsInDirection = 1;
    let stepsTaken = 0;
    let directionChanges = 0;
    
    for (let distance = 1; distance <= maxRadius; distance++) {
      for (let i = 0; i < 2; i++) { // Two sides of the spiral per iteration
        for (let step = 0; step < stepsInDirection; step++) {
          // Move in the current direction
          x += directions[direction][0];
          y += directions[direction][1];
          
          // Check if this position is walkable
          if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT && 
              this.isTileWalkable(x, y)) {
            // Return center of tile coordinates
            return { x: x + 0.5, y: y + 0.5 };
          }
        }
        
        // Change direction
        direction = (direction + 1) % 4;
        directionChanges++;
        
        // Increase steps after completing a full spiral loop
        if (directionChanges % 2 === 0) {
          stepsInDirection++;
        }
      }
    }
    
    // No walkable tile found within the given radius
    return null;
  }
  
  /**
   * Find alternative walkable tile with configurable search radius
   */
  public findAlternativeWalkableTile(x: number, y: number, searchRadius: number = 2): GridPosition | null {
    console.log(`Finding alternative walkable tile near (${x}, ${y}) with radius ${searchRadius}`);
    
    // Check tiles in expanding radius
    for (let radius = 1; radius <= searchRadius; radius++) {
      // Check tiles at this radius distance
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          // Only check tiles exactly at the radius distance (perimeter)
          if (Math.abs(dx) === radius || Math.abs(dy) === radius) {
            const checkX = x + dx;
            const checkY = y + dy;
            
            // Check if within map boundaries
            if (checkX >= 0 && checkX < MAP_WIDTH && checkY >= 0 && checkY < MAP_HEIGHT) {
              if (this.isTileWalkable(checkX, checkY)) {
                console.log(`Found walkable tile at (${checkX}, ${checkY})`);
                return { x: checkX, y: checkY };
              }
            }
          }
        }
      }
    }
    
    console.warn(`No walkable tiles found within radius ${searchRadius}`);
    return null;
  }
  
  /**
   * Update a tile's walkability
   */
  public updateTileWalkability(x: number, y: number, walkable: boolean): void {
    // Validate position
    if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) {
      console.warn(`Cannot update walkability: coordinates out of bounds x=${x}, y=${y}`);
      return;
    }
    
    // Update the tile's walkable property
    if (this.mapData.tiles[y][x]) {
      console.log(`Updating tile walkability at (${x}, ${y}) to ${walkable}`);
      this.mapData.tiles[y][x].walkable = walkable;
    }
  }
  
  /**
   * Add a wall at the specified coordinates
   */
  public addWall(x: number, y: number): boolean {
    // Validate input
    const roundedX = Math.round(x);
    const roundedY = Math.round(y);
    
    if (roundedX < 0 || roundedX >= MAP_WIDTH || roundedY < 0 || roundedY >= MAP_HEIGHT) {
      console.warn(`Cannot add wall: coordinates out of bounds x=${roundedX}, y=${roundedY}`);
      return false;
    }
    
    // Check if we can place a wall here
    if (this.mapData.tiles[roundedY][roundedX].type !== TileType.GRASS) {
      console.warn(`Cannot add wall: tile is not grass at x=${roundedX}, y=${roundedY}`);
      return false;
    }
    
    // Update tile data
    this.mapData.tiles[roundedY][roundedX].type = TileType.WALL;
    this.mapData.tiles[roundedY][roundedX].walkable = false;
    
    return true;
  }
  
  /**
   * Add a wall foundation at the specified coordinates
   */
  public addWallFoundation(x: number, y: number): WallFoundation | null {
    // Validate input with more robust boundary checking
    if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) {
      console.error(`Invalid wall foundation coordinates: x=${x}, y=${y}`);
      return null;
    }
  
    // Check the tile details
    const tile = this.mapData.tiles[y][x];
    
    // Prevent placing on non-grass tiles
    if (tile.type !== TileType.GRASS) {
      console.warn(`Cannot add wall: tile is not grass. Current type: ${TileType[tile.type]} at x=${x}, y=${y}`);
      return null;
    }
    
    // Update tile data
    this.mapData.tiles[y][x].type = TileType.WALL;
    this.mapData.tiles[y][x].walkable = false;
    
    // Check that wallManager is initialized
    if (!this.wallManager) {
      console.error("WallManager not initialized, cannot create wall foundation");
      return null;
    }
    
    // Create wall foundation
    const foundation = this.wallManager.createWallFoundation(x, y);
    
    console.log('Wall foundation creation:', foundation ? 'Successful' : 'Failed');
    
    return foundation;
  }
  
  /**
   * Update foundation building progress
   */
  public updateFoundationBuilding(delta: number): void {
    // Make sure WallManager is initialized
    if (!this.wallManager) {
      return;
    }
    
    this.wallManager.updateFoundationBuilding(delta);
  }
  
  /**
   * Find a foundation at a specific position
   */
  public findFoundationAtPosition(x: number, y: number): WallFoundation | null {
    if (!this.wallManager) {
      return null;
    }
    
    const foundations = this.wallManager.getWallFoundations();
    return foundations.find(f => f.x === x && f.y === y) || null;
  }
  
  /**
   * Find a foundation by its sprite reference (for event handling)
   */
  public findFoundationBySprite(sprite: any): WallFoundation | null {
    if (!this.wallManager) {
      return null;
    }
    
    const foundations = this.wallManager.getWallFoundations();
    return foundations.find(f => f.sprite === sprite || f.progressBar === sprite) || null;
  }
  
  /**
   * Find a foundation near the specified position
   */
  public findNearbyFoundation(x: number, y: number, maxDistance: number = 3): WallFoundation | null {
    if (!this.wallManager) {
      return null;
    }
    
    const foundations = this.wallManager.getWallFoundations();
    const unbuiltFoundations = foundations.filter(f => f.status !== 'complete');
    
    for (const foundation of unbuiltFoundations) {
      const dx = Math.abs(foundation.x - x);
      const dy = Math.abs(foundation.y - y);
      const distance = Math.max(dx, dy);
      
      if (distance <= maxDistance) {
        return foundation;
      }
    }
    
    return null;
  }
  
  /**
   * Delete a wall or foundation at the specified position
   */
  public deleteWallAtPosition(x: number, y: number): boolean {
    // Make sure WallManager is initialized
    if (!this.wallManager) {
      console.error('WallManager not initialized, cannot delete wall');
      return false;
    }
    
    // First check if there's a foundation at this position
    const foundation = this.findFoundationAtPosition(x, y);
    if (foundation) {
      // Remove foundation from wall manager
      this.wallManager.removeFoundation(foundation);
      
      // Change tile back to walkable
      if (this.mapData.tiles[y][x]) {
        // If it was a completed wall, create rubble
        if (foundation.status === 'complete') {
          this.mapData.tiles[y][x].type = TileType.RUBBLE;
          this.mapData.tiles[y][x].walkable = true;
        } else {
          // If it was just a foundation, revert to grass
          this.mapData.tiles[y][x].type = TileType.GRASS;
          this.mapData.tiles[y][x].walkable = true;
        }
      }
      
      return true;
    }
    
    // If no foundation found, check if it's a tree or stone
    if (this.mapData.tiles[y][x] && 
        (this.mapData.tiles[y][x].type === TileType.TREE || 
         this.mapData.tiles[y][x].type === TileType.STONE)) {
      
      // Convert to grass
      this.mapData.tiles[y][x].type = TileType.GRASS;
      this.mapData.tiles[y][x].walkable = true;
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Get villagers on a specific tile
   */
  public getVillagersOnTile(x: number, y: number): Villager[] {
    if (!this.villagerManager) {
      console.error('VillagerManager not available');
      return [];
    }
    
    return this.villagerManager.getAllVillagers().filter(villager => {
      const villagerTileX = Math.floor(villager.x);
      const villagerTileY = Math.floor(villager.y);
      return villagerTileX === x && villagerTileY === y;
    });
  }
  
  /**
   * Handle villagers on a foundation tile
   */
  public handleVillagersOnFoundation(foundation: WallFoundation): void {
    // Find villagers on this foundation's tile
    const villagersOnTile = this.getVillagersOnTile(foundation.x, foundation.y);
    
    if (villagersOnTile.length > 0) {
      console.log(`${villagersOnTile.length} villagers found on foundation at (${foundation.x}, ${foundation.y})`);
      
      let allCleared = true;
      
      villagersOnTile.forEach((villager, index) => {
        // Check if this villager is assigned to build this foundation
        const isAssignedBuilder = villager.currentBuildTask && 
                                villager.currentBuildTask?.type === 'wall' && 
                                villager.currentBuildTask?.foundation?.x === foundation.x && 
                                villager.currentBuildTask?.foundation?.y === foundation.y;
        
        if (!isAssignedBuilder) {
          console.log(`Moving unassigned villager ${index} away from foundation`);
          
          // Find a safe position to move the villager
          const safePositions = this.findSafePositionsAroundFoundation(foundation);
          
          if (safePositions.length > 0) {
            // Sort positions by distance to villager
            safePositions.sort((a, b) => {
              const distA = Math.sqrt(Math.pow(a.x - villager.x, 2) + Math.pow(a.y - villager.y, 2));
              const distB = Math.sqrt(Math.pow(b.x - villager.x, 2) + Math.pow(b.y - villager.y, 2));
              return distA - distB;
            });
            
            // Try to move the villager to the closest safe position
            try {
              this.ensureVillagerManager().moveVillagerTo(
                villager, 
                safePositions[0].x, 
                safePositions[0].y
              );
            } catch (error) {
              // If an error occurred during movement, consider this villager not cleared
              console.error(`Error moving villager ${index}:`, error);
              allCleared = false;
            }
          } else {
            // No safe positions found
            console.warn(`No safe positions found around foundation at (${foundation.x}, ${foundation.y})`);
            allCleared = false;
          }
        } else {
          console.log(`Villager ${index} is assigned to build this foundation, not moving`);
        }
      });
      
      foundation.villagersCleared = allCleared;
    } else {
      foundation.villagersCleared = true; // No villagers to clear
    }
  }
  
  /**
   * Find safe positions around a foundation for villagers
   */
  private findSafePositionsAroundFoundation(foundation: WallFoundation): GridPosition[] {
    const safePositions: GridPosition[] = [];
    
    // Check all adjacent tiles
    const adjacentOffsets = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];
    
    for (const offset of adjacentOffsets) {
      const x = foundation.x + offset[0];
      const y = foundation.y + offset[1];
      
      // Skip positions outside map bounds
      if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) {
        continue;
      }
      
      // Skip positions that are unwalkable
      if (!this.isTileWalkable(x, y)) {
        continue;
      }
      
      // Check if this position is already occupied by another builder
      const isOccupied = foundation.occupiedPositions.some(
        pos => Math.abs(pos.x - x) < 0.5 && Math.abs(pos.y - y) < 0.5
      );
      
      if (!isOccupied) {
        // Add some slight randomness to prevent villagers from stacking
        const offsetX = 0.2 * (Math.random() - 0.5);
        const offsetY = 0.2 * (Math.random() - 0.5);
        
        safePositions.push({ 
          x: x + 0.5 + offsetX, 
          y: y + 0.5 + offsetY
        });
      }
    }
    
    return safePositions;
  }

  public getGroundLayerTiles(): any[] {
    // This can return an empty array initially
    // This will be populated by the renderer
    return this.groundLayerTiles || [];
  }
  
  /**
   * Get all wall foundations
   */
  public getWallFoundations(): WallFoundation[] {
    if (!this.wallManager) {
      console.error("WallManager not initialized, cannot get wall foundations");
      return []; // Return empty array instead of causing an error
    }
    return this.wallManager.getWallFoundations();
  }

}