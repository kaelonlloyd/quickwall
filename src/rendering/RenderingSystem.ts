// src/rendering/RenderingSystem.ts - Updated with event listeners
import * as PIXI from 'pixi.js';
import { CoordinateTransformer, RenderingMode } from '../utils/CoordinateTransformer';
import { TileRenderer } from './TileRenderer';
import { VillagerRenderer } from './VillagerRenderer';
import { WallRenderer } from './WallRenderer';
import { GameMap } from '../components/Map';
import { VillagerManager } from '../components/Villager';
import { WallManager } from '../components/WallManager';
import { UIManager } from '../components/UI';
import { GridPosition } from '../types';

/**
 * The main rendering system that coordinates all visual aspects of the game
 * This class creates and manages individual renderers for each game component
 * and listens for UI events to update visuals accordingly
 */
export class RenderingSystem {
  // Layers for rendering
  private groundLayer: PIXI.Container;
  private objectLayer: PIXI.Container;
  private unitLayer: PIXI.Container;
  private uiLayer: PIXI.Container;
  private selectionBoxGraphics: PIXI.Graphics;

  // Coordinate transformer
  private transformer: CoordinateTransformer;

  // Component renderers
  private tileRenderer: TileRenderer;
  private villagerRenderer: VillagerRenderer;
  private wallRenderer: WallRenderer;
  
  // UI Manager
  private uiManager: UIManager | null = null;

  constructor(
    worldContainer: PIXI.Container,
    initialMode: RenderingMode = RenderingMode.ISOMETRIC
  ) {
    // Create layers for proper rendering order
    this.groundLayer = new PIXI.Container();
    this.objectLayer = new PIXI.Container();
    this.unitLayer = new PIXI.Container();
    this.uiLayer = new PIXI.Container();
    
    // Set up sortable children for proper depth ordering
    this.groundLayer.sortableChildren = true;
    this.objectLayer.sortableChildren = true;
    this.unitLayer.sortableChildren = true;
    this.uiLayer.sortableChildren = true;
    
    // Add layers to the world container
    worldContainer.addChild(this.groundLayer);
    worldContainer.addChild(this.objectLayer);
    worldContainer.addChild(this.unitLayer);
    worldContainer.addChild(this.uiLayer);
    
    // Initialize coordinate transformer
    this.transformer = new CoordinateTransformer(
      worldContainer.x, 
      worldContainer.y,
      initialMode
    );
    
    // Create selection box graphics in the UI layer
    this.selectionBoxGraphics = new PIXI.Graphics();
    this.selectionBoxGraphics.zIndex = 100;
    this.uiLayer.addChild(this.selectionBoxGraphics);
    
    // Create component renderers
    this.tileRenderer = new TileRenderer(this.groundLayer, this.transformer);
    this.villagerRenderer = new VillagerRenderer(this.unitLayer, this.transformer);
    this.wallRenderer = new WallRenderer(this.objectLayer, this.transformer);
    
    // Set up event listeners for UI updates
    this.setupEventListeners();
  }

  /**
   * Set up UI event listeners to update visuals
   */
  private setupEventListeners(): void {
    // Build preview events
    document.addEventListener('buildPreviewChanged', ((e: CustomEvent) => {
      const { startTile, currentTile } = e.detail;
      this.showBuildPreview(startTile, currentTile);
    }) as EventListener);
    
    document.addEventListener('buildPreviewCleared', () => {
      this.clearBuildPreview();
    });
    
    // Selection box events
    document.addEventListener('selectionBoxChanged', ((e: CustomEvent) => {
      this.updateSelectionBox(
        e.detail.startX, 
        e.detail.startY, 
        e.detail.endX, 
        e.detail.endY
      );
    }) as EventListener);
    
    document.addEventListener('selectionBoxCleared', () => {
      this.clearSelectionBox();
    });
    
    // Tile hover events
    document.addEventListener('tileHoverIn', ((e: CustomEvent) => {
      this.tileRenderer.highlightTile(e.detail.x, e.detail.y, e.detail.color);
    }) as EventListener);
    
    document.addEventListener('tileHoverOut', ((e: CustomEvent) => {
      this.tileRenderer.clearHighlight(e.detail.x, e.detail.y);
    }) as EventListener);
  }

  /**
   * Set the UI Manager
   */
  public setUIManager(uiManager: UIManager): void {
    this.uiManager = uiManager;
    this.connectUIToRenderers();
  }
  
  /**
   * Connect UI manager to renderers
   */
  private connectUIToRenderers(): void {
    if (!this.uiManager) return;
    
    // Connect tile renderer events to UI
    this.tileRenderer.setTileClickHandler((x, y, event) => {
      this.uiManager?.handleTileClick(x, y, event);
    });
    
    this.tileRenderer.setTileHoverHandlers(
      (x, y) => this.uiManager?.handleTileHoverIn(x, y),
      (x, y) => this.uiManager?.handleTileHoverOut(x, y)
    );
    
    // Set up mouse event handling on the app canvas
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.addEventListener('mousedown', e => this.uiManager?.onMouseDown(e));
      canvas.addEventListener('mousemove', e => this.uiManager?.onMouseMove(e));
      canvas.addEventListener('mouseup', e => this.uiManager?.onMouseUp(e));
    }
    
