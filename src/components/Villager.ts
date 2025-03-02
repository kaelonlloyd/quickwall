import * as PIXI from 'pixi.js';
import { COLORS, TILE_HEIGHT, TILE_WIDTH, VILLAGER_SPEED, MAP_HEIGHT, MAP_WIDTH} from '../constants';
import { GridPosition, Villager, VillagerTask, BuildTask } from '../types';
import { IsometricUtils } from '../utils/IsometricUtils';
import { GameMap } from './Map';
import { SubTilePathFinder } from '../utils/pathfinding';
import { CollisionDetector } from '../utils/CollisionDetector';
import { 
  VillagerStateMachine, 
  VillagerState, 
  VillagerEvent, 
  VillagerStateContext 
} from './VillagerStateMachine';

import { DynamicPathfinder } from '../utils/DynamicPathfinder';
import { PathVisualizer } from '../utils/PathVisualizer';



export class VillagerManager {
  // Add this property to the VillagerManager class
  private dynamicPathfinder: DynamicPathfinder;

  private collisionDetector: CollisionDetector | null = null;
  private pathRecalculationEnabled: boolean = true;
  private pathRecalculationTimer: number = 0;
  private readonly PATH_RECALCULATION_INTERVAL: number = 20; // Check every 20 frames


  private villagers: Villager[];
  private unitLayer: PIXI.Container;
  private isoUtils: IsometricUtils;
  private selectedVillagers: Villager[];
  private gameMap: GameMap;
  
  constructor(unitLayer: PIXI.Container, isoUtils: IsometricUtils, gameMap: GameMap, pathVisualizer?: PathVisualizer) {
    this.villagers = [];
    this.unitLayer = unitLayer;
    this.isoUtils = isoUtils;
    this.selectedVillagers = [];
    this.gameMap = gameMap;
    this.dynamicPathfinder = new DynamicPathfinder(gameMap, pathVisualizer);
    // Enable sorting in unit layer for depth-based rendering
    this.unitLayer.sortableChildren = true;
  }
  
  public createVillager(x: number, y: number): Villager {
    const pos = this.isoUtils.toScreen(x, y);
    
    // Create villager sprite
    const villagerContainer = new PIXI.Container();
    villagerContainer.x = pos.x;
    villagerContainer.y = pos.y;
    villagerContainer.pivot.set(TILE_WIDTH / 2, TILE_HEIGHT / 3);

    // Body and head graphics
    const villagerSprite = new PIXI.Graphics();
    
    // Body
    villagerSprite.beginFill(COLORS.VILLAGER_BODY);
    villagerSprite.drawCircle(TILE_WIDTH / 2, TILE_HEIGHT / 3, 10);
    villagerSprite.endFill();
    
    // Head
    villagerSprite.beginFill(COLORS.VILLAGER_HEAD);
    villagerSprite.drawCircle(TILE_WIDTH / 2, TILE_HEIGHT / 6, 5);
    villagerSprite.endFill();
    
    // Selection ring
    const selectionRing = new PIXI.Graphics();
    selectionRing.lineStyle(2, COLORS.SELECTION_RING);
    selectionRing.drawCircle(TILE_WIDTH / 2, TILE_HEIGHT / 3, 15);
    selectionRing.visible = false;
    
    // Add sprites to container
    villagerContainer.addChild(villagerSprite);
    villagerContainer.addChild(selectionRing);
    
    // Create villager object
    const villager: Villager = {
      sprite: villagerContainer,
      selectionRing: selectionRing,
      currentBuildTask: null,
      x: x,
      y: y,
      pixelX: pos.x,
      pixelY: pos.y,
      targetX: x,
      targetY: y,
      moving: false,
      speed: VILLAGER_SPEED,
      path: [],
      task: null,
      health: 100,
      stateMachine: null as any // Will be set immediately after
    };
    
    // Create state machine context
    const stateMachineContext: VillagerStateContext = { villager };
    
    // Create and attach state machine
    villager.stateMachine = new VillagerStateMachine(stateMachineContext, {
      onStateChange: (from, to) => {
        console.log(`Villager state changed from ${from} to ${to}`);
        this.updateVillagerVisuals(villager);
      }
    });
    
    // Make villager interactive
    villagerContainer.interactive = true;
    villagerContainer.cursor = 'pointer';
    
    // Add click event
    villagerContainer.on('pointerdown', (event) => {
      const nativeEvent = event.nativeEvent as PointerEvent;
      const isCtrlPressed = nativeEvent.ctrlKey || nativeEvent.metaKey;
      
      this.selectVillager(villager, isCtrlPressed);
      
      // Stop event propagation
      event.stopPropagation();
    });
    
    // Add to layer and villager list
    this.unitLayer.addChild(villagerContainer);
    this.villagers.push(villager);
    
    return villager;
  }
  
