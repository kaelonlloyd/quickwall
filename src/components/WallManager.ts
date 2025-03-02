// src/components/WallManager.ts - Updated to remove rendering logic
import { Villager, GridPosition } from '../types';
import { BuildingStateMachine, BuildingState, BuildingEvent, BuildingConfig } from './BuildingStateMachine';

/**
 * Wall foundation data structure
 * Rendering properties are now managed separately by WallRenderer
 */
export interface WallFoundation {
    id: string;               // Unique identifier for the foundation
    x: number;                // Grid X position
    y: number;                // Grid Y position
    stateMachine: BuildingStateMachine; // State machine for the wall's state
    assignedVillagers: Villager[]; // Villagers assigned to build this wall
    occupiedPositions: GridPosition[]; // Positions around the wall that are occupied
    villagersCleared: boolean; // Whether villagers have been cleared from foundation
    status: 'foundation' | 'building' | 'complete'; // Construction status
    isBuilding: boolean;      // Flag to track active building
    buildProgress: number;    // Track actual build progress (0-100)
    
    // These will be set by the renderer
    sprite?: any;             // Reference to the sprite (managed by renderer)
    progressBar?: any;        // Reference to the progress bar (managed by renderer)
    buildTimeText?: any;      // Reference to the build time text (managed by renderer)
}

/**
 * Manages wall foundations and their construction state
 * No longer responsible for rendering
 */
export class WallManager {
  private wallFoundations: WallFoundation[] = [];
  private static MAX_FOUNDATIONS = 100;
  
  constructor() {
    // No dependencies on rendering
    console.log("WallManager initialized (logic only)");
  }
  
  /**
   * Get all wall foundations
   */
  public getWallFoundations(): WallFoundation[] {
    return this.wallFoundations;
  }

  /**
   * Create a new wall foundation
   */
  public createWallFoundation(x: number, y: number): WallFoundation | null {
    // Check if we've exceeded max foundations
    if (this.wallFoundations.length >= WallManager.MAX_FOUNDATIONS) {
      this.cleanupOldestFoundation();
    }
    
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
    
    // Create foundation object with minimal properties
    const foundation: WallFoundation = {
        id: `wall_${Date.now()}_${x}_${y}`,
        x,
        y,
        stateMachine,
        assignedVillagers: [],
        occupiedPositions: [],
        villagersCleared: false,
        status: 'foundation',
        isBuilding: false,
        buildProgress: 0
    };
    
    // Add to foundations array
    this.wallFoundations.push(foundation);
    
    return foundation;
  }

  /**
   * Update foundation building progress
   */
  public updateFoundationBuilding(delta: number): void {
    const foundationsToUpdate = [...this.wallFoundations];
    
    foundationsToUpdate.forEach(foundation => {
      // Skip completed foundations
      if (foundation.status === 'complete') {
        return;
      }
      
      // Only progress if there are assigned villagers in position and building
      const activeBuilders = this.countActiveBuilders(foundation);
      
      if (activeBuilders > 0) {
        // Foundation has active builders, allow construction to progress
        foundation.isBuilding = true;
        foundation.status = 'building';
        
        // Get target duration from the building config
        const buildingConfig = foundation.stateMachine.getConfig();
        const targetDuration = buildingConfig.targetBuildDuration || 7; // Default to 7 if not set
        
        // Apply the formula (3t)/(n/2) to calculate build duration
        const totalBuildDuration = (3 * targetDuration) / (activeBuilders / 2);
        
        // Delta is in frames (usually ~1/60 of a second)
        // 100% progress over totalBuildDuration seconds
        const progressPerFrame = (100 / (totalBuildDuration * 60)) * delta;
        
        // Update progress
        foundation.buildProgress += progressPerFrame;
        
        // Update state machine
        foundation.stateMachine.handleEvent(BuildingEvent.PROGRESS_CONSTRUCTION, {
          progress: progressPerFrame
        });
        
        // Check if construction is complete
        if (foundation.buildProgress >= 100 || 
            foundation.stateMachine.getCurrentState() === BuildingState.COMPLETE) {
          this.completeFoundation(foundation);
        }
      } else {
        // No active builders, foundation is not actively building
        foundation.isBuilding = false;
      }
    });
  }
  
