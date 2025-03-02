// src/components/UIManager.ts - Complete implementation using command pattern
import * as PIXI from 'pixi.js';
import { GridPosition, TileType } from '../types';
import { GameMap } from './Map';
import { VillagerManager, VillagerCommand } from './Villager';
import { BuildingManager } from './Building';
import { CoordinateTransformer } from '../utils/CoordinateTransformer';
import { BuildingState } from './BuildingStateMachine';
import { SubTilePathFinder } from '../utils/pathfinding';

/**
 * UIManager handles user interaction with the game
 * Using command pattern to decouple input handling from game logic
 */
export class UIManager {
  private transformer: CoordinateTransformer;
  private gameMap: GameMap | null = null;
  private villagerManager: VillagerManager | null = null;
  private buildingManager: BuildingManager | null = null;
  
  // Interaction state
  private hoveredTile: GridPosition = { x: -1, y: -1 };
  private isSelecting: boolean = false;
  private selectionStartX: number = 0;
  private selectionStartY: number = 0;
  private selectionEndX: number = 0;
  private selectionEndY: number = 0;
  private isDragging: boolean = false;
  
  // Build mode drag properties
  private buildDragging: boolean = false;
  private buildStartTile: GridPosition | null = null;
  private buildPreviewTiles: any[] = []; // Track tile references for highlighting
  
  // Shift key handler
  private shiftKeyHandler: () => boolean = () => false;
  
  // Build time toggle handler
  private onBuildTimeToggle: ((enabled: boolean) => void) | null = null;
  private buildTimeEnabled: boolean = false;

  constructor(transformer: CoordinateTransformer) {
    this.transformer = transformer;
    this.setupBuildTimeToggle();
  }
  
  /**
   * Connect to game components
   */
  public connectToGameComponents(
    gameMap: GameMap,
    villagerManager: VillagerManager,
    buildingManager: BuildingManager
  ): void {
    this.gameMap = gameMap;
    this.villagerManager = villagerManager;
    this.buildingManager = buildingManager;
  }
  
  /**
   * Set a callback for handling shift key state
   */
  public setShiftKeyHandler(handler: () => boolean): void {
    this.shiftKeyHandler = handler;
  }
  
  /**
   * Set a callback for handling build time toggle
   */
  public setBuildTimeToggleHandler(callback: (enabled: boolean) => void): void {
    this.onBuildTimeToggle = callback;
  }
  
  /**
   * Handle left click on tile
   */
  public handleLeftClick(x: number, y: number, isCtrlPressed: boolean = false, screenX?: number, screenY?: number): void {
    if (!this.gameMap || !this.villagerManager || !this.buildingManager) {
      console.error("Game components not connected");
      return;
    }
    
    console.log(`Left click - Coordinates: x=${x}, y=${y}`);
    
    // Get the precise sub-tile position within the tile
    let preciseX = x, preciseY = y;
    
    // If we have screen coordinates, use them for more precision
    if (screenX !== undefined && screenY !== undefined) {
      const precisePos = this.transformer.getPrecisePositionFromScreen(screenX, screenY);
      preciseX = precisePos.x;
      preciseY = precisePos.y;
    } else {
      // Otherwise add a small random offset to avoid stacking
      preciseX = x + (Math.random() * 0.1);
      preciseY = y + (Math.random() * 0.1);
    }
    
    // Check if we're in build mode
    if (this.buildingManager.getBuildMode() === 'wall') {
      const isShiftDown = this.shiftKeyHandler();
      this.buildingManager.handleTileClick(x, y, isShiftDown);
      return;
    }
    
    // Check if there's a villager at this position
    const clickedVillager = this.villagerManager.findVillagerAtPosition(x, y);
    
    if (clickedVillager) {
      // Use the new command pattern instead of direct calls
      if (isCtrlPressed) {
        // With Ctrl, toggle the selection state of this villager
        this.villagerManager.executeCommand(VillagerCommand.TOGGLE_SELECTION, { villager: clickedVillager });
      } else {
        // Without Ctrl, clear selection and select just this villager
        this.villagerManager.executeCommand(VillagerCommand.CLEAR_SELECTION);
        this.villagerManager.executeCommand(VillagerCommand.SELECT, { villager: clickedVillager });
      }
    } else {
      // If no villager, deselect all (unless Ctrl is pressed)
      if (!isCtrlPressed) {
        this.villagerManager.executeCommand(VillagerCommand.CLEAR_SELECTION);
      }
    }
  }
  
