// src/components/Villager.ts - With corrected Villager type
import { VILLAGER_SPEED, MAP_HEIGHT, MAP_WIDTH } from '../constants';
import { GridPosition, Villager, VillagerTask, BuildTask } from '../types';
import { GameMap } from './Map';
import { SubTilePathFinder } from '../utils/pathfinding';
import { 
  VillagerStateMachine, 
  VillagerState, 
  VillagerEvent, 
  VillagerStateContext 
} from './VillagerStateMachine';

/**
 * Command pattern - defines possible villager commands
 */
export enum VillagerCommand {
  SELECT = 'SELECT',
  DESELECT = 'DESELECT',
  TOGGLE_SELECTION = 'TOGGLE_SELECTION',
  MOVE_TO = 'MOVE_TO',
  MOVE_GROUP_TO = 'MOVE_GROUP_TO',
  BUILD = 'BUILD',
  GATHER = 'GATHER',
  STOP = 'STOP',
  CLEAR_SELECTION = 'CLEAR_SELECTION'
}

/**
 * Command payload interface
 */
export interface CommandPayload {
  villager?: Villager;
  villagers?: Villager[];
  position?: GridPosition;
  addToSelection?: boolean;
  foundation?: any;
  target?: any;
}

export class VillagerManager {
  private villagers: Villager[] = [];
  private selectedVillagers: Villager[] = [];
  private gameMap: GameMap;
  private dynamicPathfinder: any = null; // Reference to pathfinder if provided
  private pathRecalculationEnabled: boolean = true;
  private pathRecalculationTimer: number = 0;
  private readonly PATH_RECALCULATION_INTERVAL: number = 20; // Check every 20 frames
  
  // Command handlers registry
  private commandHandlers: Map<VillagerCommand, (payload: CommandPayload) => void> = new Map();
  
  constructor(gameMap: GameMap) {
    this.gameMap = gameMap;
    this.initializeCommandHandlers();
  }
  
  /**
   * Initialize command handlers
   */
  private initializeCommandHandlers(): void {
    // Register all command handlers
    this.commandHandlers.set(VillagerCommand.SELECT, this.handleSelectCommand.bind(this));
    this.commandHandlers.set(VillagerCommand.DESELECT, this.handleDeselectCommand.bind(this));
    this.commandHandlers.set(VillagerCommand.TOGGLE_SELECTION, this.handleToggleSelectionCommand.bind(this));
    this.commandHandlers.set(VillagerCommand.MOVE_TO, this.handleMoveToCommand.bind(this));
    this.commandHandlers.set(VillagerCommand.MOVE_GROUP_TO, this.handleMoveGroupToCommand.bind(this));
    this.commandHandlers.set(VillagerCommand.BUILD, this.handleBuildCommand.bind(this));
    this.commandHandlers.set(VillagerCommand.GATHER, this.handleGatherCommand.bind(this));
    this.commandHandlers.set(VillagerCommand.STOP, this.handleStopCommand.bind(this));
    this.commandHandlers.set(VillagerCommand.CLEAR_SELECTION, this.handleClearSelectionCommand.bind(this));
  }
  
  /**
   * Execute a command on the villager system
   * This is the main entry point for the input layer to interact with villager logic
   */
  public executeCommand(command: VillagerCommand, payload: CommandPayload = {}): void {
    const handler = this.commandHandlers.get(command);
    if (handler) {
      handler(payload);
    } else {
      console.warn(`Unknown command: ${command}`);
    }
    
    // Update selection count display after any command
    this.updateSelectionCountDisplay();
  }
  
  /**
   * Handle villager selection input
   * This is called from UI layer and translates the input to appropriate commands
   */
  public handleVillagerSelection(villager: Villager, addToSelection: boolean = false): void {
    if (addToSelection) {
      // Toggle selection state
      if (this.selectedVillagers.includes(villager)) {
        this.executeCommand(VillagerCommand.DESELECT, { villager });
      } else {
        this.executeCommand(VillagerCommand.SELECT, { villager, addToSelection: true });
      }
    } else {
      // Clear selection and select just this villager
      this.executeCommand(VillagerCommand.CLEAR_SELECTION);
      this.executeCommand(VillagerCommand.SELECT, { villager });
    }
  }
  
