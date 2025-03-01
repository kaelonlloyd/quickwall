import * as PIXI from 'pixi.js';
import { BuildingManager } from './Building';
import { GameMap } from './Map';
import { VillagerManager } from './Villager';
import { GridPosition, TileType } from '../types';
import {IsometricUtils} from '../utils/IsometricUtils';
import { BuildingState } from './BuildingStateMachine';
import {SubTilePathFinder} from '../utils/pathfinding';

export class UIManager {
  private app: PIXI.Application;
  private groundLayer: PIXI.Container;
  private objectLayer: PIXI.Container;
  private gameMap: GameMap;
  private villagerManager: VillagerManager;
  private buildingManager: BuildingManager;
  private hoveredTile: GridPosition;
  
  
  
  // Selection box properties
  private selectionBox: PIXI.Graphics;
  private isSelecting: boolean = false;
  private selectionStartX: number = 0;
  private selectionStartY: number = 0;
  private selectionEndX: number = 0;
  private selectionEndY: number = 0;
  private isDragging: boolean = false;
  
  // Build mode drag properties
  private buildDragging: boolean = false;
  private buildStartTile: GridPosition | null = null;
  private buildPreviewTiles: PIXI.Graphics[] = [];
  
  // Shift key handler
  private shiftKeyHandler: () => boolean = () => false;
  

  private isoUtils: IsometricUtils;
  private buildTimeEnabled: boolean = false;
  private onBuildTimeToggle!: (enabled: boolean) => void;

  constructor(
    app: PIXI.Application, 
    groundLayer: PIXI.Container,
    objectLayer: PIXI.Container,
    gameMap: GameMap, 
    villagerManager: VillagerManager,
    buildingManager: BuildingManager,
    isoUtils: IsometricUtils // Direct injection
  ) {
    this.app = app;
    this.isoUtils = isoUtils;
    this.groundLayer = groundLayer;
    this.objectLayer = objectLayer;
    this.gameMap = gameMap;
    this.villagerManager = villagerManager;
    this.buildingManager = buildingManager;
    this.hoveredTile = { x: -1, y: -1 };
    
    // Create selection box
    this.selectionBox = new PIXI.Graphics();
    this.selectionBox.zIndex = 1000;
    this.app.stage.addChild(this.selectionBox);
    

    this.setupBuildTimeToggle();

    this.setupEventListeners();
  }
  
  // Method to set the shift key handler from outside
  public setShiftKeyHandler(handler: () => boolean): void {
    this.shiftKeyHandler = handler;
  }
  
