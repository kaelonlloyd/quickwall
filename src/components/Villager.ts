import * as PIXI from 'pixi.js';
import { COLORS, TILE_HEIGHT, TILE_WIDTH, VILLAGER_SPEED, MAP_HEIGHT, MAP_WIDTH} from '../constants';
import { GridPosition, Villager, VillagerTask, BuildTask } from '../types';
import { IsometricUtils } from '../utils/IsometricUtils';
import { GameMap } from './Map';
import { SubTilePathFinder } from '../utils/pathfinding';
import { 
  VillagerStateMachine, 
  VillagerState, 
  VillagerEvent, 
  VillagerStateContext 
} from './VillagerStateMachine';

export class VillagerManager {
  private villagers: Villager[];
  private unitLayer: PIXI.Container;
  private isoUtils: IsometricUtils;
  private selectedVillagers: Villager[];
  private gameMap: GameMap;
  
  constructor(unitLayer: PIXI.Container, isoUtils: IsometricUtils, gameMap: GameMap) {
    this.villagers = [];
    this.unitLayer = unitLayer;
    this.isoUtils = isoUtils;
    this.selectedVillagers = [];
    this.gameMap = gameMap;
    
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
  
  

  
// Update the moveSelectedVillagersToPoint method to handle sub-tile movement
public moveSelectedVillagersToPoint(targetX: number, targetY: number): void {
  if (this.selectedVillagers.length === 0) return;
  
  // Use precise coordinates for the target point
  const preciseTargetX = targetX; // Don't floor or round these values
  const preciseTargetY = targetY;
  
  // For multiple units, generate formation positions
  if (this.selectedVillagers.length === 1) {
    // For single unit, move directly to target
    this.moveVillagerTo(this.selectedVillagers[0], preciseTargetX, preciseTargetY);
    return;
  }
  
  // Generate positions in a circle around the target point
  const positions = this.generateFormationPositions(preciseTargetX, preciseTargetY, this.selectedVillagers.length);
  
  // Assign each villager a position
  for (let i = 0; i < this.selectedVillagers.length; i++) {
    const targetPos = positions[i];
    if (targetPos) {
      const tileX = Math.floor(targetPos.x);
      const tileY = Math.floor(targetPos.y);
      
      if (this.gameMap.isTileWalkable(tileX, tileY)) {
        this.moveVillagerTo(this.selectedVillagers[i], targetPos.x, targetPos.y);
      } else {
        // If position is not walkable, find a nearby walkable position
        const nearbyPos = this.gameMap.getAdjacentWalkableTile(tileX, tileY);
        if (nearbyPos) {
          // Add some randomness to prevent villagers from stacking
          const offsetX = 0.3 * (Math.random() - 0.5);
          const offsetY = 0.3 * (Math.random() - 0.5);
          this.moveVillagerTo(
            this.selectedVillagers[i], 
            nearbyPos.x + 0.5 + offsetX, 
            nearbyPos.y + 0.5 + offsetY
          );
        }
      }
    }
  }
}
    
  

  
public updateVillagers(delta: number): void {
  this.villagers.forEach(villager => {
    // Update movement
    if (villager.moving && villager.path.length > 0) {
      const nextWaypoint = villager.path[0];
      
      // Calculate precise movement
      const dx = nextWaypoint.x - villager.x;
      const dy = nextWaypoint.y - villager.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Debugging log
      console.log(`Villager position: (${villager.x}, ${villager.y})`);
      console.log(`Next waypoint: (${nextWaypoint.x}, ${nextWaypoint.y})`);
      console.log(`Distance to waypoint: ${distance}`);
      

      // Move towards waypoint
      if (distance < 0.01) { // Smaller tolerance for more precise movement
        // Precisely set to the waypoint
        villager.x = nextWaypoint.x;
        villager.y = nextWaypoint.y;
        villager.path.shift();
        
        // Update sprite position precisely
        const pos = this.isoUtils.toScreen(villager.x, villager.y);
        console.log(`Logical position: (${villager.x}, ${villager.y}), Screen position: (${pos.x}, ${pos.y})`);
        villager.sprite.x = pos.x;
        villager.sprite.y = pos.y;
        
        // Check if path is complete
        if (villager.path.length === 0) {
          // Ensure final position matches exactly
          villager.moving = false;
          villager.stateMachine.handleEvent(VillagerEvent.MOVE_COMPLETE);
          
          // Execute callback if exists
          if (villager.task && villager.task.type === 'move' && villager.task.callback) {
            villager.task.callback();
            villager.task = null; // Clear the task after execution
          }
        }
      } else {
        // Continue moving with improved smoothness
        const speed = villager.speed * delta / 60;
        
        // Calculate precise movement vector
        const angle = Math.atan2(dy, dx);
        const moveX = Math.cos(angle) * speed;
        const moveY = Math.sin(angle) * speed;
        
        // Update precise grid position
        villager.x += moveX;
        villager.y += moveY;
        
        // Precise screen position calculation
        const pos = this.isoUtils.toScreen(villager.x, villager.y);
        villager.sprite.x = pos.x;
        villager.sprite.y = pos.y;
        
        // Update zIndex based on y-coordinate for proper depth sorting
        villager.sprite.zIndex = Math.floor(villager.y * 10);
      }
    }
    
    // Update villager visuals
    this.updateVillagerVisuals(villager);
    
    // Handle building tasks
    if (villager.stateMachine.getCurrentState() === VillagerState.BUILDING && villager.currentBuildTask) {
      // Potential future handling of building tasks
    }
  });
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

  public moveVillagerTo(villager: Villager, targetX: number, targetY: number, callback?: () => void): void {
    // Use precise coordinates instead of clamping to integer grid positions
    const clampedX = Math.max(0, Math.min(targetX, MAP_WIDTH - 0.05));
    const clampedY = Math.max(0, Math.min(targetY, MAP_HEIGHT - 0.05));
    
    // Use the new sub-tile pathfinder
    const pathFinder = new SubTilePathFinder(this.gameMap);
    const path = pathFinder.findPath(villager.x, villager.y, clampedX, clampedY, {
      diagonalMovement: true,
      preciseTarget: true
    });
    
    // If no path found, try finding an alternative target
    if (path.length === 0) {
      console.warn(`No path found to (${clampedX}, ${clampedY}), looking for alternatives`);
      
      // Try to get close to the target position without forcing integer coordinates
      const targetTileX = Math.floor(clampedX);
      const targetTileY = Math.floor(clampedY);
      
      // Check if the target tile itself is walkable
      if (this.gameMap.isTileWalkable(targetTileX, targetTileY)) {
        // Move to center of the target tile if we couldn't get to the exact position
        console.log(`Moving to center of tile (${targetTileX + 0.5}, ${targetTileY + 0.5}) instead`);
        return this.moveVillagerTo(villager, targetTileX + 0.5, targetTileY + 0.5, callback);
      }
      
      // Otherwise find a nearby walkable tile and get as close as possible to the original target
      const alternativeTile = this.gameMap.findAlternativeWalkableTile(targetTileX, targetTileY, 2);
      
      if (alternativeTile) {
        // Use the center of the alternative tile as the new target
        const centerX = alternativeTile.x + 0.5;
        const centerY = alternativeTile.y + 0.5;
        
        console.log(`Found alternative path to (${centerX}, ${centerY})`);
        return this.moveVillagerTo(villager, centerX, centerY, callback);
      }
      
      console.error(`Could not find any path to destination`);
      villager.stateMachine.handleEvent(VillagerEvent.MOVE_INTERRUPTED);
      return;
    }
    
    // Store the callback in the villager's task
    const task: VillagerTask = {
      type: 'move',
      target: { x: clampedX, y: clampedY },
      callback: callback
    };
    
    villager.task = task;
    
    // Set movement properties with exact coordinates
    villager.targetX = clampedX;
    villager.targetY = clampedY;
    villager.path = path;
    
    // Trigger state machine events
    villager.stateMachine.handleEvent(VillagerEvent.START_MOVE);
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