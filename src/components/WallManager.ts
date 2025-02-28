import * as PIXI from 'pixi.js';
import { COLORS, TILE_HEIGHT, TILE_WIDTH } from '../constants';
import { IsometricUtils } from '../utils/IsometricUtils';
import { BuildingStateMachine, BuildingState, BuildingEvent, BuildingConfig } from './BuildingStateMachine';
import { Villager, GridPosition } from '../types';
import { GameMap } from './Map';

export interface WallFoundation {
  x: number;
  y: number;
  sprite: PIXI.Graphics;
  progressBar: PIXI.Graphics;
  stateMachine: BuildingStateMachine;
  assignedVillagers: Villager[];
  occupiedPositions: { x: number, y: number }[];
  villagersCleared: boolean;
  status: string;
}

export class WallManager {
  private objectLayer: PIXI.Container;
  private isoUtils: IsometricUtils;
  private getVillagersOnTile: (x: number, y: number) => Villager[];
  private handleVillagersOnFoundation: (foundation: WallFoundation) => void;
  private forceVillagerMove: (villager: Villager) => boolean;
  
  private wallFoundations: WallFoundation[] = [];
  private static MAX_FOUNDATIONS = 100;
  
  constructor(
    objectLayer: PIXI.Container, 
    isoUtils: IsometricUtils,
    getVillagersOnTile: (x: number, y: number) => Villager[],
    handleVillagersOnFoundation: (foundation: WallFoundation) => void,
    forceVillagerMove: (villager: Villager) => boolean
  ) {
    this.objectLayer = objectLayer;
    this.isoUtils = isoUtils;
    this.getVillagersOnTile = getVillagersOnTile;
    this.handleVillagersOnFoundation = handleVillagersOnFoundation;
    this.forceVillagerMove = forceVillagerMove;
    this.objectLayer.sortableChildren = true;
  }
  
  public getWallFoundations(): WallFoundation[] {
    return this.wallFoundations;
  }

  public createWallFoundation(x: number, y: number): WallFoundation | null {
    // Check if we've exceeded max foundations
    if (this.wallFoundations.length >= WallManager.MAX_FOUNDATIONS) {
      this.cleanupOldestFoundation();
    }

    const pos = this.isoUtils.toScreen(x, y);
    
    // Get wall configuration
    const wallConfig = BuildingStateMachine.getBuildingConfigs()['wall'];
    
    // Create state machine context
    const context = {
      x,
      y,
      config: wallConfig,
      assignedVillagers: []
    };
    
    // Create state machine
    const stateMachine = new BuildingStateMachine(context);
    
    // Start construction
    stateMachine.handleEvent(BuildingEvent.START_CONSTRUCTION);
    
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
      stateMachine,
      assignedVillagers: [],
      occupiedPositions: [],
      villagersCleared: false
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

    // Check for villagers on the tile right away and try to move them
    const villagersOnTile = this.getVillagersOnTile(x, y);
    if (villagersOnTile.length > 0) {
      console.log(`Found ${villagersOnTile.length} villagers on new foundation at (${x}, ${y})`);
      
      // Try to force move each villager
      let allCleared = true;
      villagersOnTile.forEach(villager => {
        const moved = this.forceVillagerMove(villager);
        if (!moved) {
          allCleared = false;
        }
      });
      
      foundation.villagersCleared = allCleared;
    } else {
      foundation.villagersCleared = true; // No villagers to clear
    }

    return foundation;
  }

  public updateFoundationBuilding(delta: number): void {
    const foundationsToUpdate = [...this.wallFoundations];
    
    foundationsToUpdate.forEach(foundation => {
      // Progress construction
      foundation.stateMachine.handleEvent(BuildingEvent.PROGRESS_CONSTRUCTION, { 
        progress: delta * 10 // Adjust progress speed as needed
      });
      
      // Update progress bar
      foundation.progressBar.visible = true;
      foundation.progressBar.scale.x = foundation.stateMachine.getConstructionProgress() / 100;
      
      // Check if construction is complete
      if (foundation.stateMachine.getCurrentState() === BuildingState.COMPLETE) {
        this.completeFoundation(foundation);
      }
    });
  }

  private completeFoundation(foundation: WallFoundation): void {
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
    foundation.occupiedPositions = [];
  }

  private cleanupOldestFoundation(): void {
    // Find the oldest incomplete foundation
    const oldestIndex = this.wallFoundations.findIndex(f => 
      f.stateMachine.getCurrentState() !== BuildingState.COMPLETE
    );

    if (oldestIndex !== -1) {
      const foundationToRemove = this.wallFoundations[oldestIndex];
      this.removeFoundation(foundationToRemove);
    }
  }

  public removeFoundation(foundation: WallFoundation): void {
    // Remove from layer
    this.objectLayer.removeChild(foundation.sprite);
    this.objectLayer.removeChild(foundation.progressBar);
    
    // Destroy graphics to free memory
    foundation.sprite.destroy();
    foundation.progressBar.destroy();
    
    // Remove from array
    const index = this.wallFoundations.indexOf(foundation);
    if (index !== -1) {
      this.wallFoundations.splice(index, 1);
    }
    
    // Clear any assigned villagers
    foundation.assignedVillagers.forEach(villager => {
      if (villager.currentBuildTask && 
          villager.currentBuildTask.type === 'wall' && 
          villager.currentBuildTask.foundation?.x === foundation.x && 
          villager.currentBuildTask.foundation?.y === foundation.y) {
        villager.currentBuildTask = null;
      }
    });
  }

  public findAvailableBuildPosition(foundation: WallFoundation): GridPosition | null {
    // Potential adjacent tiles around the foundation
    const adjacentPositions: GridPosition[] = [
      { x: foundation.x - 1, y: foundation.y },     // Left
      { x: foundation.x + 1, y: foundation.y },     // Right
      { x: foundation.x, y: foundation.y - 1 },     // Top
      { x: foundation.x, y: foundation.y + 1 },     // Bottom
      { x: foundation.x - 1, y: foundation.y - 1 }, // Top-Left
      { x: foundation.x + 1, y: foundation.y - 1 }, // Top-Right
      { x: foundation.x - 1, y: foundation.y + 1 }, // Bottom-Left
      { x: foundation.x + 1, y: foundation.y + 1 }, // Bottom-Right
    ];
    
    // Filter to valid positions
    const availablePositions = adjacentPositions.filter(pos => {
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
    
    // Sort positions by distance to foundation center
    availablePositions.sort((a, b) => {
      const distA = Math.sqrt(Math.pow(a.x - foundation.x, 2) + Math.pow(a.y - foundation.y, 2));
      const distB = Math.sqrt(Math.pow(b.x - foundation.x, 2) + Math.pow(b.y - foundation.y, 2));
      return distA - distB;
    });
    
    // Return the closest available position
    return availablePositions[0];
  }

  public occupyBuildPosition(foundation: WallFoundation, position: GridPosition): void {
    foundation.occupiedPositions.push({ x: position.x, y: position.y });
  }

  public releaseBuildPosition(foundation: WallFoundation, position: GridPosition): void {
    foundation.occupiedPositions = foundation.occupiedPositions.filter(
      pos => pos.x !== position.x || pos.y !== position.y
    );
  }

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