  private setupEventListeners(): void {
    // Prevent context menu
    document.oncontextmenu = () => false;
    this.app.canvas.oncontextmenu = () => false;
    
    // Keyboard events
    document.addEventListener('keydown', (e) => {
      // ESC key to cancel build mode
      if (e.key === 'Escape') {
        this.buildingManager.setBuildMode(null);
      }
      
      // Delete key to remove walls/foundations
      if (e.key === 'Delete' || e.key === 'Backspace') {
        this.handleDeleteKey();
      }
    });

    // Add tracking for shift key release during build dragging
    document.addEventListener('keyup', (e) => {
      if (e.key === 'Shift') {
        // If we were in build dragging mode and shift is released before mouse
        if (this.buildDragging && this.buildStartTile) {
          console.log("Shift released during drag, placing single foundation");
          this.buildingManager.handleTileClick(this.buildStartTile.x, this.buildStartTile.y, false);
          
          // Clean up the build state
          this.clearBuildPreview();
          this.buildDragging = false;
          this.buildStartTile = null;
        }
      }
    });
    
    // Selection box events - attach to canvas
    const canvas = this.app.canvas;
    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mouseup', this.onMouseUp.bind(this));


    
    // Set up interactive events on ground tiles
    for (let i = 0; i < this.groundLayer.children.length; i++) {
      const tile = this.groundLayer.children[i] as PIXI.Graphics;
      
      // Get tile grid coordinates
      const tileX = (tile as any).tileX;
      const tileY = (tile as any).tileY;
      
      if (tileX !== undefined && tileY !== undefined) {
        tile.on('pointerdown', (event) => {
          const point = event.global;
          const nativeEvent = event.nativeEvent as PointerEvent;
          
          // Check for wall build mode first
          if (this.buildingManager.getBuildMode() === 'wall') {
            // Check if shift key is down
            const isShiftDown = this.shiftKeyHandler();
            
            if (nativeEvent.button === 0) { // Left click in build mode
              if (isShiftDown && this.buildingManager.getBuildMode() === 'wall') {
                this.buildStartTile = { x: tileX, y: tileY };
                this.buildDragging = true;
              } else {
                this.buildingManager.handleTileClick(tileX, tileY, isShiftDown);
              }
              return;
            }
          }
          
          // Existing click handling
          if (event.button === 0) { // Left click
            // Check if Ctrl key is pressed for multi-selection
            const isCtrlPressed = nativeEvent.ctrlKey || nativeEvent.metaKey;
            
            // If not dragging, handle click
            if (!this.isDragging) {
              this.handleLeftClick(tileX, tileY, isCtrlPressed);
            }
          } else if (event.button === 2) { // Right click
            this.handleRightClick(tileX, tileY, point.x, point.y);
          }
        });
        
        // Add hover effects

        tile.on('pointerover', () => {
          this.hoveredTile = { x: tileX, y: tileY };
          
          // If in wall build mode, provide visual feedback
          if (this.buildingManager.getBuildMode() === 'wall') {
            // Check if wall can be placed
            const canPlaceWall = this.gameMap.getTile(tileX, tileY)?.type !== TileType.TREE &&
                                 this.gameMap.getTile(tileX, tileY)?.type !== TileType.STONE &&
                                 this.gameMap.getTile(tileX, tileY)?.type !== TileType.WALL;
            
            // Visual indication based on placement possibility
            tile.tint = canPlaceWall ? 0x00FF00 : 0xFF0000; // Green if placeable, red if not
            
            // If build dragging, show preview
            if (this.buildDragging && this.buildStartTile) {
              this.showBuildPreview(this.buildStartTile, { x: tileX, y: tileY });
            }
          } else {
            tile.tint = 0xDDDDDD;
          }
        });
          
          tile.on('pointerout', () => {
            this.hoveredTile = { x: -1, y: -1 };
            tile.tint = 0xFFFFFF;
          });

        


      }
    }
    
    // Add click listeners to the object layer for foundation clicks
    this.objectLayer.interactive = true;
    this.objectLayer.on('pointerdown', this.handleObjectLayerClick.bind(this));
  }
  
  private handleDeleteKey(): void {
    // Find if any foundations are hovered
    const hoveredTile = this.hoveredTile;
    if (hoveredTile.x >= 0 && hoveredTile.y >= 0) {
      this.gameMap.deleteWallAtPosition(hoveredTile.x, hoveredTile.y);
    }
  }
  
  private showBuildPreview(startTile: GridPosition, endTile: GridPosition): void {
    // Clear existing preview
    this.clearBuildPreview();
    
    // Calculate line of tiles between start and end
    const tiles = this.calculateLineTiles(startTile, endTile);
    
    // Create preview for each tile
    tiles.forEach(tile => {
      // Check if tile is placeable (on a grass tile)
      const tileAtPosition = this.gameMap.getTile(tile.x, tile.y);
      const canPlaceWall = tileAtPosition && 
        (tileAtPosition.type === TileType.GRASS || 
         tileAtPosition.type === TileType.RUBBLE);
      
      if (canPlaceWall) {
        // Find the corresponding tile in the ground layer
        const groundTiles = this.gameMap.getGroundLayerTiles();
        const matchingTile = groundTiles.find(
          t => (t as any).tileX === tile.x && (t as any).tileY === tile.y
        );
        
        if (matchingTile) {
          // Highlight the existing tile
          matchingTile.tint = canPlaceWall ? 0x00FF00 : 0xFF0000;
          this.buildPreviewTiles.push(matchingTile);
        }
      }
    });
  }
  

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
  
  private clearBuildPreview(): void {
    // Restore original tint for all previously previewed tiles
    this.buildPreviewTiles.forEach(preview => {
      preview.tint = 0xFFFFFF;
    });
    
    // Clear the preview tiles array
    this.buildPreviewTiles = [];
  }
  
