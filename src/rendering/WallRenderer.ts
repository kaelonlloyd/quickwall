// src/rendering/WallRenderer.ts
import * as PIXI from 'pixi.js';
import { COLORS, TILE_WIDTH, TILE_HEIGHT } from '../constants';
import { WallFoundation } from '../components/WallManager';
import { CoordinateTransformer, RenderingMode } from '../utils/CoordinateTransformer';
import { WallManager } from '../components/WallManager';
import { BuildingState } from '../components/BuildingStateMachine';

/**
 * Handles rendering of walls and wall foundations
 */
export class WallRenderer {
  private objectLayer: PIXI.Container;
  private transformer: CoordinateTransformer;
  private wallSprites: Map<WallFoundation, {
    foundation: PIXI.Graphics,
    progressBar: PIXI.Graphics,
    timeText?: PIXI.Text
  }> = new Map();
  private animationTimers: Map<WallFoundation, number> = new Map();
  private showBuildTimes: boolean = false;

  constructor(objectLayer: PIXI.Container, transformer: CoordinateTransformer) {
    this.objectLayer = objectLayer;
    this.transformer = transformer;
  }

  /**
   * Set whether to show build time displays
   */
  public setShowBuildTimes(show: boolean): void {
    this.showBuildTimes = show;
    
    // Update visibility of existing time texts
    this.wallSprites.forEach((sprites, foundation) => {
      if (sprites.timeText) {
        sprites.timeText.visible = show && foundation.status !== 'complete';
      }
    });
  }

  /**
   * Render all walls and foundations
   */
  public renderWalls(wallManager: WallManager): void {
    // Clear existing wall sprites
    this.objectLayer.removeChildren();
    this.wallSprites.clear();
    this.animationTimers.clear();
    
    // Get all foundations
    const foundations = wallManager.getWallFoundations();
    
    // Render each foundation
    foundations.forEach(foundation => {
      this.renderWallFoundation(foundation, wallManager);
    });
  }

  /**
   * Render a single wall foundation
   */
  private renderWallFoundation(foundation: WallFoundation, wallManager: WallManager): void {
    const pos = this.transformer.toScreen(foundation.x, foundation.y);
    
    // Create foundation sprite
    const foundationSprite = new PIXI.Graphics();
    
    // Get current rendering mode
    const isIsometric = this.transformer.getRenderingMode() === RenderingMode.ISOMETRIC;
    
    // Draw foundation based on its status and the current rendering mode
    if (foundation.status === 'complete') {
      // Completed wall
      foundationSprite.beginFill(COLORS.WALL);
      
      if (isIsometric) {
        // Isometric wall shape
        foundationSprite.moveTo(TILE_WIDTH / 2, 0);
        foundationSprite.lineTo(TILE_WIDTH, TILE_HEIGHT / 2);
        foundationSprite.lineTo(TILE_WIDTH / 2, TILE_HEIGHT);
        foundationSprite.lineTo(0, TILE_HEIGHT / 2);
        foundationSprite.lineTo(TILE_WIDTH / 2, 0);
      } else {
        // Orthogonal wall shape
        foundationSprite.drawRect(0, 0, TILE_WIDTH, TILE_HEIGHT);
      }
      
      foundationSprite.endFill();
    } else {
      // Foundation or in-progress
      foundationSprite.beginFill(COLORS.WALL, 0.3);
      foundationSprite.lineStyle(2, COLORS.WALL, 0.5);
      
      if (isIsometric) {
        // Isometric foundation shape
        foundationSprite.moveTo(TILE_WIDTH / 2, 0);
        foundationSprite.lineTo(TILE_WIDTH, TILE_HEIGHT / 2);
        foundationSprite.lineTo(TILE_WIDTH / 2, TILE_HEIGHT);
        foundationSprite.lineTo(0, TILE_HEIGHT / 2);
        foundationSprite.lineTo(TILE_WIDTH / 2, 0);
      } else {
        // Orthogonal foundation shape
        foundationSprite.drawRect(0, 0, TILE_WIDTH, TILE_HEIGHT);
      }
      
      foundationSprite.endFill();
    }
    
    // Create progress bar
    const progressBar = new PIXI.Graphics();
    progressBar.beginFill(0x00FF00);
    
    if (isIsometric) {
      // Position above the isometric tile
      progressBar.drawRect(0, 0, TILE_WIDTH, 5);
      progressBar.x = pos.x;
      progressBar.y = pos.y - 10;
    } else {
      // Position at the top of the orthogonal tile
      progressBar.drawRect(0, 0, TILE_WIDTH, 5);
      progressBar.x = pos.x;
      progressBar.y = pos.y;
    }
    
    progressBar.endFill();
    progressBar.scale.x = foundation.buildProgress / 100;
    progressBar.visible = foundation.isBuilding;
    
    // Position foundation sprite
    foundationSprite.x = pos.x;
    foundationSprite.y = pos.y;
    
    // Set z-index for proper depth sorting
    foundationSprite.zIndex = foundation.y;
    progressBar.zIndex = foundation.y;
    
    // Make foundation interactive
    foundationSprite.interactive = true;
    foundationSprite.cursor = 'pointer';
    
    // Store tile coordinates for reference
    (foundationSprite as any).tileX = foundation.x;
    (foundationSprite as any).tileY = foundation.y;
    
    // Add sprites to layer
    this.objectLayer.addChild(foundationSprite);
    this.objectLayer.addChild(progressBar);
    
    // Store references to the foundation's sprite, progress bar, and wall foundation
    foundation.sprite = foundationSprite;
    foundation.progressBar = progressBar;
    
    // Store in our map for later updates
    this.wallSprites.set(foundation, {
      foundation: foundationSprite,
      progressBar: progressBar
    });
    
    // Add build time display if enabled
    if (this.showBuildTimes && foundation.status !== 'complete') {
      this.renderBuildTimeDisplay(foundation, wallManager);
    }
    
    // Initialize animation timer
    this.animationTimers.set(foundation, 0);
  }