  // Command handler implementations
  
  private handleSelectCommand(payload: CommandPayload): void {
    const { villager, villagers, addToSelection = false } = payload;
    
    // If not adding to selection, clear the current selection first
    if (!addToSelection) {
      this.selectedVillagers = [];
    }
    
    // Handle single villager selection
    if (villager && !villagers) {
      // Check if already selected
      if (!this.selectedVillagers.includes(villager)) {
        this.selectedVillagers.push(villager);
        villager.stateMachine.handleEvent(VillagerEvent.SELECT);
      }
      return;
    }
    
    // Handle multiple villager selection
    if (villagers) {
      villagers.forEach(v => {
        // Check if already selected
        if (!this.selectedVillagers.includes(v)) {
          this.selectedVillagers.push(v);
          v.stateMachine.handleEvent(VillagerEvent.SELECT);
        }
      });
    }
  }
  
  private handleDeselectCommand(payload: CommandPayload): void {
    const { villager } = payload;
    if (!villager) return;
    
    const index = this.selectedVillagers.indexOf(villager);
    if (index !== -1) {
      this.selectedVillagers.splice(index, 1);
      villager.stateMachine.handleEvent(VillagerEvent.DESELECT);
    }
  }
  
  private handleToggleSelectionCommand(payload: CommandPayload): void {
    const { villager } = payload;
    if (!villager) return;
    
    if (this.selectedVillagers.includes(villager)) {
      this.executeCommand(VillagerCommand.DESELECT, { villager });
    } else {
      this.executeCommand(VillagerCommand.SELECT, { villager, addToSelection: true });
    }
  }
  
  private handleMoveToCommand(payload: CommandPayload): void {
    const { villager, position } = payload;
    if (!villager || !position) return;
    
    this.moveVillagerTo(villager, position.x, position.y);
  }
  
  private handleMoveGroupToCommand(payload: CommandPayload): void {
    const { position } = payload;
    if (!position) return;
    
    if (this.selectedVillagers.length > 0) {
      this.moveSelectedVillagersToPoint(position.x, position.y);
    }
  }
  
  private handleBuildCommand(payload: CommandPayload): void {
    const { villager, foundation } = payload;
    if (!villager || !foundation) return;
    
    // Logic for assigning villager to foundation would go here
    // This would typically involve pathfinding to the foundation and setting a build task
  }
  
  private handleGatherCommand(payload: CommandPayload): void {
    const { villager, target } = payload;
    if (!villager || !target) return;
    
    // Logic for resource gathering would go here
  }
  
  private handleStopCommand(payload: CommandPayload): void {
    const { villager } = payload;
    if (!villager) {
      // If no specific villager, stop all selected villagers
      this.selectedVillagers.forEach(v => {
        v.moving = false;
        v.path = [];
        v.task = null;
        v.stateMachine.handleEvent(VillagerEvent.MOVE_INTERRUPTED);
      });
    } else {
      // Stop specific villager
      villager.moving = false;
      villager.path = [];
      villager.task = null;
      villager.stateMachine.handleEvent(VillagerEvent.MOVE_INTERRUPTED);
    }
  }
  
  private handleClearSelectionCommand(): void {
    // Deselect all villagers
    this.selectedVillagers.forEach(villager => {
      villager.stateMachine.handleEvent(VillagerEvent.DESELECT);
    });
    
    // Clear selection array
    this.selectedVillagers = [];
  }
  
  /**
   * Create a new villager (just logic, no rendering)
   */
  public createVillager(x: number, y: number): Villager {
    // Get a unique identifier for the villager
    const villagerId = this.villagers.length;
    
    // Create villager data object without rendering properties
    const villager: Villager = {
      x: x,
      y: y,
      pixelX: 0,  // These will be updated by the renderer
      pixelY: 0,
      targetX: x,
      targetY: y,
      moving: false,
      speed: VILLAGER_SPEED,
      path: [],
      task: null,
      currentBuildTask: null,
      health: 100,
      maxHealth: 100,
      stateMachine: null as any, // Will be set immediately after
      // These properties will be set by the renderer
      sprite: null as any,
      selectionRing: null as any
    };
    
    // Create state machine context
    const stateMachineContext: VillagerStateContext = { villager };
    
    // Create and attach state machine
    villager.stateMachine = new VillagerStateMachine(stateMachineContext, {
      onStateChange: (from, to) => {
        console.log(`Villager state changed from ${from} to ${to}`);
      }
    });
    
    // Add to villager list
    this.villagers.push(villager);
    
    return villager;
  }
  