  /**
   * Count active builders working on a foundation
   */
  private countActiveBuilders(foundation: WallFoundation): number {
    // Filter assigned villagers to those that are:
    // 1. In position (adjacent to foundation)
    // 2. Not moving
    // 3. Have a current build task assigned to this foundation
    let activeCount = 0;
    
    for (const villager of foundation.assignedVillagers) {
      // Check if villager is adjacent to foundation
      const isAdjacent = this.isVillagerAdjacentToFoundation(villager, foundation);
      
      // Check if villager is not moving and has correct build task
      const isBuilding = !villager.moving && 
                         villager.currentBuildTask && 
                         villager.currentBuildTask.type === 'wall' &&
                         villager.currentBuildTask.foundation &&
                         villager.currentBuildTask.foundation.x === foundation.x &&
                         villager.currentBuildTask.foundation.y === foundation.y;
      
      if (isAdjacent && isBuilding) {
        activeCount++;
      }
    }
    
    return activeCount;
  }
  
  /**
   * Check if a villager is adjacent to a foundation
   */
  private isVillagerAdjacentToFoundation(villager: Villager, foundation: WallFoundation): boolean {
    // Calculate grid distance
    const dx = Math.abs(villager.x - foundation.x);
    const dy = Math.abs(villager.y - foundation.y);
    
    // Check if adjacent (including diagonals) but not on the same tile
    return (dx <= 1 && dy <= 1) && !(dx === 0 && dy === 0);
  }

  /**
   * Complete a wall foundation
   */
  private completeFoundation(foundation: WallFoundation): void {
    foundation.status = 'complete';
    foundation.isBuilding = false;
    foundation.buildProgress = 100;
    
    // Clear assigned villagers
    foundation.assignedVillagers = [];
    foundation.occupiedPositions = [];
  }

  /**
   * Remove the oldest incomplete foundation
   */
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

  /**
   * Remove a foundation
   */
  public removeFoundation(foundation: WallFoundation): void {
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

  /**
   * Find an available position around a foundation for building
   */
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
      // Skip out of bounds positions
      if (pos.x < 0 || pos.x >= 100 || pos.y < 0 || pos.y >= 100) {
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

  /**
   * Track that a position is being used by a villager
   */
  public occupyBuildPosition(foundation: WallFoundation, position: GridPosition): void {
    foundation.occupiedPositions.push({ x: position.x, y: position.y });
  }

  /**
   * Release a position that was being used by a villager
   */
  public releaseBuildPosition(foundation: WallFoundation, position: GridPosition): void {
    foundation.occupiedPositions = foundation.occupiedPositions.filter(
      pos => pos.x !== position.x || pos.y !== position.y
    );
  }

  /**
   * Remove all foundations
   */
  public cleanupAllFoundations(): void {
    // Just clear the array - rendering cleanup is handled separately
    this.wallFoundations = [];
  }

  /**
   * Calculate estimated build time for a foundation
   */
  public calculateEstimatedBuildTime(foundation: WallFoundation): number {
    const activeBuilders = this.countActiveBuilders(foundation);
    if (activeBuilders === 0) return Infinity; // No builders, infinite time
    
    // Get the target duration from the building config
    const buildingConfig = foundation.stateMachine.getConfig();
    const targetDuration = buildingConfig.targetBuildDuration || 7; // Default if not set
    
    // Apply the formula (3t)/(n/2)
    const estimatedDuration = (3 * targetDuration) / (activeBuilders / 2);
    
    // Calculate remaining time based on current progress
    const remainingPercentage = 100 - foundation.buildProgress;
    return (estimatedDuration * remainingPercentage) / 100;
  }
  
  /**
   * Format a time in seconds into a readable string
   */
  public formatBuildTime(seconds: number): string {
    if (seconds === Infinity) return "∞";
    if (isNaN(seconds)) return "?";
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.ceil(seconds % 60);
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  }
}