  public setDynamicPathfinder(pathfinder: DynamicPathfinder): void {
    this.dynamicPathfinder = pathfinder;
    console.log("Dynamic pathfinder set in VillagerManager");
  }
  
  /**
   * Set the collision detector instance
   */
  public setCollisionDetector(detector: CollisionDetector): void {
    this.collisionDetector = detector;
    console.log("Collision detector set in VillagerManager");
  }
  
  /**
   * Enable or disable dynamic path recalculation
   */
  public setPathRecalculationEnabled(enabled: boolean): void {
    this.pathRecalculationEnabled = enabled;
    console.log(`Path recalculation ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Check if path recalculation is enabled
   */
  public isPathRecalculationEnabled(): boolean {
    return this.pathRecalculationEnabled;
  }

  
// Update the moveSelectedVillagersToPoint method to handle sub-tile movement
public moveSelectedVillagersToPoint(targetX: number, targetY: number): void {
  if (this.selectedVillagers.length === 0) return;
  
  // Use precise coordinates for the target point
  const preciseTargetX = targetX;
  const preciseTargetY = targetY;
  
  // For multiple units, generate formation positions
  if (this.selectedVillagers.length === 1) {
    // For single unit, directly check if the target is walkable
    const targetTileX = Math.floor(preciseTargetX);
    const targetTileY = Math.floor(preciseTargetY);
    
    if (this.gameMap.isTileWalkable(targetTileX, targetTileY)) {
      // Target is walkable, move directly to it
      this.moveVillagerTo(this.selectedVillagers[0], preciseTargetX, preciseTargetY);
    } else {
      // Target is not walkable, find nearest walkable position
      const nearestPoint = this.dynamicPathfinder.findPath(
        this.selectedVillagers[0], 
        preciseTargetX, 
        preciseTargetY
      );
      
      if (nearestPoint.length > 0) {
        // Path found to a walkable position near target
        this.moveVillagerTo(this.selectedVillagers[0], preciseTargetX, preciseTargetY);
      } else {
        console.warn(`No walkable path found to target (${preciseTargetX}, ${preciseTargetY})`);
      }
    }
    return;
  }
  
  // For multiple units, generate formation positions
  const positions = this.generateFormationPositions(preciseTargetX, preciseTargetY, this.selectedVillagers.length);
  
  // Assign each villager a position
  for (let i = 0; i < this.selectedVillagers.length; i++) {
    const targetPos = positions[i];
    if (targetPos) {
      // Move to formation position with path verification
      this.moveVillagerTo(this.selectedVillagers[i], targetPos.x, targetPos.y);
    }
  }
}
    
  

  
public updateVillagers(delta: number): void {
  // Increment the path recalculation timer
  this.pathRecalculationTimer += 1;
  
  // Check if we should recalculate paths this frame
  const shouldCheckPaths = this.pathRecalculationEnabled && 
                          (this.pathRecalculationTimer >= this.PATH_RECALCULATION_INTERVAL);
  
  // Reset timer if needed
  if (shouldCheckPaths) {
    this.pathRecalculationTimer = 0;
  }
  
  this.villagers.forEach(villager => {
    // Check for collision detection first
    if (this.collisionDetector) {
      this.collisionDetector.checkVillagerCollision(villager);
    }
    
    // Check if path needs recalculation
    if (shouldCheckPaths && villager.moving && villager.path.length > 0 && this.dynamicPathfinder) {
      // Let the dynamic pathfinder handle recalculation
      this.dynamicPathfinder.recalculatePathIfNeeded(villager);
    }
    
    // Continue with movement logic if villager is moving
    if (villager.moving && villager.path.length > 0) {
      const nextWaypoint = villager.path[0];
      
      // Extra validation: check if next waypoint is walkable
      const nextTileX = Math.floor(nextWaypoint.x);
      const nextTileY = Math.floor(nextWaypoint.y);
      
      if (!this.gameMap.isTileWalkable(nextTileX, nextTileY)) {
        // Next waypoint is no longer walkable, handle the obstacle
        this.handleUnwalkableWaypoint(villager);
        return; // Skip to next villager, will process movement next frame
      }
      
      // Calculate movement parameters
      const dx = nextWaypoint.x - villager.x;
      const dy = nextWaypoint.y - villager.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Move towards waypoint
      if (distance < 0.01) {
        // Reached waypoint, move to next one
        villager.x = nextWaypoint.x;
        villager.y = nextWaypoint.y;
        villager.path.shift();
        
        // Update sprite position
        const pos = this.isoUtils.toScreen(villager.x, villager.y);
        villager.sprite.x = pos.x;
        villager.sprite.y = pos.y;
        
        // Check if path is complete
        if (villager.path.length === 0) {
          // Complete the movement
          villager.moving = false;
          villager.stateMachine.handleEvent(VillagerEvent.MOVE_COMPLETE);
          
          // Execute callback if exists
          if (villager.task && villager.task.type === 'move' && villager.task.callback) {
            const callback = villager.task.callback;
            villager.task = null;
            callback(); // Execute callback after clearing task
          }
        }
      } else {
        // Calculate how far to move this frame
        const speed = villager.speed * delta / 60;
        
        // Calculate movement vector
        const angle = Math.atan2(dy, dx);
        const moveX = Math.cos(angle) * Math.min(speed, distance);
        const moveY = Math.sin(angle) * Math.min(speed, distance);
        
        // Calculate new position
        const newX = villager.x + moveX;
        const newY = villager.y + moveY;
        
        // Check if the move crosses an unwalkable tile
        const currentTileX = Math.floor(villager.x);
        const currentTileY = Math.floor(villager.y);
        const newTileX = Math.floor(newX);
        const newTileY = Math.floor(newY);
        
        // Check if we're crossing to a new tile
        if (currentTileX !== newTileX || currentTileY !== newTileY) {
          // Verify the move is valid
          if (!this.gameMap.isMovementValid(villager.x, villager.y, newX, newY)) {
            // Invalid movement, handle obstacle
            this.handleUnwalkableWaypoint(villager);
            return; // Skip to next villager
          }
        }
        
        // Update position
        villager.x = newX;
        villager.y = newY;
        
        // Update sprite position
        const pos = this.isoUtils.toScreen(villager.x, villager.y);
        villager.sprite.x = pos.x;
        villager.sprite.y = pos.y;
        
        // Update zIndex for proper depth sorting
        villager.sprite.zIndex = Math.floor(villager.y * 10);
      }
    }
    
    // Update villager visuals
    this.updateVillagerVisuals(villager);
    
    // Handle building tasks if needed
    if (villager.stateMachine.getCurrentState() === VillagerState.BUILDING && villager.currentBuildTask) {
      // Building task logic (remains unchanged)
    }
  });
}



private handleUnwalkableWaypoint(villager: Villager): void {
  console.log(`Obstacle detected for villager at (${villager.x.toFixed(2)}, ${villager.y.toFixed(2)})`);
  
  // Visualize the collision if detector is available
  if (this.collisionDetector) {
    this.collisionDetector.checkVillagerCollision(villager);
  }
  
  if (this.dynamicPathfinder && this.pathRecalculationEnabled) {
    // Attempt to recalculate a new path
    const newPath = this.dynamicPathfinder.findPath(villager, villager.targetX, villager.targetY);
    
    if (newPath.length > 0) {
      // Update path and continue movement
      console.log(`Found new path with ${newPath.length} points`);
      villager.path = newPath;
    } else {
      // No alternative path found, stop movement
      console.warn(`No alternative path found, stopping movement`);
      villager.moving = false;
      villager.path = [];
      villager.stateMachine.handleEvent(VillagerEvent.MOVE_INTERRUPTED);
      
      // Execute callback if it exists (movement failed)
      if (villager.task && villager.task.type === 'move' && villager.task.callback) {
        const callback = villager.task.callback;
        villager.task = null;
        callback();
      }
    }
  } else {
    // Dynamic pathfinding not available, stop movement
    villager.moving = false;
    villager.path = [];
    villager.stateMachine.handleEvent(VillagerEvent.MOVE_INTERRUPTED);
    
    // Execute callback if it exists
    if (villager.task && villager.task.type === 'move' && villager.task.callback) {
      const callback = villager.task.callback;
      villager.task = null;
      callback();
    }
  }
}
  
  // Assign villagers to build a foundation
  public assignVillagersToFoundation(villagers: Villager[], foundation: any): void {
    villagers.forEach(villager => {
      // Find an available position around the foundation
      const buildPosition = this.gameMap.wallManager?.findAvailableBuildPosition(foundation);
      
      if (!buildPosition) {
        console.log("No available build positions for villager");
        return;
      }
      
      // Move villager to build position
      this.moveVillagerTo(villager, buildPosition.x, buildPosition.y);
      
      // Set build task
      villager.currentBuildTask = {
        type: 'wall',
        foundation: foundation,
        buildPosition: buildPosition
      };
      
      // Trigger build state
      villager.stateMachine.handleEvent(VillagerEvent.START_BUILD);
    });
  }
  
  // Getter methods
  public getSelectedVillagers(): Villager[] {
    return this.selectedVillagers;
  }
  
  public getAllVillagers(): Villager[] {
    return this.villagers;
  }
  
  // Force move a villager away from a blocked tile
  public forceVillagerMove(villager: Villager): boolean {
    console.log(`Attempting to force move villager from (${villager.x}, ${villager.y})`);
    
    // Find the nearest walkable tile using a spiral search pattern
    const currentX = Math.floor(villager.x);
    const currentY = Math.floor(villager.y);
    
    // Try adjacent tiles in a prioritized order (closest first)
    const directNeighbors = [
      { x: currentX, y: currentY - 1 },    // Top
      { x: currentX + 1, y: currentY },    // Right
      { x: currentX, y: currentY + 1 },    // Bottom
      { x: currentX - 1, y: currentY },    // Left
      { x: currentX - 1, y: currentY - 1 }, // Top-Left
      { x: currentX + 1, y: currentY - 1 }, // Top-Right
      { x: currentX - 1, y: currentY + 1 }, // Bottom-Left
      { x: currentX + 1, y: currentY + 1 }  // Bottom-Right
    ];
    
    // Find the first walkable neighbor
    for (const neighbor of directNeighbors) {
      if (this.gameMap.isTileWalkable(neighbor.x, neighbor.y)) {
        // Move to this walkable tile
        console.log(`Found walkable tile at (${neighbor.x}, ${neighbor.y}), moving villager`);
        
        // Use immediate movement to get the villager out of the way
        this.moveVillagerTo(villager, neighbor.x, neighbor.y);
        return true;
      }
    }
    
    // If nearby tiles didn't work, try a wider search area
    const alternativeTile = this.gameMap.findAlternativeWalkableTile(currentX, currentY, 3);
    
    if (alternativeTile) {
      console.log(`Found alternative walkable tile at (${alternativeTile.x}, ${alternativeTile.y}), moving villager`);
      this.moveVillagerTo(villager, alternativeTile.x, alternativeTile.y);
      return true;
    }
    
    console.warn('Failed to find any walkable tile for villager');
    return false;
  }

  public moveVillagerTo(villager: Villager, targetX: number, targetY: number, callback?: () => void, recursionDepth: number = 0): void {
    // Prevent infinite recursion by limiting depth
    const MAX_RECURSION_DEPTH = 2;
    if (recursionDepth > MAX_RECURSION_DEPTH) {
      console.warn(`Maximum recursion depth reached for pathfinding. Aborting movement to (${targetX}, ${targetY})`);
      
      // If a callback was provided, call it to prevent operations from hanging
      if (callback) callback();
      
      // Notify state machine
      villager.stateMachine.handleEvent(VillagerEvent.MOVE_INTERRUPTED);
      return;
    }
    
    // Ensure target coordinates are within map bounds
    const clampedX = Math.max(0, Math.min(targetX, MAP_WIDTH - 0.05));
    const clampedY = Math.max(0, Math.min(targetY, MAP_HEIGHT - 0.05));
    
    // First check if the target tile is walkable
    const targetTileX = Math.floor(clampedX);
    const targetTileY = Math.floor(clampedY);
    
    // Debug info
    console.log(`Attempting to move villager from (${villager.x.toFixed(2)}, ${villager.y.toFixed(2)}) to (${clampedX.toFixed(2)}, ${clampedY.toFixed(2)}), recursion: ${recursionDepth}`);
    
    // Check if we're already very close to the target (within same tile)
    const currentTileX = Math.floor(villager.x);
    const currentTileY = Math.floor(villager.y);
    const isSameTile = currentTileX === targetTileX && currentTileY === targetTileY;
    
    if (isSameTile) {
      // If we're already on the target tile, just move directly to the precise position
      console.log(`Already on target tile, moving directly to precise position`);
      
      // Create a simple path with just the target point
      villager.path = [{ x: clampedX, y: clampedY }];
      villager.targetX = clampedX;
      villager.targetY = clampedY;
      villager.moving = true;
      
      // Set task
      villager.task = {
        type: 'move',
        target: { x: clampedX, y: clampedY },
        callback: callback
      };
      
      // Trigger state machine event
      villager.stateMachine.handleEvent(VillagerEvent.START_MOVE);
      return;
    }
    
    // Use the dynamic pathfinder if available
    let path: GridPosition[] = [];
    
    if (this.dynamicPathfinder) {
      // Use the enhanced pathfinder
      path = this.dynamicPathfinder.findPath(villager, clampedX, clampedY);
    } else {
      // Fall back to the original pathfinder
      const pathFinder = new SubTilePathFinder(this.gameMap);
      path = pathFinder.findPath(villager.x, villager.y, clampedX, clampedY, {
        diagonalMovement: true,
        preciseTarget: true
      });
    }
    
    // If no path found, handle the failure gracefully
    if (path.length === 0) {
      console.warn(`Could not find any valid path from (${villager.x.toFixed(2)}, ${villager.y.toFixed(2)}) to (${clampedX.toFixed(2)}, ${clampedY.toFixed(2)})`);
      
      // Only try to find alternative if we haven't already recursed too deep
      if (recursionDepth < MAX_RECURSION_DEPTH) {
        // Try to find a nearby walkable position
        const nearbyWalkable = this.gameMap.findNearestWalkableTile(targetTileX, targetTileY, 3);
        
        if (nearbyWalkable && 
            (nearbyWalkable.x !== clampedX || nearbyWalkable.y !== clampedY)) {
          console.log(`Found nearby walkable tile at (${nearbyWalkable.x}, ${nearbyWalkable.y}), using it instead`);
          
          // Try again with the nearby position, incrementing recursion depth
          this.moveVillagerTo(villager, nearbyWalkable.x, nearbyWalkable.y, callback, recursionDepth + 1);
          return;
        }
      }
      
      // If still no path, abort the movement
      console.error(`No valid path found and no viable alternatives. Movement aborted.`);
      villager.stateMachine.handleEvent(VillagerEvent.MOVE_INTERRUPTED);
      
      // If a callback was provided, still call it so the operation doesn't hang
      if (callback) callback();
      return;
    }
    
    // Path found successfully - set it up
    
    // Store the callback in the villager's task
    const task: VillagerTask = {
      type: 'move',
      target: { x: clampedX, y: clampedY },
      callback: callback
    };
    
    villager.task = task;
    
    // Set movement properties
    villager.targetX = clampedX;
    villager.targetY = clampedY;
    villager.path = path;
    villager.moving = true;
    
    // Trigger state machine events
    villager.stateMachine.handleEvent(VillagerEvent.START_MOVE);
    
    console.log(`Villager path set successfully with ${path.length} points`);
  }
  

  private generateFormationPositions(centerX: number, centerY: number, count: number): GridPosition[] {
    const positions: GridPosition[] = [];
    
    // First position is the exact center point
    positions.push({ x: centerX, y: centerY });
    
    if (count === 1) return positions;
    
    // Generate positions in a circular formation
    const baseRadius = 0.6; // Base radius in tile units
    let currentRadius = baseRadius;
    let unitsPlaced = 1;
    
    // Add positions in concentric rings until all units are placed
    while (unitsPlaced < count) {
      // Calculate how many units can fit in this ring
      const circumference = 2 * Math.PI * currentRadius;
      const unitsInRing = Math.min(
        count - unitsPlaced,
        Math.floor(circumference / 0.7) // Ensure units aren't too close
      );
      
      if (unitsInRing <= 0) {
        // Increase radius if we can't fit any more units
        currentRadius += 0.5;
        continue;
      }
      
      // Place units evenly around the circle
      for (let i = 0; i < unitsInRing; i++) {
        const angle = (i / unitsInRing) * 2 * Math.PI;
        const x = centerX + currentRadius * Math.cos(angle);
        const y = centerY + currentRadius * Math.sin(angle);
        
        // Ensure the position is within map bounds
        if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
          positions.push({ x, y });
          unitsPlaced++;
        }
      }
      
      // Increase radius for next ring
      currentRadius += 0.7;
    }
    
    return positions;
  }
  
  // Update the updateSelectionDisplay method if not already present
  private updateSelectionDisplay(): void {
    // Update selection count in UI
    const selectionElement = document.getElementById('villager-selection-count');
    if (selectionElement) {
      selectionElement.textContent = `Villagers: ${this.selectedVillagers.length}`;
    }
  }

  public setGameMap(gameMap: GameMap): void {
    // Set the game map reference
    this.gameMap = gameMap;
  }
  

  public handleVillagerSelection(villager: Villager, addToSelection: boolean = false): void {
    // Check if the villager is currently in a build task
    if (villager.currentBuildTask) {
      // First, find the foundation they're working on
      const foundation = this.findBuildTaskFoundation(villager);
      if (foundation) {
        // Release their build position
        this.releaseVillagerFromFoundation(villager, foundation);
      }
      
      // Clear their build task
      villager.currentBuildTask = null;
    }
    
    // Perform selection
    this.selectVillager(villager, addToSelection);
  }
  
  // Helper method to find the foundation a villager is working on
  private findBuildTaskFoundation(villager: Villager): any | null {
    if (!villager.currentBuildTask || villager.currentBuildTask.type !== 'wall') {
      return null;
    }
    
    const taskData = villager.currentBuildTask.foundation;
    const allFoundations = this.gameMap.getWallFoundations();
    
    // Find the matching foundation
    return allFoundations.find(f => 
      f.x === taskData?.x && 
      f.y === taskData?.y
    ) || null;
  }
  
  // Helper method to release a villager from their build position
  private releaseVillagerFromFoundation(villager: Villager, foundation: any): void {
    // Remove from assigned villagers array
    const index = foundation.assignedVillagers.findIndex((v: Villager) => v === villager);
    if (index !== -1) {
      foundation.assignedVillagers.splice(index, 1);
    }
    
    // Release build position if one was assigned
    if (villager.currentBuildTask?.buildPosition) {
      this.gameMap.wallManager?.releaseBuildPosition(
        foundation, 
        villager.currentBuildTask.buildPosition
      );
    }
  }



// Also modify the clearSelection method
public clearSelection(): void {
  // Deselect all currently selected villagers
  this.selectedVillagers.forEach(villager => {
    villager.stateMachine.handleEvent(VillagerEvent.DESELECT);
    this.updateVillagerVisuals(villager); // Update visuals immediately
  });
  
  // Clear the selected villagers array
  this.selectedVillagers = [];
  
  // Update the selection display
  this.updateSelectionDisplay();
}



private updateVillagerVisuals(villager: Villager): void {
  // Update visuals based on state machine state
  const currentState = villager.stateMachine.getCurrentState();
  
  // Handle different states
  switch (currentState) {
    case VillagerState.SELECTED:
      // Make selection ring visible
      villager.selectionRing.visible = true;
      
      // Add pulsing animation if not already added
      if (!villager.selectionAnimation) {
        // Create a simple animation object
        const startTime = Date.now();
        villager.selectionAnimation = {
          active: true,
          update: () => {
            if (!villager.selectionAnimation?.active) return;
            const scale = 0.9 + Math.sin((Date.now() - startTime) * 0.005) * 0.1;
            villager.selectionRing.scale.set(scale);
          }
        };
      }
      break;
      
    case VillagerState.BUILDING:
      // Keep selection ring if building while selected
      villager.selectionRing.visible = this.selectedVillagers.includes(villager);
      villager.sprite.alpha = 0.8; // Slight transparency to indicate building
      break;
      
    case VillagerState.MOVING:
      // Keep selection ring if moving while selected
      villager.selectionRing.visible = this.selectedVillagers.includes(villager);
      villager.sprite.alpha = 1.0;
      break;
      
    default:
      // For other states like IDLE, RESTING, etc.
      villager.selectionRing.visible = false;
      villager.sprite.alpha = 1.0;
      
      // Remove animation if it exists
      if (villager.selectionAnimation) {
        // Mark animation as inactive
        villager.selectionAnimation.active = false;
        villager.selectionAnimation = null;
        
        // Reset scale
        villager.selectionRing.scale.set(1);
      }
  }
}

// Modify the selectVillager method to update visuals immediately
public selectVillager(villager: Villager, addToSelection: boolean = false): void {
  // Clear previous selections if not adding to selection
  if (!addToSelection) {
    this.selectedVillagers.forEach(v => {
      v.stateMachine.handleEvent(VillagerEvent.DESELECT);
      this.updateVillagerVisuals(v); // Update visuals immediately
    });
    this.selectedVillagers = [];
  }
  
  // Toggle selection for this villager
  if (!this.selectedVillagers.includes(villager)) {
    this.selectedVillagers.push(villager);
    villager.stateMachine.handleEvent(VillagerEvent.SELECT);
    this.updateVillagerVisuals(villager); // Update visuals immediately
  } else if (addToSelection) {
    // If already selected and adding to selection, deselect
    const index = this.selectedVillagers.indexOf(villager);
    this.selectedVillagers.splice(index, 1);
    villager.stateMachine.handleEvent(VillagerEvent.DESELECT);
    this.updateVillagerVisuals(villager); // Update visuals immediately
  }
  
  // Update selection display
  this.updateSelectionDisplay();
}

  
}

// Exports for use in other files
export { 
  VillagerStateMachine, 
  VillagerState, 
  VillagerEvent 
} from './VillagerStateMachine';