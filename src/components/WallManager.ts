import * as PIXI from 'pixi.js';
import { COLORS, TILE_HEIGHT, TILE_WIDTH } from '../constants';
import { IsometricUtils } from '../utils/IsometricUtils';
import { Villager } from '../types';

export interface WallFoundation {
  x: number;
  y: number;
  sprite: PIXI.Graphics;
  progressBar: PIXI.Graphics;
  health: number;
  maxHealth: number;
  assignedVillagers: Villager[];
  isBuilding: boolean;
  buildProgress: number;
  status: 'foundation' | 'building' | 'complete';
}

export class WallManager {
  private objectLayer: PIXI.Container;
  private isoUtils: IsometricUtils;
  private wallFoundations: WallFoundation[] = [];
  private static MAX_FOUNDATIONS = 100; // Limit total number of foundations

  constructor(objectLayer: PIXI.Container, isoUtils: IsometricUtils) {
    this.objectLayer = objectLayer;
    this.isoUtils = isoUtils;
  }

  public createWallFoundation(x: number, y: number): WallFoundation | null {
    // Check if we've exceeded max foundations
    if (this.wallFoundations.length >= WallManager.MAX_FOUNDATIONS) {
      // Remove the oldest, non-building foundation
      this.cleanupOldestFoundation();
    }

    const pos = this.isoUtils.toScreen(x, y);
    
    // Create wall foundation sprite
    const wallFoundation = new PIXI.Graphics();
    
    // Draw foundation with a distinct style
    wallFoundation.beginFill(COLORS.WALL, 0.3);
    wallFoundation.lineStyle(2, COLORS.WALL, 0.5);
    wallFoundation.moveTo(TILE_WIDTH / 2, 0);
    wallFoundation.lineTo(TILE_WIDTH, TILE_HEIGHT / 2);
    wallFoundation.lineTo(TILE_WIDTH / 2, TILE_HEIGHT);
    wallFoundation.lineTo(0, TILE_HEIGHT / 2);
    wallFoundation.lineTo(TILE_WIDTH / 2, 0);
    wallFoundation.endFill();

    // Progress bar
    const progressBar = new PIXI.Graphics();
    progressBar.beginFill(0x00FF00);
    progressBar.drawRect(0, -10, TILE_WIDTH, 5);
    progressBar.endFill();
    progressBar.scale.x = 0;
    progressBar.visible = false;

    // Position sprites
    wallFoundation.x = pos.x;
    wallFoundation.y = pos.y;
    progressBar.x = pos.x;
    progressBar.y = pos.y - 10;

    // Create wall foundation object
    const foundation: WallFoundation = {
      x,
      y,
      sprite: wallFoundation,
      progressBar,
      health: 0,
      maxHealth: 250,
      assignedVillagers: [],
      isBuilding: false,
      buildProgress: 0,
      status: 'foundation'
    };

    // Add to layer
    this.objectLayer.addChild(wallFoundation);
    this.objectLayer.addChild(progressBar);
    this.wallFoundations.push(foundation);

    return foundation;
  }

  private cleanupOldestFoundation(): void {
    // Find the oldest non-building foundation
    const oldestIndex = this.wallFoundations.findIndex(f => 
      f.status !== 'building' && f.status !== 'complete'
    );

    if (oldestIndex !== -1) {
      const foundationToRemove = this.wallFoundations[oldestIndex];
      
      // Remove from layer
      this.objectLayer.removeChild(foundationToRemove.sprite);
      this.objectLayer.removeChild(foundationToRemove.progressBar);
      
      // Destroy graphics to free memory
      foundationToRemove.sprite.destroy();
      foundationToRemove.progressBar.destroy();
      
      // Remove from array
      this.wallFoundations.splice(oldestIndex, 1);
    }
  }

  public updateFoundationBuilding(delta: number): void {
    const foundationsToUpdate = [...this.wallFoundations];
    
    foundationsToUpdate.forEach(foundation => {
      if (foundation.isBuilding && foundation.assignedVillagers.length > 0) {
        // Calculate build speed based on number of villagers
        const buildSpeed = 7 / (foundation.assignedVillagers.length + 2);
        
        foundation.buildProgress += delta * buildSpeed;
        
        // Update progress bar
        foundation.progressBar.visible = true;
        foundation.progressBar.scale.x = Math.min(1, foundation.buildProgress / foundation.maxHealth);
        
        // Create pulsing effect for building foundations
        this.applyPulseEffect(foundation);
        
        // Update wall sprite as it builds
        if (foundation.status === 'foundation' && foundation.buildProgress > 0) {
          foundation.status = 'building';
          foundation.sprite.clear();
          foundation.sprite.beginFill(COLORS.WALL, 0.6);
          foundation.sprite.lineStyle(2, COLORS.WALL, 0.8);
          foundation.sprite.moveTo(TILE_WIDTH / 2, 0);
          foundation.sprite.lineTo(TILE_WIDTH, TILE_HEIGHT / 2);
          foundation.sprite.lineTo(TILE_WIDTH / 2, TILE_HEIGHT);
          foundation.sprite.lineTo(0, TILE_HEIGHT / 2);
          foundation.sprite.lineTo(TILE_WIDTH / 2, 0);
          foundation.sprite.endFill();
        }
        
        // Check if building is complete
        if (foundation.buildProgress >= foundation.maxHealth) {
          this.completeFoundation(foundation);
        }
      }
    });
  }

  private applyPulseEffect(foundation: WallFoundation): void {
    // Create a pulsing animation effect for building foundations
    const time = Date.now() * 0.005; // Use time for smooth animation
    const pulseScale = 1 + Math.sin(time) * 0.1; // Subtle scaling
    const pulseAlpha = 0.6 + Math.sin(time) * 0.2; // Subtle alpha change
    
    foundation.sprite.scale.set(pulseScale);
    foundation.sprite.alpha = pulseAlpha;
  }

  private completeFoundation(foundation: WallFoundation): void {
    // Mark foundation as fully built
    foundation.isBuilding = false;
    foundation.buildProgress = foundation.maxHealth;
    foundation.status = 'complete';
    
    // Fully solid wall appearance
    foundation.sprite.clear();
    foundation.sprite.beginFill(COLORS.WALL);
    foundation.sprite.moveTo(TILE_WIDTH / 2, 0);
    foundation.sprite.lineTo(TILE_WIDTH, TILE_HEIGHT / 2);
    foundation.sprite.lineTo(TILE_WIDTH / 2, TILE_HEIGHT);
    foundation.sprite.lineTo(0, TILE_HEIGHT / 2);
    foundation.sprite.lineTo(TILE_WIDTH / 2, 0);
    foundation.sprite.endFill();
    
    // Stop pulsing and reset scale/alpha
    foundation.sprite.scale.set(1);
    foundation.sprite.alpha = 1;
    
    // Hide progress bar
    foundation.progressBar.visible = false;
    
    // Clear assigned villagers
    foundation.assignedVillagers = [];
  }

  public getWallFoundations(): WallFoundation[] {
    return this.wallFoundations;
  }

  // Method to clean up all foundations (call on game reset or exit)
  public cleanupAllFoundations(): void {
    this.wallFoundations.forEach(foundation => {
      this.objectLayer.removeChild(foundation.sprite);
      this.objectLayer.removeChild(foundation.progressBar);
      foundation.sprite.destroy();
      foundation.progressBar.destroy();
    });
    this.wallFoundations = [];
  }
}