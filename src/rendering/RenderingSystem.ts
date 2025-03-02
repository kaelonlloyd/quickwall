// src/rendering/RenderingSystem.ts
import * as PIXI from 'pixi.js';
import { CoordinateTransformer, RenderingMode } from '../utils/CoordinateTransformer';
import { TileRenderer } from './TileRenderer';
import { VillagerRenderer } from './VillagerRenderer';
import { WallRenderer } from './WallRenderer';
import { GameMap } from '../components/Map';
import { VillagerManager } from '../components/Villager';
import { WallManager } from '../components/WallManager';

/**
 * The main rendering system that coordinates all visual aspects of the game
 * This class creates and manages individual renderers for each game component
 */
export class RenderingSystem {
  // Layers for rendering
  private groundLayer: PIXI.Container;
  private objectLayer: PIXI.Container;
  private unitLayer: PIXI.Container;
  private uiLayer: PIXI.Container;

  // Coordinate transformer
  private transformer: CoordinateTransformer;

  // Component renderers
  private tileRenderer: TileRenderer;
  private villagerRenderer: VillagerRenderer;
  private wallRenderer: WallRenderer;

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
    
    // Create component renderers
    this.tileRenderer = new TileRenderer(this.groundLayer, this.transformer);
    this.villagerRenderer = new VillagerRenderer(this.unitLayer, this.transformer);
    this.wallRenderer = new WallRenderer(this.objectLayer, this.transformer);
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
}
