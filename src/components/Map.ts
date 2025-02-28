import * as PIXI from 'pixi.js';
import { COLORS, MAP_HEIGHT, MAP_WIDTH, TILE_HEIGHT, TILE_WIDTH, TILE_PROPERTIES } from '../constants';
import { GridPosition, MapData, Tile, TileType, Villager} from '../types';
import { IsometricUtils } from '../utils/IsometricUtils';
import { WallManager, WallFoundation } from './WallManager';
import { VillagerManager } from './Villager';

export class GameMap {
  private mapData: MapData;
  private groundLayer: PIXI.Container;
  private objectLayer: PIXI.Container;
  private isoUtils: IsometricUtils;
  private villagerManager: VillagerManager | null = null;
  public wallManager: WallManager | null = null;

  // Modified constructor - doesn't require VillagerManager or WallManager
  constructor(
    groundLayer: PIXI.Container, 
    objectLayer: PIXI.Container, 
    isoUtils: IsometricUtils
  ) {
    this.groundLayer = groundLayer;
    this.objectLayer = objectLayer;
    this.isoUtils = isoUtils;
    
    this.mapData = { tiles: [] };
    
    this.initMap();
  }
  
  // Setter methods for two-phase initialization
  public setVillagerManager(villagerManager: VillagerManager): void {
    this.villagerManager = villagerManager;
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
  
  // Method needed by VillagerManager
  public getVillagerManager(): VillagerManager {
    return this.ensureVillagerManager();
  }
  
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
          sprite: null
        };
      }
    }
    
    this.mapData.tiles = tiles;
    this.drawMap();
  }
  
  private drawMap(): void {
    console.log("Drawing map with size: ", MAP_WIDTH, MAP_HEIGHT);
    // Draw all tiles
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        this.drawTile(x, y);
      }
    }
    
    console.log("Total tiles created:", this.groundLayer.children.length);
  }
  
  private drawTile(x: number, y: number): void {
    const tile = this.mapData.tiles[y][x];
    const pos = this.isoUtils.toScreen(x, y);
    
    // Create grass tile
    const tileSprite = new PIXI.Graphics();
    
    // Draw isometric tile shape
    tileSprite.beginFill(COLORS.GRASS);
    
    // Draw diamond shape
    tileSprite.moveTo(0, TILE_HEIGHT / 2);
    tileSprite.lineTo(TILE_WIDTH / 2, 0);
    tileSprite.lineTo(TILE_WIDTH, TILE_HEIGHT / 2);
    tileSprite.lineTo(TILE_WIDTH / 2, TILE_HEIGHT);
    tileSprite.lineTo(0, TILE_HEIGHT / 2);
    
    tileSprite.endFill();
    
    // Add grid lines - thin and mostly transparent white
    tileSprite.lineStyle(1, 0xFFFFFF, 0.2);
    tileSprite.moveTo(0, TILE_HEIGHT / 2);
    tileSprite.lineTo(TILE_WIDTH / 2, 0);
    tileSprite.lineTo(TILE_WIDTH, TILE_HEIGHT / 2);
    tileSprite.lineTo(TILE_WIDTH / 2, TILE_HEIGHT);
    tileSprite.lineTo(0, TILE_HEIGHT / 2);
    
    tileSprite.x = pos.x;
    tileSprite.y = pos.y;
    
    tileSprite.interactive = true;
    tileSprite.cursor = 'pointer';
    
    // Type casting to add custom properties
    (tileSprite as any).tileX = x;
    (tileSprite as any).tileY = y;
    
    this.groundLayer.addChild(tileSprite);
    
    // Add objects based on tile type
    if (tile.type !== TileType.GRASS && tile.type !== TileType.RUBBLE) {
      const objectSprite = this.createTileObject(tile.type, pos.x, pos.y);
      this.objectLayer.addChild(objectSprite);
      tile.sprite = objectSprite

      // Set the zIndex based on the y-coordinate for depth sorting
      objectSprite.zIndex = y;
    } else if (tile.type === TileType.RUBBLE) {
      // Create rubble tile
      this.createRubbleTile(x, y);
    }
  }

  private createTileObject(type: TileType, x: number, y: number): PIXI.Graphics {
    const objectSprite = new PIXI.Graphics();
    
    switch (type) {
      case TileType.WALL:
        objectSprite.beginFill(COLORS.WALL);
        objectSprite.drawRect(TILE_WIDTH / 4, 0, TILE_WIDTH / 2, TILE_HEIGHT / 2);
        objectSprite.endFill();
        
        // Add some detail to the wall
        objectSprite.beginFill(COLORS.WALL_DETAIL);
        objectSprite.drawRect(TILE_WIDTH / 3, TILE_HEIGHT / 12, TILE_WIDTH / 3, TILE_HEIGHT / 6);
        objectSprite.endFill();
        break;
        
      case TileType.TREE:
        // Tree trunk - more centered and thinner
        objectSprite.beginFill(COLORS.TREE_TRUNK);
        objectSprite.drawRect(TILE_WIDTH / 2 - 3, TILE_HEIGHT / 3, 6, TILE_HEIGHT / 3);
        objectSprite.endFill();
        
        // Tree top (triangle shape, centered near top of tile)
        objectSprite.beginFill(COLORS.TREE_LEAVES);
        objectSprite.drawPolygon([
          TILE_WIDTH / 2, TILE_HEIGHT / 6, // Top point
          TILE_WIDTH / 2 - 15, TILE_HEIGHT / 2, // Bottom left
          TILE_WIDTH / 2 + 15, TILE_HEIGHT / 2  // Bottom right
        ]);
        objectSprite.endFill();
        break;
        
      case TileType.STONE:
        // Center the stone
        objectSprite.beginFill(COLORS.STONE);
        objectSprite.drawEllipse(TILE_WIDTH / 2, TILE_HEIGHT / 2, TILE_WIDTH / 3, TILE_HEIGHT / 4);
        objectSprite.endFill();
        
        // Add some details to the stone
        objectSprite.beginFill(COLORS.STONE_DETAIL);
        objectSprite.drawEllipse(TILE_WIDTH / 3, TILE_HEIGHT / 2, TILE_WIDTH / 8, TILE_HEIGHT / 6);
        objectSprite.drawEllipse(TILE_WIDTH * 2/3, TILE_HEIGHT / 2.5, TILE_WIDTH / 7, TILE_HEIGHT / 7);
        objectSprite.endFill();
        break;
    }
    
    objectSprite.x = x;
    objectSprite.y = y;
    
    // Make objects interactive so they can be clicked
    objectSprite.interactive = true;
    objectSprite.cursor = 'pointer';
    
    // Store the tile coordinates for reference
    (objectSprite as any).tileX = Math.round((x - this.isoUtils.toScreen(0, 0).x) / TILE_WIDTH);
    (objectSprite as any).tileY = Math.round((y - this.isoUtils.toScreen(0, 0).y) / TILE_HEIGHT);
    
    return objectSprite;
  }
  
  private createRubbleTile(x: number, y: number): void {
    const pos = this.isoUtils.toScreen(x, y);
    
    // Get the ground tile at this position and update its appearance
    for (let i = 0; i < this.groundLayer.children.length; i++) {
      const tile = this.groundLayer.children[i] as PIXI.Graphics;
      const tileX = (tile as any).tileX;
      const tileY = (tile as any).tileY;
      
      if (tileX === x && tileY === y) {
        // Clear existing tile
        tile.clear();
        
        // Draw rubble-colored tile
        tile.beginFill(COLORS.STONE_DETAIL); // Grey color for rubble
        tile.moveTo(0, TILE_HEIGHT / 2);
        tile.lineTo(TILE_WIDTH / 2, 0);
        tile.lineTo(TILE_WIDTH, TILE_HEIGHT / 2);
        tile.lineTo(TILE_WIDTH / 2, TILE_HEIGHT);
        tile.lineTo(0, TILE_HEIGHT / 2);
        tile.endFill();
        
        // Add slight outlines
        tile.lineStyle(1, COLORS.STONE, 0.3);
        tile.moveTo(0, TILE_HEIGHT / 2);
        tile.lineTo(TILE_WIDTH / 2, 0);
        tile.lineTo(TILE_WIDTH, TILE_HEIGHT / 2);
        tile.lineTo(TILE_WIDTH / 2, TILE_HEIGHT);
        tile.lineTo(0, TILE_HEIGHT / 2);
        
        // Add some rubble details
        tile.beginFill(COLORS.WALL, 0.5);
        // Small random debris
        for (let j = 0; j < 5; j++) {
          const debrisX = Math.random() * TILE_WIDTH;
          const debrisY = Math.random() * TILE_HEIGHT;
          const size = 2 + Math.random() * 4;
          tile.drawCircle(debrisX, debrisY, size);
        }
        tile.endFill();
        
        break;
      }
    }
  }
  
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
    
    // Create wall object
    const pos = this.isoUtils.toScreen(roundedX, roundedY);
    const wallSprite = this.createTileObject(TileType.WALL, pos.x, pos.y);
    this.objectLayer.addChild(wallSprite);
    this.mapData.tiles[roundedY][roundedX].sprite = wallSprite;
    
    return true;
  }
  
  public getTile(x: number, y: number): Tile | null {
    const roundedX = Math.round(x);
    const roundedY = Math.round(y);
    
    if (roundedX < 0 || roundedX >= MAP_WIDTH || roundedY < 0 || roundedY >= MAP_HEIGHT) {
      return null;
    }
    
    return this.mapData.tiles[roundedY][roundedX];
  }
  
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

  public getGroundLayerTiles(): PIXI.Graphics[] {
    return this.groundLayer.children as PIXI.Graphics[];
  }
  


  
  public updateFoundationBuilding(delta: number): void {
    // Make sure WallManager is initialized
    if (!this.wallManager) {
      return;
    }
    
    this.wallManager.updateFoundationBuilding(delta);
  }
  
  public findNearbyFoundation(x: number, y: number, maxDistance: number = 3): WallFoundation | null {
    // Make sure WallManager is initialized
    if (!this.wallManager) {
      return null;
    }
    
    const foundations = this.getWallFoundations();
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
  
  public findFoundationAtPosition(x: number, y: number): WallFoundation | null {
    // Make sure WallManager is initialized
    if (!this.wallManager) {
      return null;
    }
    
    const foundations = this.getWallFoundations();
    return foundations.find(f => f.x === x && f.y === y) || null;
  }
  
  public findFoundationBySprite(sprite: PIXI.DisplayObject): WallFoundation | null {
    // Make sure WallManager is initialized
    if (!this.wallManager) {
      return null;
    }
    
    const foundations = this.getWallFoundations();
    return foundations.find(f => f.sprite === sprite || f.progressBar === sprite) || null;
  }
  
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
          
          // Remove any sprites
          if (this.mapData.tiles[y][x].sprite) {
            this.objectLayer.removeChild(this.mapData.tiles[y][x].sprite);
            this.mapData.tiles[y][x].sprite = null;
          }
          
          // Create rubble visuals
          this.createRubbleTile(x, y);
        } else {
          // If it was just a foundation, revert to grass
          this.mapData.tiles[y][x].type = TileType.GRASS;
          this.mapData.tiles[y][x].walkable = true;
          
          // Remove any sprites
          if (this.mapData.tiles[y][x].sprite) {
            this.objectLayer.removeChild(this.mapData.tiles[y][x].sprite);
            this.mapData.tiles[y][x].sprite = null;
          }
        }
      }
      
      return true;
    }
    
    // If no foundation found, check if it's a tree or stone
    if (this.mapData.tiles[y][x] && 
        (this.mapData.tiles[y][x].type === TileType.TREE || 
         this.mapData.tiles[y][x].type === TileType.STONE)) {
      // Remove the object sprite
      if (this.mapData.tiles[y][x].sprite) {
        this.objectLayer.removeChild(this.mapData.tiles[y][x].sprite);
        this.mapData.tiles[y][x].sprite = null;
      }
      
      // Convert to grass
      this.mapData.tiles[y][x].type = TileType.GRASS;
      this.mapData.tiles[y][x].walkable = true;
      
      return true;
    }
    
    return false;
  }


  
  /**
 * Enhanced method to find alternative walkable tiles with a configurable search radius
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
 * Enhanced method for more robust walkability check
 */
