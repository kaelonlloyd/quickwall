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
          if (event.data.button === 0) { // Left click
            this.handleLeftClick(tileX, tileY);
          } else if (event.data.button === 2) { // Right click
            this.handleRightClick(tileX, tileY, event.data.global.x, event.data.global.y);
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
    
    // Prevent right-click context menu
    this.app.view.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }
  
  private handleLeftClick(x: number, y: number): void {
    const selectedVillager = this.villagerManager.getSelectedVillager();
    
    // Check if we're in build mode
    if (this.buildingManager.getBuildMode()) {
      this.buildingManager.handleTileClick(x, y);
      return;
    }
    
    // If we have a selected villager, set it as a move target
    if (selectedVillager && this.gameMap.isTileWalkable(x, y)) {
      this.villagerManager.moveVillager(selectedVillager, x, y);
    }
  }
  
  private handleRightClick(x: number, y: number, mouseX: number, mouseY: number): void {
    // Open build menu if a villager is selected
    if (this.villagerManager.getSelectedVillager()) {
      this.buildingManager.showBuildMenu(mouseX, mouseY);
    }
  }
}
