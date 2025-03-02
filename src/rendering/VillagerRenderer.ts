// src/rendering/VillagerRenderer.ts
import * as PIXI from 'pixi.js';
import { COLORS, TILE_WIDTH, TILE_HEIGHT } from '../constants';
import { Villager } from '../types';
import { CoordinateTransformer, RenderingMode } from '../utils/CoordinateTransformer';
import { VillagerManager } from '../components/Villager';
import { VillagerState } from '../components/VillagerStateMachine';

/**
 * Handles rendering of villagers
 */
export class VillagerRenderer {
  private unitLayer: PIXI.Container;
  private transformer: CoordinateTransformer;
  private villagerSprites: Map<Villager, PIXI.Container> = new Map();
  private animationTimers: Map<Villager, number> = new Map();

  constructor(unitLayer: PIXI.Container, transformer: CoordinateTransformer) {
    this.unitLayer = unitLayer;
    this.transformer = transformer;
  }

  /**
   * Render all villagers
   */
  public renderVillagers(villagerManager: VillagerManager): void {
    // Clear existing villagers
    this.unitLayer.removeChildren();
    this.villagerSprites.clear();
    this.animationTimers.clear();
    
    // Get all villagers
    const villagers = villagerManager.getAllVillagers();
    
    // Render each villager
    villagers.forEach(villager => {
      this.renderVillager(villager, villagerManager.getSelectedVillagers().includes(villager));
    });
  }

  /**
   * Render a single villager
   */
  private renderVillager(villager: Villager, isSelected: boolean): void {
    const pos = this.transformer.toScreen(villager.x, villager.y);
    
    // Create container for villager sprites
    const villagerContainer = new PIXI.Container();
    villagerContainer.x = pos.x;
    villagerContainer.y = pos.y;
    
    // Get current rendering mode
    const isIsometric = this.transformer.getRenderingMode() === RenderingMode.ISOMETRIC;
    
    // Create villager body sprite
    const villagerSprite = new PIXI.Graphics();
    
    if (isIsometric) {
      // Isometric villager style
      // Body
      villagerSprite.beginFill(COLORS.VILLAGER_BODY);
      villagerSprite.drawCircle(TILE_WIDTH / 2, TILE_HEIGHT / 3, 10);
      villagerSprite.endFill();
      
      // Head
      villagerSprite.beginFill(COLORS.VILLAGER_HEAD);
      villagerSprite.drawCircle(TILE_WIDTH / 2, TILE_HEIGHT / 6, 5);
      villagerSprite.endFill();
    } else {
      // Orthogonal villager style
      // Body
      villagerSprite.beginFill(COLORS.VILLAGER_BODY);
      villagerSprite.drawCircle(TILE_WIDTH / 2, TILE_HEIGHT / 2, TILE_WIDTH * 0.25);
      villagerSprite.endFill();
      
      // Direction indicator
      villagerSprite.beginFill(COLORS.VILLAGER_HEAD);
      villagerSprite.drawCircle(TILE_WIDTH / 2, TILE_HEIGHT / 3, TILE_WIDTH * 0.1);
      villagerSprite.endFill();
    }
    
    // Create selection ring
    const selectionRing = new PIXI.Graphics();
    selectionRing.lineStyle(2, COLORS.SELECTION_RING);
    
    if (isIsometric) {
      selectionRing.drawCircle(TILE_WIDTH / 2, TILE_HEIGHT / 3, 15);
    } else {
      selectionRing.drawCircle(TILE_WIDTH / 2, TILE_HEIGHT / 2, TILE_WIDTH * 0.35);
    }
    
    // Set visibility based on selection state
    selectionRing.visible = isSelected;
    
    // Add sprites to container
    villagerContainer.addChild(villagerSprite);
    villagerContainer.addChild(selectionRing);
    
    // Set z-index for proper depth sorting
    villagerContainer.zIndex = Math.floor(villager.y * 10);
    
    // Make villager interactive
    villagerContainer.interactive = true;
    villagerContainer.cursor = 'pointer';
    
    // Store references to the sprites
    villager.sprite = villagerContainer;
    villager.selectionRing = selectionRing;
    
    // Store in our map for later updates
    this.villagerSprites.set(villager, villagerContainer);
    
    // Add to layer
    this.unitLayer.addChild(villagerContainer);
    
    // Initialize animation timer
    this.animationTimers.set(villager, 0);
    
    // Set initial visual state based on current villager state
    this.updateVillagerVisuals(villager);
  }