  private handleObjectLayerClick(event: PIXI.FederatedPointerEvent): void {
    // Only handle right clicks on objects
    if (event.button !== 2) return;
    
    // Get the target object
    const target = event.target;
    if (!target) return;
    
    // Check if it's a wall foundation
    const foundation = this.gameMap.findFoundationBySprite(target as PIXI.DisplayObject);
    if (foundation) {
      const selectedVillagers = this.villagerManager.getSelectedVillagers();
      if (selectedVillagers.length > 0) {
        this.buildingManager.assignVillagersToFoundation(selectedVillagers, foundation);
      }
    }
  }
  
  private onMouseDown(event: MouseEvent): void {
    // Only start selection on left mouse button
    if (event.button === 0) {
      // Check if we're in build mode with shift key
      if (this.buildingManager.getBuildMode() === 'wall' && this.shiftKeyHandler()) {
        const tilePos = this.getTileAtScreenPosition(event.clientX, event.clientY);
        if (tilePos.x >= 0 && tilePos.y >= 0) {
          // Start build dragging
          this.buildStartTile = tilePos;
          this.buildDragging = true;
          // Don't start selection box when in build mode
          return;
        }
      }
      
      // Clear any existing selection box
      this.selectionBox.clear();
      
      // Start normal selection process
      this.isSelecting = true;
      this.isDragging = false;
      this.selectionStartX = event.clientX;
      this.selectionStartY = event.clientY;
      this.selectionEndX = event.clientX;
      this.selectionEndY = event.clientY;
    }
  }
  
  private onMouseMove(event: MouseEvent): void {
    // Update build preview if in build drag mode
    if (this.buildDragging && this.buildStartTile && this.shiftKeyHandler()) {
      const currentTile = this.getTileAtScreenPosition(event.clientX, event.clientY);
      if (currentTile.x >= 0 && currentTile.y >= 0) {
        this.showBuildPreview(this.buildStartTile, currentTile);
      }
    }
    
    // Existing selection box logic
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
        this.updateSelectionBox();
      }
    }
  }
  
  private onMouseUp(event: MouseEvent): void {
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
            this.buildingManager.handleTileClick(tile.x, tile.y, true);
          });
        } else {
          // If shift was released, we already placed a single foundation in the keyup handler
          console.log("Shift not held at end of drag");
        }
      }
      
      // Clear build preview and reset state
      this.clearBuildPreview();
      
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
      this.selectionBox.clear();
    }
  } 

  
  private updateSelectionBox(): void {
    // Calculate the box dimensions
    const startX = Math.min(this.selectionStartX, this.selectionEndX);
    const startY = Math.min(this.selectionStartY, this.selectionEndY);
    const width = Math.abs(this.selectionEndX - this.selectionStartX);
    const height = Math.abs(this.selectionEndY - this.selectionStartY);
    
    // Draw selection box
    this.selectionBox.clear();
    this.selectionBox.lineStyle(2, 0x00FF00, 0.8);
    this.selectionBox.beginFill(0x00FF00, 0.1);
    this.selectionBox.drawRect(startX, startY, width, height);
    this.selectionBox.endFill();
  }
  
  
  private isCtrlKeyPressed(): boolean {
    return !!window.event && !!(window.event as KeyboardEvent).ctrlKey;
  }
  
  private getVillagerScreenPosition(villager: any): { x: number, y: number } {
    // Get sprite global position
    const bounds = villager.sprite.getBounds();
    
    return {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2
    };
  }
  


  
  private findVillagerAtPosition(x: number, y: number): any | null {
    const allVillagers = this.villagerManager.getAllVillagers();
    const tolerance = 0.5; // Allow some tolerance for clicking
    
    for (const villager of allVillagers) {
      const dx = Math.abs(villager.x - x);
      const dy = Math.abs(villager.y - y);
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < tolerance) {
        return villager;
      }
    }
    
    return null;
  }
  


  // Add the following improvements to the UIManager class