  /**
   * Set the dynamic pathfinder instance
   */
  public setPathfinder(pathfinder: any): void {
    this.dynamicPathfinder = pathfinder;
  }
  
  /**
   * Enable or disable path recalculation
   */
  public setPathRecalculationEnabled(enabled: boolean): void {
    this.pathRecalculationEnabled = enabled;
  }
  
  /**
   * Check if path recalculation is enabled
   */
  public isPathRecalculationEnabled(): boolean {
    return this.pathRecalculationEnabled;
  }
  
  /**
   * Update all villagers (game logic only)
   */
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
        }
      }
      
      // Handle building tasks if needed
      if (villager.stateMachine.getCurrentState() === VillagerState.BUILDING && villager.currentBuildTask) {
        // Building task logic remains unchanged
      }
    });
  }
  
  /**
   * Handle the case when a villager's next waypoint is unwalkable
   */
  private handleUnwalkableWaypoint(villager: Villager): void {
    console.log(`Obstacle detected for villager at (${villager.x.toFixed(2)}, ${villager.y.toFixed(2)})`);
    
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

  /**
   * Move a villager to a specific position
   */
  public moveVillagerTo(villager: Villager, targetX: number, targetY: number, callback?: () => void, recursionDepth: number = 0): void {
    // Prevent infinite recursion
    const MAX_RECURSION_DEPTH = 2;
    if (recursionDepth > MAX_RECURSION_DEPTH) {
      console.warn(`Maximum recursion depth reached for pathfinding. Aborting movement to (${targetX}, ${targetY})`);
      
      if (callback) callback();
      
      villager.stateMachine.handleEvent(VillagerEvent.MOVE_INTERRUPTED);
      return;
    }
    
    // Ensure target coordinates are within map bounds
    const clampedX = Math.max(0, Math.min(targetX, MAP_WIDTH - 0.05));
    const clampedY = Math.max(0, Math.min(targetY, MAP_HEIGHT - 0.05));
    
    // Use dynamic pathfinder if available
    let path: GridPosition[] = [];
    
    if (this.dynamicPathfinder) {
      path = this.dynamicPathfinder.findPath(villager, clampedX, clampedY);
    } else {
      // Fall back to basic pathfinder
      const pathFinder = new SubTilePathFinder(this.gameMap);
      path = pathFinder.findPath(villager.x, villager.y, clampedX, clampedY);
    }
    
    // If no path found, try to find an alternative
    if (path.length === 0) {
      // Only try to find alternative if we haven't already recursed too deep
      if (recursionDepth < MAX_RECURSION_DEPTH) {
        const nearbyWalkable = this.gameMap.findNearestWalkableTile(
          Math.floor(clampedX), 
          Math.floor(clampedY), 
          3
        );
        
        if (nearbyWalkable && 
            (nearbyWalkable.x !== clampedX || nearbyWalkable.y !== clampedY)) {
          // Try again with the nearby position
          this.moveVillagerTo(villager, nearbyWalkable.x, nearbyWalkable.y, callback, recursionDepth + 1);
          return;
        }
      }
      
      // If still no path, abort the movement
      villager.stateMachine.handleEvent(VillagerEvent.MOVE_INTERRUPTED);
      
      if (callback) callback();
      return;
    }
    
    // Create the task
    const task: VillagerTask = {
      type: 'move',
      target: { x: clampedX, y: clampedY },
      callback: callback
    };
    
    // Set movement properties
    villager.task = task;
    villager.targetX = clampedX;
    villager.targetY = clampedY;
    villager.path = path;
    villager.moving = true;
    
    // Trigger state machine event
    villager.stateMachine.handleEvent(VillagerEvent.START_MOVE);
  }
  
  /**
   * Move selected villagers to a point
   */
  public moveSelectedVillagersToPoint(targetX: number, targetY: number): void {
    if (this.selectedVillagers.length === 0) return;
    
    // For multiple units, generate formation positions
    if (this.selectedVillagers.length === 1) {
      // For single unit, directly check if the target is walkable
      const targetTileX = Math.floor(targetX);
      const targetTileY = Math.floor(targetY);
      
      if (this.gameMap.isTileWalkable(targetTileX, targetTileY)) {
        // Target is walkable, move directly to it
        this.moveVillagerTo(this.selectedVillagers[0], targetX, targetY);
      } else {
        // Find nearest walkable position
        const nearbyWalkable = this.gameMap.findNearestWalkableTile(targetTileX, targetTileY, 3);
        if (nearbyWalkable) {
          this.moveVillagerTo(this.selectedVillagers[0], nearbyWalkable.x, nearbyWalkable.y);
        }
      }
      return;
    }
    
    // For multiple units, generate formation positions
    const positions = this.generateFormationPositions(targetX, targetY, this.selectedVillagers.length);
    
    // Assign each villager a position
    for (let i = 0; i < this.selectedVillagers.length; i++) {
      const targetPos = positions[i];
      if (targetPos) {
        // Move to formation position
        this.moveVillagerTo(this.selectedVillagers[i], targetPos.x, targetPos.y);
      }
    }
  }
  
  /**
   * Generate positions for villager formations
   */
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
  
  /**
   * Find a villager at a specific position
   */
  public findVillagerAtPosition(x: number, y: number): Villager | null {
    const tolerance = 0.5; // Allow some tolerance for clicking
    
    for (const villager of this.villagers) {
      const dx = Math.abs(villager.x - x);
      const dy = Math.abs(villager.y - y);
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < tolerance) {
        return villager;
      }
    }
    
    return null;
  }
  
  /**
   * Legacy compatibility methods - now just delegate to command system
   */
  public selectVillager(villager: Villager, addToSelection: boolean = false): void {
    this.executeCommand(
      addToSelection ? VillagerCommand.SELECT : VillagerCommand.TOGGLE_SELECTION, 
      { villager, addToSelection }
    );
  }
  
  public clearSelection(): void {
    this.executeCommand(VillagerCommand.CLEAR_SELECTION);
  }
  
  /**
   * Update the selection count display in the UI
   */
  private updateSelectionCountDisplay(): void {
    // Find the selection count element
    const selectionElement = document.getElementById('villager-selection-count');
    if (selectionElement) {
      selectionElement.textContent = `Villagers: ${this.selectedVillagers.length}`;
    }
  }
  
  /**
   * Get all villagers
   */
  public getAllVillagers(): Villager[] {
    return this.villagers;
  }
  
  /**
   * Get selected villagers
   */
  public getSelectedVillagers(): Villager[] {
    return this.selectedVillagers;
  }

  /**
   * Assign villagers to foundation task
   */
  public assignVillagersToFoundation(villagers: Villager[], foundation: any): void {
    villagers.forEach(villager => {
      // Find an available position around the foundation
      const buildPosition = this.gameMap.wallManager?.findAvailableBuildPosition(foundation);
      
      if (!buildPosition) {
        console.log("No available build positions for villager");
        return;
      }
      
      // Move villager to build position
      this.moveVillagerTo(villager, buildPosition.x, buildPosition.y, () => {
        // Set build task
        villager.currentBuildTask = {
          type: 'wall',
          foundation: {
            x: foundation.x,
            y: foundation.y,
            health: foundation.buildProgress || 0,
            maxHealth: 100
          },
          buildPosition: buildPosition
        };
        
        // Trigger build state
        villager.stateMachine.handleEvent(VillagerEvent.START_BUILD);
        
        // Add villager to foundation
        if (!foundation.assignedVillagers.includes(villager)) {
          foundation.assignedVillagers.push(villager);
        }
      });
    });
  }
}

// Export these for use in other files
export { 
  VillagerStateMachine, 
  VillagerState, 
  VillagerEvent 
} from './VillagerStateMachine';