public isTileWalkable(x: number, y: number): boolean {
  // More robust boundary and type checking
  const floorX = Math.floor(x);
  const floorY = Math.floor(y);
  
  if (floorX < 0 || floorX >= MAP_WIDTH || floorY < 0 || floorY >= MAP_HEIGHT) {
    return false;
  }
  
  // Ensure mapData exists
  if (!this.mapData || !this.mapData.tiles) {
    console.error('Map data is incomplete');
    return false;
  }
  
  const tile = this.mapData.tiles[floorY][floorX];
  
  // Handle different walkability scenarios
  if (tile.type === TileType.GRASS || tile.type === TileType.RUBBLE) {
    return true;
  }
  
  // Check for wall foundations in unbuilt state
  const foundation = this.findFoundationAtPosition(floorX, floorY);
  if (foundation && foundation.status === 'foundation' && !foundation.isBuilding) {
    return true;
  }
  
  return false;
}

/**
 * Improved method for handling villagers on foundation tiles
 */
public handleVillagersOnFoundation(foundation: WallFoundation): void {
  // Find villagers on this foundation's tile
  const villagersOnTile = this.getVillagersOnTile(foundation.x, foundation.y);
  
  if (villagersOnTile.length > 0) {
    console.log(`${villagersOnTile.length} villagers found on foundation at (${foundation.x}, ${foundation.y})`);
    
    villagersOnTile.forEach((villager, index) => {
      // Check if this villager is assigned to build this foundation
      const isAssignedBuilder = villager.currentBuildTask && 
                                villager.currentBuildTask?.type === 'wall' && 
                                villager.currentBuildTask?.foundation?.x === foundation.x && 
                                villager.currentBuildTask?.foundation?.y === foundation.y;
                                

                                
      if (!isAssignedBuilder) {
        console.log(`Moving unassigned villager ${index} away from foundation`);
        // Try to move the villager away
        const moved = this.getVillagerManager().forceVillagerMove(villager);
        
        if (!moved) {
          // If we couldn't move the villager, prevent building
          console.warn(`Couldn't move villager ${index}, pausing construction`);
          foundation.isBuilding = false;
        }
      } else {
        console.log(`Villager ${index} is assigned to build this foundation, not moving`);
      }
    });
  }
}

