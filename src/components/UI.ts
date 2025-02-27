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
    
    this.setupEventListeners();
  }
  
  private setupEventListeners(): void {
    // Set up interactive events on ground tiles
    for (let i = 0; i < this.groundLayer.children.length; i++) {
      const tile = this.groundLayer.children[i] as PIXI.Graphics;
      
      // Get tile grid coordinates
      const tileX = (tile as any).tileX;
      const tileY = (tile as any).tileY;
      
      if (tileX !== undefined && tileY !== undefined) {
        // Add pointerdown event
        tile.on('pointerdown', (event) => {
          // Check if left or right click
          const point = event.data.global;
          
          console.log('Click event:', {
            globalX: point.x, 
            globalY: point.y,
            tileX: tileX, 
            tileY: tileY
          });

          if (event.data.button === 0) { // Left click
            this.handleLeftClick(tileX, tileY);
          } else if (event.data.button === 2) { // Right click
            this.handleRightClick(tileX, tileY, point.x, point.y);
          }
        });
        
        // Add hover effects
        tile.on('pointerover', () => {
          this.hoveredTile = { x: tileX, y: tileY };
          tile.tint = 0xDDDDDD;
        });
        
        tile.on('pointerout', () => {
          this.hoveredTile = { x: -1, y: -1 };
          tile.tint = 0xFFFFFF;
        });
      }
    }
    
    // Global click event as a fallback
    this.app.stage.on('pointerdown', (event) => {
      const point = event.data.global;
      
      try {
        // Use IsometricUtils to convert screen coordinates
        const worldX = this.app.stage.x || 0;
        const worldY = this.app.stage.y || 0;
        
        const gridPos = this.villagerManager.getIsoUtils().toIso(point.x - worldX, point.y - worldY);
        
        console.log('Global click converted to grid:', gridPos);
        
        if (gridPos.x !== undefined && gridPos.y !== undefined) {
          if (event.data.button === 0) { // Left click
            this.handleLeftClick(gridPos.x, gridPos.y);
          } else if (event.data.button === 2) { // Right click
            this.handleRightClick(gridPos.x, gridPos.y, point.x, point.y);
          }
        }
      } catch (error) {
        console.error('Error converting coordinates:', error);
      }
    });
    
    // Prevent right-click context menu
    this.app.view.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }
  
  private handleLeftClick(x: number, y: number): void {
    console.log(`Left click at grid coordinates: x=${x}, y=${y}`);
    
    // Validate coordinates
    if (isNaN(x) || isNaN(y) || x < 0 || x >= 20 || y < 0 || y >= 20) {
      console.error('Invalid grid coordinates', { x, y });
      return;
    }
    
    const selectedVillager = this.villagerManager.getSelectedVillager();
    
    // Check if we're in build mode
    if (this.buildingManager.getBuildMode()) {
      this.buildingManager.handleTileClick(x, y);
      return;
    }
    
    // If we have a selected villager, set it as a move target
    if (selectedVillager) {
      // Ensure tile is walkable
      const isWalkable = this.gameMap.isTileWalkable(x, y);
      console.log(`Tile walkability check: x=${x}, y=${y}, walkable=${isWalkable}`);
      
      if (isWalkable) {
        this.villagerManager.moveVillager(selectedVillager, x, y);
      } else {
        console.warn(`Cannot move to non-walkable tile: x=${x}, y=${y}`);
      }
    }
  }
  
  private handleRightClick(x: number, y: number, mouseX: number, mouseY: number): void {
    console.log(`Right click at grid coordinates: x=${x}, y=${y}`);
    
    // Open build menu if a villager is selected
    if (this.villagerManager.getSelectedVillager()) {
      this.buildingManager.showBuildMenu(mouseX, mouseY);
    }
  }
}