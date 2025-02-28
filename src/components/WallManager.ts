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
  occupiedPositions: { x: number, y: number }[]; // Track positions occupied by villagers
}

export class WallManager {
  private objectLayer: PIXI.Container;
  private isoUtils: IsometricUtils;
  private wallFoundations: WallFoundation[] = [];
  private static MAX_FOUNDATIONS = 100; // Limit total number of foundations

  constructor(objectLayer: PIXI.Container, isoUtils: IsometricUtils) {
    this.objectLayer = objectLayer;
    this.isoUtils = isoUtils;
    
    // Enable sorting in the object layer for proper depth
    this.objectLayer.sortableChildren = true;
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
    
    // Set zIndex based on y position for proper depth sorting
    wallFoundation.zIndex = y;
    progressBar.zIndex = y;

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
      status: 'foundation',
      occupiedPositions: []
    };

    // Make the foundation sprites interactive for click handling
    wallFoundation.interactive = true;
    wallFoundation.cursor = 'pointer';
    
    // Store tile coordinates for reference
    (wallFoundation as any).tileX = x;
    (wallFoundation as any).tileY = y;

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
      this.removeFoundation(foundationToRemove);
    }
  }
  
  public removeFoundation(foundation: WallFoundation): void {
    // Find index in array
    const index = this.wallFoundations.indexOf(foundation);
    if (index === -1) return;
    
    // Remove from layer
    this.objectLayer.removeChild(foundation.sprite);
    this.objectLayer.removeChild(foundation.progressBar);
    
    // Destroy graphics to free memory
    foundation.sprite.destroy();
    foundation.progressBar.destroy();
    
    // Remove from array
    this.wallFoundations.splice(index, 1);
    
    // Clear any assigned villagers
    foundation.assignedVillagers.forEach(villager => {
      if (villager.currentBuildTask && 
          villager.currentBuildTask.type === 'wall' && 
          villager.currentBuildTask.foundation.x === foundation.x && 
          villager.currentBuildTask.foundation.y === foundation.y) {
        villager.currentBuildTask = undefined;
      }
    });
    
    foundation.assignedVillagers = [];
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
    foundation.assignedVillagers.forEach(villager => {
      if (villager.currentBuildTask) {
        villager.currentBuildTask = undefined;
      }
    });
    foundation.assignedVillagers = [];
    foundation.occupiedPositions = [];
  }

  public getWallFoundations(): WallFoundation[] {
    return this.wallFoundations;
  }
  
  // Find an available position around the foundation for a villager to build from
  public findAvailableBuildPosition(foundation: WallFoundation): { x: number, y: number } | null {
    // Potential adjacent tiles around the foundation - include more diagonal positions
    const potentialTiles = [
      // Cardinal directions
      { x: foundation.x - 1, y: foundation.y },     // Left
      { x: foundation.x + 1, y: foundation.y },     // Right
      { x: foundation.x, y: foundation.y - 1 },     // Top
      { x: foundation.x, y: foundation.y + 1 },     // Bottom
      
      // Diagonal directions
      { x: foundation.x - 1, y: foundation.y - 1 }, // Top-Left
      { x: foundation.x + 1, y: foundation.y - 1 }, // Top-Right
      { x: foundation.x - 1, y: foundation.y + 1 }, // Bottom-Left
      { x: foundation.x + 1, y: foundation.y + 1 }, // Bottom-Right
      
      // Additional in-between positions for more granular placement
      { x: foundation.x - 1, y: foundation.y - 0.5 }, // Left-TopLeft
      { x: foundation.x - 1, y: foundation.y + 0.5 }, // Left-BottomLeft
      { x: foundation.x + 1, y: foundation.y - 0.5 }, // Right-TopRight
      { x: foundation.x + 1, y: foundation.y + 0.5 }, // Right-BottomRight
      { x: foundation.x - 0.5, y: foundation.y - 1 }, // TopLeft-Top
      { x: foundation.x + 0.5, y: foundation.y - 1 }, // TopRight-Top
      { x: foundation.x - 0.5, y: foundation.y + 1 }, // BottomLeft-Bottom
      { x: foundation.x + 0.5, y: foundation.y + 1 }  // BottomRight-Bottom
    ];
    
    // Filter to valid positions (bounds check and not occupied)
    const availablePositions = potentialTiles.filter(pos => {
      // Check map boundaries
      if (pos.x < 0 || pos.x >= 20 || pos.y < 0 || pos.y >= 20) {
        return false;
      }
      
      // Check if position is already occupied by another villager
      return !foundation.occupiedPositions.some(
        occupied => Math.abs(occupied.x - pos.x) < 0.2 && Math.abs(occupied.y - pos.y) < 0.2
      );
    });
    
    if (availablePositions.length === 0) {
      return null;
    }
    
    // Sort positions by distance to foundation center for more predictable assignment
    availablePositions.sort((a, b) => {
      const distA = Math.sqrt(Math.pow(a.x - foundation.x, 2) + Math.pow(a.y - foundation.y, 2));
      const distB = Math.sqrt(Math.pow(b.x - foundation.x, 2) + Math.pow(b.y - foundation.y, 2));
      return distA - distB;
    });
    
    // Return the closest available position
    return availablePositions[0];
  }
  
  // Mark a position as occupied for a foundation
  public occupyBuildPosition(foundation: WallFoundation, position: { x: number, y: number }): void {
    foundation.occupiedPositions.push({ x: position.x, y: position.y });
  }
  
  // Release a position when a villager stops building
  public releaseBuildPosition(foundation: WallFoundation, position: { x: number, y: number }): void {
    foundation.occupiedPositions = foundation.occupiedPositions.filter(
      pos => pos.x !== position.x || pos.y !== position.y
    );
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