  /**
   * Handle right click on tile
   */
  public handleRightClick(x: number, y: number, mouseX: number, mouseY: number): void {
    if (!this.gameMap || !this.villagerManager || !this.buildingManager) {
      console.error("Game components not connected");
      return;
    }
    
    console.log(`Right click - Coordinates: x=${x}, y=${y}, Screen: (${mouseX}, ${mouseY})`);
    
    // Get the precise sub-tile position
    const preciseIsoPosition = this.transformer.getPrecisePositionFromScreen(mouseX, mouseY);
    
    const selectedVillagers = this.villagerManager.getSelectedVillagers();
    
    // If we have villagers selected, right-click on ground moves them
    if (selectedVillagers.length > 0) {
      // First, cancel any build tasks for selected villagers
      selectedVillagers.forEach(villager => {
        if (villager.currentBuildTask) {
          // Find the foundation
          const foundation = this.gameMap!.findFoundationAtPosition(
            villager.currentBuildTask?.foundation?.x ?? -1,
            villager.currentBuildTask?.foundation?.y ?? -1
          );
          
          if (foundation) {
            // Release the build position
            if (villager.currentBuildTask.buildPosition) {
              this.gameMap!.wallManager?.releaseBuildPosition(
                foundation,
                villager.currentBuildTask.buildPosition
              );
            }
            
            // Remove villager from assigned villagers list
            const index = foundation.assignedVillagers.indexOf(villager);
            if (index !== -1) {
              foundation.assignedVillagers.splice(index, 1);
            }
          }
          
          // Clear the build task
          villager.currentBuildTask = null;
        }
      });
      
      // Check if the tile is walkable
      const tileX = Math.floor(preciseIsoPosition.x);
      const tileY = Math.floor(preciseIsoPosition.y);
      
      if (this.gameMap.isTileWalkable(tileX, tileY)) {
        // Use the command pattern for movement
        this.villagerManager.executeCommand(VillagerCommand.MOVE_GROUP_TO, {
          position: preciseIsoPosition
        });
      } else {
        // Check if there's a foundation at this position for build assignment
        const foundation = this.gameMap.findFoundationAtPosition(tileX, tileY);
        if (foundation && foundation.stateMachine.getCurrentState() === BuildingState.FOUNDATION) {
          // Assign villagers to build the foundation
          this.buildingManager.assignVillagersToFoundation(selectedVillagers, foundation);
          return;
        }
        
        // If not a foundation or not walkable, try to find the closest walkable position
        console.log(`Target tile (${tileX}, ${tileY}) is not walkable, looking for nearby position`);
        
        // Try to find a position as close as possible to where the user clicked
        const pathFinder = new SubTilePathFinder(this.gameMap);
        const closestPoint = pathFinder.findNearestAccessiblePoint(
          { x: selectedVillagers[0].x, y: selectedVillagers[0].y },
          preciseIsoPosition
        );
        
        if (closestPoint) {
          this.villagerManager.executeCommand(VillagerCommand.MOVE_GROUP_TO, {
            position: closestPoint
          });
        } else {
          // If still can't find a path, try the traditional approach
          const nearbyPos = this.gameMap.getAdjacentWalkableTile(tileX, tileY);
          if (nearbyPos) {
            this.villagerManager.executeCommand(VillagerCommand.MOVE_GROUP_TO, {
              position: { x: nearbyPos.x + 0.5, y: nearbyPos.y + 0.5 }
            });
          }
        }
      }
    } else {
      // If no villagers selected, open build menu
      this.buildingManager.showBuildMenu(mouseX, mouseY);
    }
  }
  
  /**
   * Handle mouse down event
   */
  public onMouseDown(event: MouseEvent): void {
    if (!this.gameMap || !this.villagerManager || !this.buildingManager) {
      return;
    }
    
    // Only start selection on left mouse button
    if (event.button === 0) {
      // Check if we're in build mode with shift key
      if (this.buildingManager.getBuildMode() === 'wall' && this.shiftKeyHandler()) {
        const tilePos = this.getTileAtScreenPosition(event.clientX, event.clientY);
        if (tilePos.x >= 0 && tilePos.y >= 0) {
          // Start build dragging
          this.buildStartTile = tilePos;
          this.buildDragging = true;
          return;
        }
      }
      
      // Start normal selection process
      this.isSelecting = true;
      this.isDragging = false;
      this.selectionStartX = event.clientX;
      this.selectionStartY = event.clientY;
      this.selectionEndX = event.clientX;
      this.selectionEndY = event.clientY;
    }
  }
  