  /**
   * Update a villager's position
   */
  public updateVillagerPosition(villager: Villager): void {
    const container = this.villagerSprites.get(villager);
    if (!container) return;
    
    // Update position
    const pos = this.transformer.toScreen(villager.x, villager.y);
    container.x = pos.x;
    container.y = pos.y;
    
    // Update z-index for depth sorting
    container.zIndex = Math.floor(villager.y * 10);
  }

  /**
   * Update a villager's selection state
   */
  public updateVillagerSelection(villager: Villager, isSelected: boolean): void {
    const container = this.villagerSprites.get(villager);
    if (!container || container.children.length < 2) return;
    
    // Update selection ring visibility
    const selectionRing = container.children[1] as PIXI.Graphics;
    selectionRing.visible = isSelected;
    
    // Store reference to the selection ring
    villager.selectionRing = selectionRing;
  }

  /**
   * Update all animations
   */
  public updateAnimations(delta: number): void {
    this.villagerSprites.forEach((container, villager) => {
      // Update selection ring animation if selected
      if (villager.selectionRing && villager.selectionRing.visible) {
        // Update animation timer
        let timer = (this.animationTimers.get(villager) || 0) + delta * 0.01;
        this.animationTimers.set(villager, timer);
        
        // Animate selection ring with pulsing effect
        const pulse = 0.9 + Math.sin(timer) * 0.1;
        villager.selectionRing.scale.set(pulse);
      }
      
      // Animate villagers based on their state
      const state = villager.stateMachine.getCurrentState();
      
      if (state === VillagerState.BUILDING) {
        // Building animation - slight bobbing
        let timer = (this.animationTimers.get(villager) || 0) + delta * 0.05;
        this.animationTimers.set(villager, timer);
        
        const bob = Math.sin(timer) * 2;
        container.y = this.transformer.toScreen(villager.x, villager.y).y + bob;
      }
    });
  }

  /**
   * Update villager visuals based on state
   */
  public updateVillagerVisuals(villager: Villager): void {
    const container = this.villagerSprites.get(villager);
    if (!container) return;
    
    const state = villager.stateMachine.getCurrentState();
    
    // Apply visual effects based on state
    switch (state) {
      case VillagerState.IDLE:
        container.alpha = 1.0;
        container.scale.set(1.0);
        break;
        
      case VillagerState.MOVING:
        container.alpha = 1.0;
        container.scale.set(1.0);
        break;
        
      case VillagerState.BUILDING:
        // Slight transparency to indicate building
        container.alpha = 0.8;
        break;
        
      case VillagerState.SELECTED:
        // Highlight selected villagers
        container.alpha = 1.0;
        // Selection ring is handled separately
        break;
        
      default:
        container.alpha = 1.0;
        container.scale.set(1.0);
    }
  }

  /**
   * Register click handler for villagers
   */
  public setVillagerClickHandler(
    handler: (villager: Villager, event: PIXI.FederatedPointerEvent) => void
  ): void {
    // Remove any existing listeners
    this.villagerSprites.forEach((sprite, villager) => {
      sprite.off('pointerdown');
    });
    
    // Add new click handlers
    this.villagerSprites.forEach((sprite, villager) => {
      sprite.on('pointerdown', (event) => {
        handler(villager, event);
        
        // Stop event propagation to prevent triggering tile handlers
        event.stopPropagation();
      });
    });
  }

  /**
   * Recreate all villager sprites with the current rendering mode
   */
  public refreshVillagerSprites(villagerManager: VillagerManager): void {
    // Remember selected villagers
    const selectedVillagers = villagerManager.getSelectedVillagers();
    
    // Re-render all villagers
    this.renderVillagers(villagerManager);
    
    // Restore selection state
    selectedVillagers.forEach(villager => {
      this.updateVillagerSelection(villager, true);
    });
  }
}