  /**
   * Create or update build time display for a foundation
   */
  private renderBuildTimeDisplay(foundation: WallFoundation, wallManager: WallManager): void {
    if (!this.showBuildTimes || foundation.status === 'complete') return;
    
    // Get the sprites for this foundation
    const sprites = this.wallSprites.get(foundation);
    if (!sprites) return;
    
    // Calculate estimated build time
    const estimatedTime = wallManager.calculateEstimatedBuildTime(foundation);
    const formattedTime = wallManager.formatBuildTime(estimatedTime);
    
    // Check if we already have a time text
    if (!sprites.timeText) {
      // Create new text
      const pos = this.transformer.toScreen(foundation.x, foundation.y);
      const isIsometric = this.transformer.getRenderingMode() === RenderingMode.ISOMETRIC;
      
      const buildTimeText = new PIXI.Text(formattedTime, {
        fontFamily: 'Arial',
        fontSize: 12,
        fill: 0xFFFFFF,
        align: 'center',
        stroke: 0x000000,
        strokeThickness: 3
      });
      
      // Position based on rendering mode
      if (isIsometric) {
        buildTimeText.x = pos.x + TILE_WIDTH / 2;
        buildTimeText.y = pos.y - 25;
      } else {
        buildTimeText.x = pos.x + TILE_WIDTH / 2;
        buildTimeText.y = pos.y - 15;
      }
      
      buildTimeText.anchor.set(0.5, 0.5);
      
      // Add to object layer
      this.objectLayer.addChild(buildTimeText);
      
      // Store reference
      sprites.timeText = buildTimeText;
      foundation.buildTimeText = buildTimeText;
    } else {
      // Update existing text
      sprites.timeText.text = formattedTime;
    }
  }

  /**
   * Update animations for all wall foundations
   */
  public updateAnimations(delta: number): void {
    this.wallSprites.forEach((sprites, foundation) => {
      // Update progress bar
      if (foundation.isBuilding && sprites.progressBar) {
        sprites.progressBar.scale.x = foundation.buildProgress / 100;
        sprites.progressBar.visible = true;
      } else if (sprites.progressBar) {
        sprites.progressBar.visible = false;
      }
      
      // If building, add pulsing animation to foundation
      if (foundation.isBuilding && foundation.status !== 'complete') {
        // Update animation timer
        let timer = (this.animationTimers.get(foundation) || 0) + delta * 0.01;
        this.animationTimers.set(foundation, timer);
        
        // Pulse effect
        const pulse = 1 + Math.sin(timer) * 0.05;
        sprites.foundation.scale.set(pulse);
      } else {
        // Reset scale
        sprites.foundation.scale.set(1);
      }
      
      // Update build time display if needed
      if (this.showBuildTimes && foundation.status !== 'complete') {
        this.updateBuildTimeDisplay(foundation);
      }
    });
  }

  /**
   * Update build time display position and content
   */
  private updateBuildTimeDisplay(foundation: WallFoundation): void {
    const sprites = this.wallSprites.get(foundation);
    if (!sprites || !sprites.timeText) return;
    
    // Update position in case rendering mode changed
    const pos = this.transformer.toScreen(foundation.x, foundation.y);
    const isIsometric = this.transformer.getRenderingMode() === RenderingMode.ISOMETRIC;
    
    if (isIsometric) {
      sprites.timeText.x = pos.x + TILE_WIDTH / 2;
      sprites.timeText.y = pos.y - 25;
    } else {
      sprites.timeText.x = pos.x + TILE_WIDTH / 2;
      sprites.timeText.y = pos.y - 15;
    }
  }

  /**
   * Register click handler for wall foundations
   */
  public setFoundationClickHandler(
    handler: (foundation: WallFoundation, event: PIXI.FederatedPointerEvent) => void
  ): void {
    // Remove any existing listeners
    this.wallSprites.forEach((sprites, foundation) => {
      sprites.foundation.off('pointerdown');
    });
    
    // Add new click handlers
    this.wallSprites.forEach((sprites, foundation) => {
      sprites.foundation.on('pointerdown', (event) => {
        handler(foundation, event);
        
        // Stop event propagation
        event.stopPropagation();
      });
    });
  }

  /**
   * Refresh all foundation sprites with the current rendering mode
   */
  public refreshFoundationSprites(wallManager: WallManager): void {
    // Re-render all foundations
    this.renderWalls(wallManager);
  }
}