  /**
   * Handle mouse move event
   */
  public onMouseMove(event: MouseEvent): void {
    if (!this.gameMap || !this.villagerManager || !this.buildingManager) {
      return;
    }
    
    // Update build preview if in build drag mode
    if (this.buildDragging && this.buildStartTile && this.shiftKeyHandler()) {
      const currentTile = this.getTileAtScreenPosition(event.clientX, event.clientY);
      if (currentTile.x >= 0 && currentTile.y >= 0) {
        // Inform the renderer to update build preview
        this.notifyBuildPreviewChanged(this.buildStartTile, currentTile);
      }
    }
    
    // Update selection box
    if (this.isSelecting) {
      const dragDistance = Math.sqrt(
        Math.pow(event.clientX - this.selectionStartX, 2) + 
        Math.pow(event.clientY - this.selectionStartY, 2)
      );
      
      // If moved more than a few pixels, consider it a drag
      if (dragDistance > 5) {
        this.isDragging = true;
        this.selectionEndX = event.clientX;
        this.selectionEndY = event.clientY;
        
        // Update selection box (will be handled by renderer)
        this.notifySelectionBoxChanged();
      }
    }
  }
  
  /**
   * Handle mouse up event
   */
  public onMouseUp(event: MouseEvent): void {
    if (!this.gameMap || !this.villagerManager || !this.buildingManager) {
      return;
    }
    
    // Handle build mode drag end
    if (this.buildDragging && this.buildStartTile && event.button === 0) {
      const endTile = this.getTileAtScreenPosition(event.clientX, event.clientY);
      
      if (endTile.x >= 0 && endTile.y >= 0) {
        // If shift is still held, place all foundations
        if (this.shiftKeyHandler()) {
          console.log("Completing build drag from", this.buildStartTile, "to", endTile);
          
          // Calculate all tiles in the line
          const tiles = this.calculateLineTiles(this.buildStartTile, endTile);
          
          // Create foundations on all tiles
          tiles.forEach((tile, index) => {
            // Always keep build mode (shift=true) when placing multiple foundations
            this.buildingManager!.handleTileClick(tile.x, tile.y, true);
          });
        } else {
          // If shift was released, we already placed a single foundation in the keyup handler
          console.log("Shift not held at end of drag");
        }
      }
      
      // Notify that build preview should be cleared
      this.notifyBuildPreviewCleared();
      
      // Exit build mode completely
      this.buildingManager.setBuildMode(null);
      this.buildDragging = false;
      this.buildStartTile = null;
    }
    
    // Handle selection box completion
    if (this.isSelecting && event.button === 0) {
      // Finish selection
      this.selectionEndX = event.clientX;
      this.selectionEndY = event.clientY;
      
      // Only handle selection if box is large enough (indicating a drag)
      const width = Math.abs(this.selectionEndX - this.selectionStartX);
      const height = Math.abs(this.selectionEndY - this.selectionStartY);
      
      if (this.isDragging && width > 5 && height > 5) {
        this.handleSelectionBox();
      }
      
      // Reset selection state
      this.isSelecting = false;
      this.isDragging = false;
      
      // Notify that selection box should be cleared
      this.notifySelectionBoxCleared();
    }
  }
  
  /**
   * Handle selection box completion
   */
  private handleSelectionBox(): void {
    if (!this.villagerManager) return;
    
    // Get all villagers
    const allVillagers = this.villagerManager.getAllVillagers();
    
    // Convert selection box to screen coordinates
    const startX = Math.min(this.selectionStartX, this.selectionEndX);
    const startY = Math.min(this.selectionStartY, this.selectionEndY);
    const endX = Math.max(this.selectionStartX, this.selectionEndX);
    const endY = Math.max(this.selectionStartY, this.selectionEndY);
    
    // Check if Ctrl key is pressed for multi-selection
    const isCtrlPressed = this.isCtrlKeyPressed();
    
    // If not holding Ctrl, clear current selection first
    if (!isCtrlPressed) {
      this.villagerManager.executeCommand(VillagerCommand.CLEAR_SELECTION);
    }
    
    // Find all villagers inside the selection box
    const villagersToSelect = [];
    
    for (const villager of allVillagers) {
      // Get villager screen position
      const villagerScreenPos = this.getVillagerScreenPosition(villager);
      
      // Check if villager is inside selection box
      if (
        villagerScreenPos.x >= startX &&
        villagerScreenPos.x <= endX &&
        villagerScreenPos.y >= startY &&
        villagerScreenPos.y <= endY
      ) {
        villagersToSelect.push(villager);
      }
    }
    
    // Select all villagers in the box at once
    if (villagersToSelect.length > 0) {
      this.villagerManager.executeCommand(VillagerCommand.SELECT, {
        villagers: villagersToSelect,
        addToSelection: isCtrlPressed
      });
    }
  }
  
