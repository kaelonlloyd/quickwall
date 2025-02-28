import * as PIXI from 'pixi.js';
import { COLORS, TILE_HEIGHT, TILE_WIDTH, VILLAGER_SPEED } from '../constants';
import { GridPosition, Villager, VillagerTask, BuildTask } from '../types';
import { IsometricUtils } from '../utils/IsometricUtils';
import { GameMap } from './Map';
import { ImprovedPathFinder } from '../utils/pathfinding';
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
  
  private updateVillagerVisuals(villager: Villager): void {
    // Update visuals based on state machine state
    switch (villager.stateMachine.getCurrentState()) {
      case VillagerState.SELECTED:
        villager.selectionRing.visible = true;
        break;
      case VillagerState.BUILDING:
        // Add a temporary visual indicator
        villager.sprite.alpha = 0.7;
        break;
      case VillagerState.RESTING:
        // Fade out the villager
        villager.sprite.alpha = 0.5;
      default:
        villager.selectionRing.visible = false;
        villager.sprite.alpha = 1;
    }
  }
  
  public selectVillager(villager: Villager, addToSelection: boolean = false): void {
    // Clear previous selections if not adding to selection
    if (!addToSelection) {
      this.selectedVillagers.forEach(v => 
        v.stateMachine.handleEvent(VillagerEvent.DESELECT)
      );
      this.selectedVillagers = [];
    }
    
    // Toggle selection for this villager
    if (!this.selectedVillagers.includes(villager)) {
      this.selectedVillagers.push(villager);
      villager.stateMachine.handleEvent(VillagerEvent.SELECT);
    } else {
      // If already selected and adding to selection, deselect
      const index = this.selectedVillagers.indexOf(villager);
      this.selectedVillagers.splice(index, 1);
      villager.stateMachine.handleEvent(VillagerEvent.DESELECT);
    }
    
    // Update selection display
    this.updateSelectionDisplay();
  }
  
  public moveSelectedVillagersToPoint(targetX: number, targetY: number): void {
    if (this.selectedVillagers.length === 0) return;
    
    // For multiple units, generate formation positions
    if (this.selectedVillagers.length === 1) {
      // For single unit, just move directly to target
      this.moveVillager(this.selectedVillagers[0], targetX, targetY);
      return;
    }
    
    // Generate positions in a circle around the target point
    const positions = this.generateFormationPositions(targetX, targetY, this.selectedVillagers.length);
    
    // Assign each villager a position
    for (let i = 0; i < this.selectedVillagers.length; i++) {
      const targetPos = positions[i];
      if (targetPos && this.gameMap.isTileWalkable(targetPos.x, targetPos.y)) {
        this.moveVillager(this.selectedVillagers[i], targetPos.x, targetPos.y);
      } else {
        // If position is not walkable, find a nearby walkable tile
        const nearbyPos = this.gameMap.getAdjacentWalkableTile(targetX, targetY);
        if (nearbyPos) {
          this.moveVillager(this.selectedVillagers[i], nearbyPos.x, nearbyPos.y);
        }
      }
    }
  }
  
  private generateFormationPositions(centerX: number, centerY: number, count: number): GridPosition[] {
    const positions: GridPosition[] = [];
    
    // First position is the center
    positions.push({ x: centerX, y: centerY });
    
    if (count === 1) return positions;
    
    // Generate positions in a circular formation
    const radius = Math.ceil(Math.sqrt(count) / 2);
    let added = 1;
    
    for (let r = 1; r <= radius && added < count; r++) {
      // Add positions in concentric rings
      for (let i = -r; i <= r && added < count; i++) {
        for (let j = -r; j <= r && added < count; j++) {
          // Only add positions on the perimeter of the ring
          if (Math.abs(i) === r || Math.abs(j) === r) {
            const x = centerX + i;
            const y = centerY + j;
            
            // Only add if within map bounds
            if (x >= 0 && x < 20 && y >= 0 && y < 20) {
              // Skip the center which was already added
              if (!(i === 0 && j === 0)) {
                positions.push({ x, y });
                added++;
              }
            }
          }
        }
      }
    }
    
    return positions;
  }
  
  public moveVillager(villager: Villager, targetX: number, targetY: number): void {
    // Validate target coordinates
    const clampedX = Math.max(0, Math.min(Math.floor(targetX), 19));
    const clampedY = Math.max(0, Math.min(Math.floor(targetY), 19));
    
    // Use pathfinder to calculate path
    const pathFinder = new ImprovedPathFinder(this.gameMap);
    const path = pathFinder.findPath(villager.x, villager.y, clampedX, clampedY);
    
    // No path found
    if (path.length === 0) {
      villager.stateMachine.handleEvent(VillagerEvent.MOVE_INTERRUPTED);
      return;
    }
    
    // Set movement properties
    villager.targetX = clampedX;
    villager.targetY = clampedY;
    villager.path = path;
    
    // Trigger state machine events
    villager.stateMachine.handleEvent(VillagerEvent.START_MOVE);
  }
  
  public updateVillagers(delta: number): void {
    this.villagers.forEach(villager => {
      // Update movement
      if (villager.moving && villager.path.length > 0) {
        const nextWaypoint = villager.path[0];
        
        // Calculate movement
        const dx = nextWaypoint.x - villager.x;
        const dy = nextWaypoint.y - villager.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Move towards waypoint
        if (distance < 0.1) {
          // Reached waypoint
          villager.x = nextWaypoint.x;
          villager.y = nextWaypoint.y;
          villager.path.shift();
          
          // Update sprite position
          const pos = this.isoUtils.toScreen(villager.x, villager.y);
          villager.sprite.x = pos.x;
          villager.sprite.y = pos.y;
          
          // Check if path is complete
          if (villager.path.length === 0) {
            villager.stateMachine.handleEvent(VillagerEvent.MOVE_COMPLETE);
          }
        } else {
          // Continue moving
          const speed = villager.speed * delta / 60;
          const angle = Math.atan2(dy, dx);
          
          villager.x += Math.cos(angle) * speed;
          villager.y += Math.sin(angle) * speed;
          
          // Update sprite position
          const pos = this.isoUtils.toScreen(villager.x, villager.y);
          villager.sprite.x = pos.x;
          villager.sprite.y = pos.y;
        }
      }
      
      // Check for fatigue
      if (villager.health < 30) {
        villager.stateMachine.handleEvent(VillagerEvent.FATIGUE);
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
      this.moveVillager(villager, buildPosition.x, buildPosition.y);
      
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
        this.moveVillager(villager, neighbor.x, neighbor.y);
        return true;
      }
    }
    
    // If nearby tiles didn't work, try a wider search area
    const alternativeTile = this.gameMap.findAlternativeWalkableTile(currentX, currentY, 3);
    
    if (alternativeTile) {
      console.log(`Found alternative walkable tile at (${alternativeTile.x}, ${alternativeTile.y}), moving villager`);
      this.moveVillager(villager, alternativeTile.x, alternativeTile.y);
      return true;
    }
    
    console.warn('Failed to find any walkable tile for villager');
    return false;
  }

  public moveVillagerTo(villager: Villager, targetX: number, targetY: number, callback?: () => void): void {
    this.moveVillager(villager, targetX, targetY);
  }

  public clearSelection(): void {
    // Deselect all currently selected villagers
    this.selectedVillagers.forEach(villager => {
      villager.stateMachine.handleEvent(VillagerEvent.DESELECT);
    });
    
    // Clear the selected villagers array
    this.selectedVillagers = [];
    
    // Update the selection display
    this.updateSelectionDisplay();
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
}

// Exports for use in other files
export { 
  VillagerStateMachine, 
  VillagerState, 
  VillagerEvent 
} from './VillagerStateMachine';