    // Connect keyboard events
    document.addEventListener('keydown', e => this.uiManager?.handleKeyDown(e));
  }

  /**
   * Get the UI Manager
   */
  public getUIManager(): UIManager | null {
    return this.uiManager;
  }

  /**
   * Get the coordinate transformer
   */
  public getTransformer(): CoordinateTransformer {
    return this.transformer;
  }

  /**
   * Get the individual renderers
   */
  public getTileRenderer(): TileRenderer {
    return this.tileRenderer;
  }

  public getVillagerRenderer(): VillagerRenderer {
    return this.villagerRenderer;
  }

  public getWallRenderer(): WallRenderer {
    return this.wallRenderer;
  }

  /**
   * Get the rendering layers
   */
  public getLayers(): {
    groundLayer: PIXI.Container,
    objectLayer: PIXI.Container,
    unitLayer: PIXI.Container,
    uiLayer: PIXI.Container
  } {
    return {
      groundLayer: this.groundLayer,
      objectLayer: this.objectLayer,
      unitLayer: this.unitLayer,
      uiLayer: this.uiLayer
    };
  }

  /**
   * Change the rendering mode
   */
  public setRenderingMode(mode: RenderingMode): void {
    this.transformer.setRenderingMode(mode);
  }

  /**
   * Update world position (e.g. after window resize)
   */
  public updateWorldPosition(x: number, y: number): void {
    this.transformer.updateWorldPosition(x, y);
  }

  /**
   * Render all game components based on their current state
   */
  public renderGameState(
    gameMap: GameMap,
    villagerManager: VillagerManager,
    wallManager: WallManager
  ): void {
    // Render map tiles
    this.tileRenderer.renderMap(gameMap);
    
    // Render wall foundations
    this.wallRenderer.renderWalls(wallManager);
    
    // Render villagers
    this.villagerRenderer.renderVillagers(villagerManager);
  }

  /**
   * Refresh all visuals when rendering mode changes
   */
  public refreshAllVisuals(
    gameMap: GameMap,
    villagerManager: VillagerManager,
    wallManager: WallManager
  ): void {
    // Clear all layers
    this.groundLayer.removeChildren();
    this.objectLayer.removeChildren();
    this.unitLayer.removeChildren();
    
    // Preserve UI layer child (selection box)
    const preservedChildren = this.uiLayer.removeChildren(0, this.uiLayer.children.length - 1);
    this.uiLayer.addChild(this.selectionBoxGraphics);
    
    // Re-render everything
    this.renderGameState(gameMap, villagerManager, wallManager);
  }

  /**
   * Update visuals during game loop
   */
  public update(delta: number): void {
    // Update any animations or visual effects
    this.villagerRenderer.updateAnimations(delta);
    this.wallRenderer.updateAnimations(delta);
    
    // Sort layers for proper depth
    this.sortLayers();
  }

  /**
   * Sort containers for proper depth rendering
   */
  private sortLayers(): void {
    if (this.groundLayer.sortableChildren) this.groundLayer.sortChildren();
    if (this.objectLayer.sortableChildren) this.objectLayer.sortChildren();
    if (this.unitLayer.sortableChildren) this.unitLayer.sortChildren();
  }
  
  /**
   * Visual build preview for wall placement
   */
  private showBuildPreview(startTile: GridPosition, endTile: GridPosition): void {
    // Clear existing preview
    this.clearBuildPreview();
    
    // Calculate line of tiles between start and end
    const tiles = this.calculateLineTiles(startTile, endTile);
    
    // Create preview for each tile - implement through the tile renderer
    tiles.forEach(tile => {
      this.tileRenderer.highlightTile(tile.x, tile.y, 0x00FF00);
    });
  }
  
  /**
   * Clear build preview
   */
  private clearBuildPreview(): void {
    // We'll assume the tile renderer manages the previewed tiles
    // This would typically clear all highlighted tiles
    this.tileRenderer.clearAllHighlights();
  }
  
  /**
   * Bresenham's line algorithm for build preview
   */
  private calculateLineTiles(startTile: GridPosition, endTile: GridPosition): GridPosition[] {
    const tiles: GridPosition[] = [];
    
    // Bresenham's line algorithm
    const x1 = startTile.x;
    const y1 = startTile.y;
    const x2 = endTile.x;
    const y2 = endTile.y;
    
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;
    
    let x = x1;
    let y = y1;
    
    while (true) {
      tiles.push({ x, y });
      
      if (x === x2 && y === y2) break;
      
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
    
    return tiles;
  }
  
  /**
   * Update selection box visual
   */
  private updateSelectionBox(startX: number, startY: number, endX: number, endY: number): void {
    // Calculate the box dimensions
    const boxStartX = Math.min(startX, endX);
    const boxStartY = Math.min(startY, endY);
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);
    
    // Draw selection box
    this.selectionBoxGraphics.clear();
    this.selectionBoxGraphics.lineStyle(2, 0x00FF00, 0.8);
    this.selectionBoxGraphics.beginFill(0x00FF00, 0.1);
    this.selectionBoxGraphics.drawRect(boxStartX, boxStartY, width, height);
    this.selectionBoxGraphics.endFill();
  }
  
  /**
   * Clear selection box
   */
  private clearSelectionBox(): void {
    this.selectionBoxGraphics.clear();
  }
}