// Modify the handleLeftClick method in UIManager to use the enhanced villager selection logic
private handleLeftClick(x: number, y: number, isCtrlPressed: boolean = false, screenX?: number, screenY?: number): void {
  console.log(`Left click - Coordinates: x=${x}, y=${y}`);
  
  // Get the precise sub-tile position within the tile
  let preciseX = x, preciseY = y;
  
  // If we have screen coordinates, use them for more precision
  if (screenX !== undefined && screenY !== undefined) {
    const precisePos = this.isoUtils.getPrecisePositionFromScreen(screenX, screenY);
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
  
  // Check if there's a villager at this position (use the same tile-based check for selecting)
  const clickedVillager = this.findVillagerAtPosition(x, y);
  
  if (clickedVillager) {
    this.villagerManager.selectVillager(clickedVillager, isCtrlPressed);
  } else {
    // If no villager, deselect all (unless Ctrl is pressed)
    if (!isCtrlPressed) {
      this.villagerManager.clearSelection();
    }
  }
}

// Modify the handleRightClick method to pass precise coordinates
private handleRightClick(x: number, y: number, mouseX: number, mouseY: number): void {
  console.log(`Right click - Coordinates: x=${x}, y=${y}, Screen: (${mouseX}, ${mouseY})`);
  
  // Get the precise sub-tile position
  // Convert the screen coordinates to an exact isometric position
  const preciseIsoPosition = this.isoUtils.getPrecisePositionFromScreen(mouseX, mouseY);
  
  const selectedVillagers = this.villagerManager.getSelectedVillagers();
  
  // If we have villagers selected, right-click on ground moves them
  if (selectedVillagers.length > 0) {
    // First, cancel any build tasks for selected villagers
    selectedVillagers.forEach(villager => {
      if (villager.currentBuildTask) {
        // Find the foundation
        const foundation = this.gameMap.findFoundationAtPosition(
          villager.currentBuildTask?.foundation?.x ?? -1,
          villager.currentBuildTask?.foundation?.y ?? -1
        );
        
        if (foundation) {
          // Release the build position
          if (villager.currentBuildTask.buildPosition) {
            this.gameMap.wallManager?.releaseBuildPosition(
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
      // Move all selected villagers as a group to the precise position
      this.villagerManager.moveSelectedVillagersToPoint(
        preciseIsoPosition.x, 
        preciseIsoPosition.y
      );
    } else {
      // Check if there's a foundation at this position for build assignment
      const foundation = this.gameMap.findFoundationAtPosition(tileX, tileY);
      if (foundation && foundation.stateMachine.getCurrentState() == BuildingState.FOUNDATION) {
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
        this.villagerManager.moveSelectedVillagersToPoint(closestPoint.x, closestPoint.y);
      } else {
        // If still can't find a path, try the traditional approach
        const nearbyPos = this.gameMap.getAdjacentWalkableTile(tileX, tileY);
        if (nearbyPos) {
          this.villagerManager.moveSelectedVillagersToPoint(nearbyPos.x + 0.5, nearbyPos.y + 0.5);
        }
      }
    }
  } else {
    // If no villagers selected, open build menu
    this.buildingManager.showBuildMenu(mouseX, mouseY);
  }
}


// Enhance the selection box handling to use the improved villager selection
private handleSelectionBox(): void {
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
    this.villagerManager.clearSelection();
  }
  
  // Array to store selected villagers
  const selectedVillagers = [];
  
  // Check each villager to see if it's inside the selection box
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
      selectedVillagers.push(villager);
    }
  }
  
  // If any villagers were in the selection box, select them
  for (const villager of selectedVillagers) {
    // Use handleVillagerSelection instead of addToSelection
    this.villagerManager.handleVillagerSelection(villager, true);
  }
}


private getTileAtScreenPosition(screenX: number, screenY: number): GridPosition {
  const precisePos = this.isoUtils.getPrecisePositionFromScreen(screenX, screenY);
  
  // For tile-based operations, return the integer tile coordinates
  return {
    x: Math.floor(precisePos.x),
    y: Math.floor(precisePos.y)
  };
}


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

public setBuildTimeToggleHandler(callback: (enabled: boolean) => void): void {
  this.onBuildTimeToggle = callback;
}


}