/**
 * Get all villagers on a specific tile
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


  

  private isCurrentlyWalkable(tile: Tile, foundation: WallFoundation | null): boolean {
    // Walkable conditions:
    // 1. Tile is grass or rubble
    // 2. Wall foundation exists but building has not started (status is 'foundation')
    // 3. Tile is WALL type but there's a foundation on it that's not yet building
    
    // Grass and rubble are always walkable
    if (tile.type === TileType.GRASS || tile.type === TileType.RUBBLE) {
      return true;
    }
    
    // If it's a wall tile but has a foundation on it
    if (tile.type === TileType.WALL && foundation) {
      // Only restrict movement if the foundation is actively being built or complete
      return foundation.status === 'foundation' || !foundation.isBuilding;
    }
    
    // All other tiles (trees, stones, etc.) are not walkable
    return false;
  }

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


  public setWallManager(wallManager: WallManager): void {
    this.wallManager = wallManager;
    console.log("WallManager set in GameMap");
  }
  
  // Modify the getWallFoundations method with null checks:
  public getWallFoundations(): WallFoundation[] {
    if (!this.wallManager) {
      console.error("WallManager not initialized, cannot get wall foundations");
      return []; // Return empty array instead of causing an error
    }
    return this.wallManager.getWallFoundations();
  }
  
  // Add a similar null check to all methods that access wallManager:
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
    
    // Remove any existing sprite from the tile
    if (tile.sprite) {
      this.objectLayer.removeChild(tile.sprite);
      tile.sprite = null;
    }
    
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
}