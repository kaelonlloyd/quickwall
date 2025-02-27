import * as PIXI from 'pixi.js';
import { BuildingManager } from './Building';
import { GameMap } from './Map';
import { VillagerManager } from './Villager';
import { GridPosition } from '../types';

export class UIManager {
  private app: PIXI.Application;
  private groundLayer: PIXI.Container;
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
  
  // Shift key handler
  private shiftKeyHandler: () => boolean = () => false;
  
  constructor(
    app: PIXI.Application, 
    groundLayer: PIXI.Container, 
    gameMap: GameMap, 
    villagerManager: VillagerManager,
    buildingManager: BuildingManager
  ) {
    this.app = app;
    this.groundLayer = groundLayer;
    this.gameMap = gameMap;
    this.villagerManager = villagerManager;
    this.buildingManager = buildingManager;
    this.hoveredTile = { x: -1, y: -1 };
    
    // Create selection box
    this.selectionBox = new PIXI.Graphics();
    this.selectionBox.zIndex = 1000;
    this.app.stage.addChild(this.selectionBox);
    
    this.setupEventListeners();
  }
  
  // Method to set the shift key handler from outside
  public setShiftKeyHandler(handler: () => boolean): void {
    this.shiftKeyHandler = handler;
  }
  
  private setupEventListeners(): void {
    // Keyboard events
    document.addEventListener('keydown', (e) => {
      // ESC key to cancel build mode
      if (e.key === 'Escape') {
        this.buildingManager.setBuildMode(null);
      }
    });
    
    // Selection box events
    document.addEventListener('mousedown', this.onMouseDown.bind(this));
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    document.addEventListener('mouseup', this.onMouseUp.bind(this));
    

    document.addEventListener('contextmenu', (e) => {
      // Prevent context menu for all right-clicks with any modifier
      if (e.button === 2 || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) {
        e.preventDefault();
        return false;
      }
    });

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
            
            this.buildingManager.handleTileClick(tileX, tileY, isShiftDown);
            return;
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
            tile.tint = 0xAAAAAA; // Slightly grey to indicate potential build
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
    
    // Prevent right-click context menu
    this.app.view.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }
  
  private onMouseDown(event: MouseEvent): void {
    // Only start selection on left mouse button
    if (event.button === 0) {
      this.isSelecting = true;
      this.isDragging = false;
      this.selectionStartX = event.clientX;
      this.selectionStartY = event.clientY;
      this.selectionEndX = event.clientX;
      this.selectionEndY = event.clientY;
    }
  }
  
  private onMouseMove(event: MouseEvent): void {
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
      this.villagerManager.addToSelection(villager);
    }
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
  
  private handleLeftClick(x: number, y: number, isCtrlPressed: boolean = false): void {
    console.log(`Left click at grid coordinates: x=${x}, y=${y}, ctrl=${isCtrlPressed}`);
    
    // Validate coordinates
    if (isNaN(x) || isNaN(y) || x < 0 || x >= 20 || y < 0 || y >= 20) {
      console.error('Invalid grid coordinates', { x, y });
      return;
    }
    
    // Check if we're in build mode
    if (this.buildingManager.getBuildMode()) {
      this.buildingManager.handleTileClick(x, y);
      return;
    }
    
    // Check if there's a villager at this position
    const clickedVillager = this.findVillagerAtPosition(x, y);
    
    if (clickedVillager) {
      // If we clicked on a villager, select it
      this.villagerManager.selectVillager(clickedVillager, isCtrlPressed);
    } else if (!isCtrlPressed) {
      // If we clicked on empty space and not holding Ctrl, deselect all
      this.villagerManager.clearSelection();
    }
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
  
  private handleRightClick(x: number, y: number, mouseX: number, mouseY: number): void {
    console.log(`Right click at grid coordinates: x=${x}, y=${y}`);
    
    const selectedVillagers = this.villagerManager.getSelectedVillagers();
    
    // If we have villagers selected, right-click on ground moves them
    if (selectedVillagers.length > 0) {
      // Check if the tile is walkable
      if (this.gameMap.isTileWalkable(x, y)) {
        // Move all selected villagers as a group
        this.villagerManager.moveSelectedVillagersToPoint(x, y);
      } else {
        // If not walkable, try to find a nearby walkable tile
        const nearbyPos = this.gameMap.getAdjacentWalkableTile(x, y);
        if (nearbyPos) {
          this.villagerManager.moveSelectedVillagersToPoint(nearbyPos.x, nearbyPos.y);
        }
      }
    } else {
      // If no villagers selected, open build menu as before
      this.buildingManager.showBuildMenu(mouseX, mouseY);
    }
  }
}