  /**
   * Calculate tiles between two points using Bresenham's line algorithm
   */
  private calculateLineTiles(startTile: GridPosition, endTile: GridPosition): GridPosition[] {
    const tiles: GridPosition[] = [];
    
    // Bresenham's line algorithm
    const x1 = startTile.x;
    const y1 = startTile.y;
    const x2 = endTile.x;
    const y2 = endTile.y;
    
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;
    
    let x = x1;
    let y = y1;
    
    while (true) {
      tiles.push({ x, y });
      
      if (x === x2 && y === y2) break;
      
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
    
    return tiles;
  }
  
  /**
   * Get the tile at a screen position
   */
  private getTileAtScreenPosition(screenX: number, screenY: number): GridPosition {
    const precisePos = this.transformer.getPrecisePositionFromScreen(screenX, screenY);
    
    // For tile-based operations, return the integer tile coordinates
    return {
      x: Math.floor(precisePos.x),
      y: Math.floor(precisePos.y)
    };
  }
  
  /**
   * Get the screen position of a villager
   */
  private getVillagerScreenPosition(villager: any): { x: number, y: number } {
    if (!villager.sprite) {
      // If no sprite, use transformer to get screen position from logical position
      const pos = this.transformer.toScreen(villager.x, villager.y);
      return { x: pos.x, y: pos.y };
    }
    
    // If sprite exists, use its bounds
    const bounds = villager.sprite.getBounds();
    return {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2
    };
  }
  
  /**
   * Checker for Ctrl key
   */
  private isCtrlKeyPressed(): boolean {
    return !!window.event && !!(window.event as KeyboardEvent).ctrlKey;
  }
  
  /**
   * Setup build time toggle UI
   */
  private setupBuildTimeToggle(): void {
    // Create a button to toggle build time display
    const buildTimeButton = document.createElement('button');
    buildTimeButton.id = 'toggle-build-time';
    buildTimeButton.textContent = 'Show Build Times';
    buildTimeButton.style.position = 'fixed';
    buildTimeButton.style.top = '80px';
    buildTimeButton.style.right = '10px';
    buildTimeButton.style.zIndex = '1000';
    buildTimeButton.style.padding = '5px 10px';
    buildTimeButton.style.backgroundColor = '#4CAF50';
    buildTimeButton.style.color = 'white';
    buildTimeButton.style.border = 'none';
    buildTimeButton.style.borderRadius = '4px';
    buildTimeButton.style.cursor = 'pointer';
    
    // Add click handler
    buildTimeButton.addEventListener('click', () => {
      this.buildTimeEnabled = !this.buildTimeEnabled;
      buildTimeButton.textContent = this.buildTimeEnabled 
        ? 'Hide Build Times' 
        : 'Show Build Times';
      
      // Call the callback if it exists
      if (this.onBuildTimeToggle) {
        this.onBuildTimeToggle(this.buildTimeEnabled);
      }
    });
    
    // Add to DOM
    document.body.appendChild(buildTimeButton);
  }
  
  /**
   * These methods are used to notify the rendering system about UI state changes
   * In a fully decoupled system, these would be implemented using an event system or callbacks
   */
  
  // Notify that build preview has changed
  private notifyBuildPreviewChanged(startTile: GridPosition, currentTile: GridPosition): void {
    // This would typically emit an event that the rendering system listens for
    // For now, we'll assume there's a direct connection to the renderer
    const event = new CustomEvent('buildPreviewChanged', { 
      detail: { startTile, currentTile } 
    });
    document.dispatchEvent(event);
  }
  
  // Notify that build preview should be cleared
  private notifyBuildPreviewCleared(): void {
    const event = new CustomEvent('buildPreviewCleared');
    document.dispatchEvent(event);
  }
  
  // Notify that selection box has changed
  private notifySelectionBoxChanged(): void {
    const event = new CustomEvent('selectionBoxChanged', {
      detail: {
        startX: this.selectionStartX,
        startY: this.selectionStartY,
        endX: this.selectionEndX,
        endY: this.selectionEndY
      }
    });
    document.dispatchEvent(event);
  }
  
  // Notify that selection box should be cleared
  private notifySelectionBoxCleared(): void {
    const event = new CustomEvent('selectionBoxCleared');
    document.dispatchEvent(event);
  }
  
  /**
   * Tile hover callbacks
   */
  public handleTileHoverIn(x: number, y: number): void {
    if (!this.gameMap || !this.buildingManager) return;
    
    this.hoveredTile = { x, y };
    
    // If in wall build mode, determine visual feedback
    if (this.buildingManager.getBuildMode() === 'wall') {
      // Check if wall can be placed
      const canPlaceWall = this.gameMap.getTile(x, y)?.type !== TileType.TREE &&
                           this.gameMap.getTile(x, y)?.type !== TileType.STONE &&
                           this.gameMap.getTile(x, y)?.type !== TileType.WALL;
      
      // Notify renderer of the hover state
      const event = new CustomEvent('tileHoverIn', { 
        detail: { 
          x, 
          y, 
          color: canPlaceWall ? 0x00FF00 : 0xFF0000 
        } 
      });
      document.dispatchEvent(event);
      
      // If build dragging, show preview
      if (this.buildDragging && this.buildStartTile) {
        this.notifyBuildPreviewChanged(this.buildStartTile, { x, y });
      }
    } else {
      // Standard hover highlight
      const event = new CustomEvent('tileHoverIn', { 
        detail: { x, y, color: 0xDDDDDD } 
      });
      document.dispatchEvent(event);
    }
  }
  
  public handleTileHoverOut(x: number, y: number): void {
    this.hoveredTile = { x: -1, y: -1 };
    
    // Notify renderer
    const event = new CustomEvent('tileHoverOut', { detail: { x, y } });
    document.dispatchEvent(event);
  }
  
  /**
   * Get the current hovered tile
   */
  public getHoveredTile(): GridPosition {
    return this.hoveredTile;
  }
  
  /**
   * Handle keyboard events
   */
  public handleKeyDown(e: KeyboardEvent): void {
    if (!this.gameMap || !this.buildingManager) return;
    
    // ESC key to cancel build mode
    if (e.key === 'Escape') {
      this.buildingManager.setBuildMode(null);
    }
    
    // Delete key to remove walls/foundations
    if (e.key === 'Delete' || e.key === 'Backspace') {
      // Find if any foundations are hovered
      const hoveredTile = this.hoveredTile;
      if (hoveredTile.x >= 0 && hoveredTile.y >= 0) {
        this.gameMap.deleteWallAtPosition(hoveredTile.x, hoveredTile.y);
      }
    }
    
    // Space key to stop selected villagers
    if (e.key === ' ' || e.key === 'Space') {
      const selectedVillagers = this.villagerManager?.getSelectedVillagers();
      if (selectedVillagers && selectedVillagers.length > 0) {
        this.villagerManager.executeCommand(VillagerCommand.STOP);
        e.preventDefault(); // Prevent page scroll
      }
    }
  }
  
  /**
   * Handle tile click events
   */
  public handleTileClick(x: number, y: number, event: any): void {
    if (!this.gameMap || !this.villagerManager || !this.buildingManager) return;
    
    const nativeEvent = event.nativeEvent || event;
    
    // Check for wall build mode first
    if (this.buildingManager.getBuildMode() === 'wall') {
      // Check if shift key is down
      const isShiftDown = this.shiftKeyHandler();
      
      if (nativeEvent.button === 0) { // Left click in build mode
        if (isShiftDown && this.buildingManager.getBuildMode() === 'wall') {
          this.buildStartTile = { x, y };
          this.buildDragging = true;
        } else {
          this.buildingManager.handleTileClick(x, y, isShiftDown);
        }
        return;
      }
    }
    
    // Normal click handling
    if (nativeEvent.button === 0) { // Left click
      // Check if Ctrl key is pressed for multi-selection
      const isCtrlPressed = nativeEvent.ctrlKey || nativeEvent.metaKey;
      
      // If not dragging, handle click
      if (!this.isDragging) {
        this.handleLeftClick(x, y, isCtrlPressed, nativeEvent.clientX, nativeEvent.clientY);
      }
    } else if (nativeEvent.button === 2) { // Right click
      this.handleRightClick(x, y, nativeEvent.clientX, nativeEvent.clientY);
    }
  }
}