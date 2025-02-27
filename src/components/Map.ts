import * as PIXI from 'pixi.js';
import { COLORS, MAP_HEIGHT, MAP_WIDTH, TILE_HEIGHT, TILE_WIDTH, TILE_PROPERTIES } from '../constants';
import { GridPosition, MapData, Tile, TileType } from '../types';
import { IsometricUtils } from '../utils/IsometricUtils';

export class GameMap {
  private mapData: MapData;
  private groundLayer: PIXI.Container;
  private objectLayer: PIXI.Container;
  private isoUtils: IsometricUtils;
  
  constructor(groundLayer: PIXI.Container, objectLayer: PIXI.Container, isoUtils: IsometricUtils) {
    this.groundLayer = groundLayer;
    this.objectLayer = objectLayer;
    this.isoUtils = isoUtils;
    this.mapData = { tiles: [] };
    
    this.initMap();
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
    
    // Add slight outlines
    tileSprite.lineStyle(1, COLORS.GRASS_OUTLINE, 0.3);
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
    if (tile.type !== TileType.GRASS) {
      const objectSprite = this.createTileObject(tile.type, pos.x, pos.y);
      this.objectLayer.addChild(objectSprite);
      tile.sprite = objectSprite as PIXI.DisplayObject;
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
        // Tree trunk
        objectSprite.beginFill(COLORS.TREE_TRUNK);
        objectSprite.drawRect(TILE_WIDTH / 2 - 5, TILE_HEIGHT / 2, 10, TILE_HEIGHT / 2);
        objectSprite.endFill();
        
        // Tree top (simple triangle for now)
        objectSprite.beginFill(COLORS.TREE_LEAVES);
        objectSprite.drawPolygon([
          TILE_WIDTH / 2, -TILE_HEIGHT / 2,
          TILE_WIDTH / 2 - 25, TILE_HEIGHT / 2,
          TILE_WIDTH / 2 + 25, TILE_HEIGHT / 2
        ]);
        objectSprite.endFill();
        break;
        
      case TileType.STONE:
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
    return objectSprite;
  }
  
  public isTileWalkable(x: number, y: number): boolean {
    // Validate input coordinates
    if (typeof x !== 'number' || typeof y !== 'number') {
      console.error('Invalid coordinate types:', { x, y });
      return false;
    }
    
    // Round coordinates to nearest integer
    const roundedX = Math.round(x);
    const roundedY = Math.round(y);
    
    // Check map boundaries
    if (roundedX < 0 || roundedX >= MAP_WIDTH || roundedY < 0 || roundedY >= MAP_HEIGHT) {
      console.warn(`Tile outside map boundaries: x=${roundedX}, y=${roundedY}`);
      return false;
    }
    
    // Ensure mapData and tiles exist before accessing
    if (!this.mapData || !this.mapData.tiles) {
      console.error('Map data is incomplete or undefined');
      return false;
    }
    
    // Additional safety check for specific tile
    const tileRow = this.mapData.tiles[roundedY];
    if (!tileRow) {
      console.error(`No tile row found at y=${roundedY}`);
      return false;
    }
    
    const tile = tileRow[roundedX];
    if (!tile) {
      console.error(`No tile found at coordinates: x=${roundedX}, y=${roundedY}`);
      return false;
    }
    
    // Log walkability for debugging
    console.log(`Walkability check: x=${roundedX}, y=${roundedY}, walkable=${tile.walkable}`);
    
    return tile.walkable;
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
    const roundedX = Math.round(x);
    const roundedY = Math.round(y);
    
    const adjacentPositions = this.isoUtils.getAdjacentTiles(roundedX, roundedY);
    
    // Find the first walkable adjacent tile
    for (const pos of adjacentPositions) {
      if (this.isTileWalkable(pos.x, pos.y)) {
        return pos;
      }
    }
    
    console.warn(`No walkable adjacent tile found near x=${roundedX}, y=${roundedY}`);
    return null;
  }
}