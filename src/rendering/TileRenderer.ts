// src/rendering/TileRenderer.ts - Updated for decoupled architecture
import * as PIXI from 'pixi.js';
import { COLORS, TILE_WIDTH, TILE_HEIGHT, MAP_WIDTH, MAP_HEIGHT } from '../constants';
import { TileType } from '../types';
import { CoordinateTransformer, RenderingMode } from '../utils/CoordinateTransformer';
import { GameMap } from '../components/Map';

/**
 * Handles rendering of map tiles
 */
export class TileRenderer {
  private groundLayer: PIXI.Container;
  private transformer: CoordinateTransformer;
  private tileSprites: Map<string, PIXI.Graphics> = new Map();
  private highlightedTiles: Set<string> = new Set();

  constructor(groundLayer: PIXI.Container, transformer: CoordinateTransformer) {
    this.groundLayer = groundLayer;
    this.transformer = transformer;
  }

  /**
   * Render the entire map
   */
  public renderMap(gameMap: GameMap): void {
    // Clear existing tiles
    this.groundLayer.removeChildren();
    this.tileSprites.clear();
    this.highlightedTiles.clear();
    
    // Get the map data
    const mapData = gameMap.getMapData();
    
    // Draw all tiles
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tile = mapData.tiles[y][x];
        this.renderTile(x, y, tile.type);
      }
    }
  }

  /**
   * Render a single tile
   */
  private renderTile(x: number, y: number, tileType: TileType): void {
    const pos = this.transformer.toScreen(x, y);
    
    // Create tile sprite
    const tileSprite = new PIXI.Graphics();
    
    // Check current rendering mode
    const isIsometric = this.transformer.getRenderingMode() === RenderingMode.ISOMETRIC;
    
    // Set fill color based on tile type
    let fillColor = COLORS.GRASS;
    if (tileType === TileType.RUBBLE) {
      fillColor = COLORS.STONE_DETAIL;
    }
    
    // Draw appropriate tile shape based on rendering mode
    tileSprite.beginFill(fillColor);
    
    if (isIsometric) {
      // Draw diamond shape for isometric
      tileSprite.moveTo(0, TILE_HEIGHT / 2);
      tileSprite.lineTo(TILE_WIDTH / 2, 0);
      tileSprite.lineTo(TILE_WIDTH, TILE_HEIGHT / 2);
      tileSprite.lineTo(TILE_WIDTH / 2, TILE_HEIGHT);
      tileSprite.lineTo(0, TILE_HEIGHT / 2);
    } else {
      // Draw rectangle for orthogonal
      tileSprite.drawRect(0, 0, TILE_WIDTH, TILE_HEIGHT);
    }
    
    tileSprite.endFill();
    
    // Add grid lines
    tileSprite.lineStyle(1, 0xFFFFFF, 0.2);
    
    if (isIsometric) {
      // Diamond outline for isometric
      tileSprite.moveTo(0, TILE_HEIGHT / 2);
      tileSprite.lineTo(TILE_WIDTH / 2, 0);
      tileSprite.lineTo(TILE_WIDTH, TILE_HEIGHT / 2);
      tileSprite.lineTo(TILE_WIDTH / 2, TILE_HEIGHT);
      tileSprite.lineTo(0, TILE_HEIGHT / 2);
    } else {
      // Rectangle outline for orthogonal
      tileSprite.drawRect(0, 0, TILE_WIDTH, TILE_HEIGHT);
    }
    
    // Position the tile
    tileSprite.x = pos.x;
    tileSprite.y = pos.y;
    
    // Make tile interactive
    tileSprite.interactive = true;
    tileSprite.cursor = 'pointer';
    
    // Store tile coordinates for reference
    (tileSprite as any).tileX = x;
    (tileSprite as any).tileY = y;
    
    // Add to container
    this.groundLayer.addChild(tileSprite);
    
    // Store reference to tile sprite
    const tileKey = `${x},${y}`;
    this.tileSprites.set(tileKey, tileSprite);
    
    // Add decoration for rubble tiles
    if (tileType === TileType.RUBBLE) {
      this.addRubbleDecoration(tileSprite);
    }
  }

  /**
   * Add decoration to rubble tiles
   */
  private addRubbleDecoration(tileSprite: PIXI.Graphics): void {
    // Add rubble details
    tileSprite.beginFill(COLORS.WALL, 0.5);
    
    // Small random debris
    for (let j = 0; j < 5; j++) {
      const debrisX = Math.random() * TILE_WIDTH;
      const debrisY = Math.random() * TILE_HEIGHT;
      const size = 2 + Math.random() * 4;
      tileSprite.drawCircle(debrisX, debrisY, size);
    }
    
    tileSprite.endFill();
  }

  /**
   * Update a specific tile's appearance
   */
  public updateTile(gameMap: GameMap, x: number, y: number): void {
    const tileKey = `${x},${y}`;
    const existingSprite = this.tileSprites.get(tileKey);
    
    if (existingSprite) {
      // Remove existing sprite
      this.groundLayer.removeChild(existingSprite);
      existingSprite.destroy();
      this.tileSprites.delete(tileKey);
      
      // Remove from highlighted tiles if needed
      this.highlightedTiles.delete(tileKey);
    }
    
    // Get the new tile type
    const tile = gameMap.getTile(x, y);
    if (tile) {
      // Render the updated tile
      this.renderTile(x, y, tile.type);
    }
  }

  /**
   * Highlight a tile (e.g., for hover effects)
   */
  public highlightTile(x: number, y: number, color: number = 0xDDDDDD): void {
    const tileKey = `${x},${y}`;
    const tileSprite = this.tileSprites.get(tileKey);
    
    if (tileSprite) {
      tileSprite.tint = color;
      this.highlightedTiles.add(tileKey);
    }
  }

  /**
   * Remove highlight from a tile
   */
  public clearHighlight(x: number, y: number): void {
    const tileKey = `${x},${y}`;
    const tileSprite = this.tileSprites.get(tileKey);
    
    if (tileSprite) {
      tileSprite.tint = 0xFFFFFF;
      this.highlightedTiles.delete(tileKey);
    }
  }
  
  /**
   * Clear all highlighted tiles
   */
  public clearAllHighlights(): void {
    this.highlightedTiles.forEach(tileKey => {
      const tileSprite = this.tileSprites.get(tileKey);
      if (tileSprite) {
        tileSprite.tint = 0xFFFFFF;
      }
    });
    
    this.highlightedTiles.clear();
  }

  /**
   * Register a click handler for tiles
   */
  public setTileClickHandler(
    handler: (x: number, y: number, event: PIXI.FederatedPointerEvent) => void
  ): void {
    // Remove any existing listeners first
    this.tileSprites.forEach(sprite => {
      sprite.off('pointerdown');
    });
    
    // Add new click handlers
    this.tileSprites.forEach(sprite => {
      sprite.on('pointerdown', (event) => {
        const tileX = (sprite as any).tileX;
        const tileY = (sprite as any).tileY;
        handler(tileX, tileY, event);
      });
    });
  }

  /**
   * Register hover handlers for tiles
   */
  public setTileHoverHandlers(
    hoverInHandler: (x: number, y: number) => void,
    hoverOutHandler: (x: number, y: number) => void
  ): void {
    // Remove any existing listeners first
    this.tileSprites.forEach(sprite => {
      sprite.off('pointerover');
      sprite.off('pointerout');
    });
    
    // Add new hover handlers
    this.tileSprites.forEach(sprite => {
      const tileX = (sprite as any).tileX;
      const tileY = (sprite as any).tileY;
      
      sprite.on('pointerover', () => hoverInHandler(tileX, tileY));
      sprite.on('pointerout', () => hoverOutHandler(tileX, tileY));
    });
  }
}