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
  public wallManager: WallManager;
  private villagerManager: VillagerManager;
  constructor(
    groundLayer: PIXI.Container, 
    objectLayer: PIXI.Container, 
    isoUtils: IsometricUtils,
    villagerManager: VillagerManager,
    wallManager: WallManager
  ) {
    this.groundLayer = groundLayer;
    this.objectLayer = objectLayer;
    this.isoUtils = isoUtils;
    this.villagerManager = villagerManager;
    this.wallManager = wallManager;
    
    this.mapData = { tiles: [] };
    
    this.initMap();
  }
  
  // Ensure this method exists
  public getVillagerManager(): VillagerManager {
    if (!this.villagerManager) {
      throw new Error('VillagerManager not initialized');
    }
    return this.villagerManager;
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
    
    // Create wall foundation
    const foundation = this.wallManager.createWallFoundation(x, y);
    
    console.log('Wall foundation creation:', foundation ? 'Successful' : 'Failed');
    
    return foundation;
  }


  public getWallFoundations(): WallFoundation[] {
    return this.wallManager.getWallFoundations();
  }
  
  public updateFoundationBuilding(delta: number): void {
    this.wallManager.updateFoundationBuilding(delta);
  }
  
  public findNearbyFoundation(x: number, y: number, maxDistance: number = 3): WallFoundation | null {
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
    const foundations = this.getWallFoundations();
    return foundations.find(f => f.x === x && f.y === y) || null;
  }
  
  public findFoundationBySprite(sprite: PIXI.DisplayObject): WallFoundation | null {
    const foundations = this.getWallFoundations();
    return foundations.find(f => f.sprite === sprite || f.progressBar === sprite) || null;
  }
  
  public deleteWallAtPosition(x: number, y: number): boolean {
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



  // New method to check for villagers on a specific tile
  public getVillagersOnTile(x: number, y: number): Villager[] {
    const villagerManager = this.getVillagerManager(); // You'll need to implement this method
    return villagerManager.getAllVillagers().filter(villager => 
      Math.floor(villager.x) === x && Math.floor(villager.y) === y
    );
  }
  
  // Method to find alternative walkable positions for a villager
  public findAlternativeWalkableTile(x: number, y: number): GridPosition | null {
    const adjacentTiles: GridPosition[] = [
      { x: x - 1, y: y },     // Left
      { x: x + 1, y: y },     // Right
      { x: x, y: y - 1 },     // Top
      { x: x, y: y + 1 },     // Bottom
      { x: x - 1, y: y - 1 }, // Top-Left
      { x: x + 1, y: y - 1 }, // Top-Right
      { x: x - 1, y: y + 1 }, // Bottom-Left
      { x: x + 1, y: y + 1 }  // Bottom-Right
    ];
    
    const walkableTiles = adjacentTiles.filter(tile => 
      tile.x >= 0 && tile.x < MAP_WIDTH && 
      tile.y >= 0 && tile.y < MAP_HEIGHT && 
      this.isTileWalkable(tile.x, tile.y)
    );
    
    return walkableTiles.length > 0 ? walkableTiles[0] : null;
  }
  
  // Method to handle villagers on foundation tiles during building
  public handleVillagersOnFoundation(foundation: WallFoundation): void {
    // Find villagers on this foundation's tile
    const villagersOnTile = this.getVillagersOnTile(foundation.x, foundation.y);
    
    villagersOnTile.forEach(villager => {
      // Try to move the villager to an alternative walkable tile
      const alternativeTile = this.findAlternativeWalkableTile(foundation.x, foundation.y);
      
      if (alternativeTile) {
        // Move villager to the alternative tile
        this.getVillagerManager().moveVillager(
          villager, 
          alternativeTile.x, 
          alternativeTile.y
        );
      } else {
        // No alternative tile available - prevent building
        foundation.isBuilding = false;
        console.warn('Cannot build wall - villager blocking tile');
      }
    });
  }public isTileWalkable(x: number, y: number): boolean {
    // More robust boundary and type checking
    const floorX = Math.floor(x);
    const floorY = Math.floor(y);
    
    if (floorX < 0 || floorX >= MAP_WIDTH || floorY < 0 || floorY >= MAP_HEIGHT) {
      console.warn(`Tile outside map boundaries: x=${floorX}, y=${floorY}`);
      return false;
    }
    
    // Ensure mapData and tiles exist before accessing
    if (!this.mapData || !this.mapData.tiles) {
      console.error('Map data is incomplete or undefined');
      return false;
    }
    
    const tile = this.mapData.tiles[floorY][floorX];
    
    // Check if there's a wall foundation at this location
    const foundation = this.findFoundationAtPosition(floorX, floorY);
    
    // Debug logging for walkability
    const debugWalkabilityCheck = () => {
      console.log('Walkability Check:', {
        coordinates: { x: floorX, y: floorY },
        tileType: TileType[tile.type],
        foundationStatus: foundation ? foundation.status : 'no foundation',
        isWalkable: this.isCurrentlyWalkable(tile, foundation)
      });
    };
    
    const walkable = this.isCurrentlyWalkable(tile, foundation);
    
    if (!walkable) {
      debugWalkabilityCheck();
    }
    
    return walkable;
  }
  
  private isCurrentlyWalkable(tile: Tile, foundation: WallFoundation | null): boolean {
    // Walkable conditions:
    // 1. Tile is grass or rubble
    // 2. Wall foundation exists but is not in 'building' or 'complete' state
    if (tile.type === TileType.GRASS || tile.type === TileType.RUBBLE) {
      return true;
    }
    
    // If foundation exists and is not in building state, it's walkable
    if (foundation && foundation.status !== 'building' && foundation.status !== 'complete') {
      return true;
    }
    
    return false;
  }
}