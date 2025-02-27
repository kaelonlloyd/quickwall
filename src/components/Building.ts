import { BUILDING_COSTS } from '../constants';
import { Villager, BuildTask, WallFoundationData } from '../types';
import { GameMap } from './Map';
import { ResourceManager } from '../utils/ResourceManager';
import { VillagerManager } from './Villager';
import { WallFoundation } from './WallManager';

export class BuildingManager {
  private gameMap: GameMap;
  private resourceManager: ResourceManager;
  private villagerManager: VillagerManager;
  private buildMode: 'wall' | 'walk' | null = 'walk';
  private buildMenu: HTMLElement;
  private modeIndicator: HTMLElement;
  
  constructor(gameMap: GameMap, resourceManager: ResourceManager, villagerManager: VillagerManager) {
    this.gameMap = gameMap;
    this.resourceManager = resourceManager;
    this.villagerManager = villagerManager;
    this.buildMenu = document.getElementById('build-menu') as HTMLElement;
    
    // Create mode indicator
    this.modeIndicator = document.createElement('div');
    this.modeIndicator.id = 'mode-indicator';
    this.modeIndicator.style.position = 'fixed';
    this.modeIndicator.style.top = '10px';
    this.modeIndicator.style.right = '10px';
    this.modeIndicator.style.backgroundColor = 'rgba(0,0,0,0.5)';
    this.modeIndicator.style.color = 'white';
    this.modeIndicator.style.padding = '5px 10px';
    this.modeIndicator.style.borderRadius = '3px';
    this.modeIndicator.textContent = 'Mode: Walk';
    document.body.appendChild(this.modeIndicator);
    
    this.setupEventListeners();
  }
  
  private setupEventListeners(): void {
    // Wall building mode toggle
    const buildWallButton = document.getElementById('build-wall');
    if (buildWallButton) {
      buildWallButton.addEventListener('click', () => {
        const selectedVillagers = this.villagerManager.getSelectedVillagers();
        if (selectedVillagers.length > 0) {
          this.setBuildMode('wall');
        }
      });
    }
    
    // Keyboard shortcut
    window.addEventListener('keydown', (e) => {
      // Trigger wall build mode with 'b' or 'B'
      if (e.key === 'b' || e.key === 'B') {
        const selectedVillagers = this.villagerManager.getSelectedVillagers();
        if (selectedVillagers.length > 0) {
          this.setBuildMode('wall');
        }
      }
      
      // Reset to walk mode with 'Escape'
      if (e.key === 'Escape') {
        this.setBuildMode(null);
      }
    });
  }
  
  public setBuildMode(mode: 'wall' | null): void {
    // If mode is null, default to walk mode
    this.buildMode = mode === 'wall' ? 'wall' : 'walk';
    
    // Update mode indicator
    if (this.modeIndicator) {
      this.modeIndicator.textContent = mode === 'wall' ? 'Mode: Build Wall' : 'Mode: Walk';
      this.modeIndicator.style.backgroundColor = mode === 'wall' 
        ? 'rgba(255,165,0,0.7)' // Orange for build mode
        : 'rgba(0,0,0,0.5)';   // Default for walk mode
    }
    
    // Update build wall button style
    const buildWallButton = document.getElementById('build-wall');
    if (buildWallButton) {
      buildWallButton.classList.toggle('active', mode === 'wall');
    }
    
    // If switching to walk mode, clear any build state
    if (mode !== 'wall') {
      // Reset any pending build mode visuals
      const tiles = this.gameMap.getGroundLayerTiles();
      tiles.forEach(tile => {
        tile.tint = 0xFFFFFF;
      });
    }
  }
  
  public getBuildMode(): 'wall' | 'walk' | null {
    return this.buildMode;
  }
  
  private assignVillagersToFoundation(villagers: Villager[], foundation: WallFoundation): void {
    villagers.forEach(villager => {
      // Convert WallFoundation to WallFoundationData
      const foundationData: WallFoundationData = {
        x: foundation.x,
        y: foundation.y,
        health: foundation.health,
        maxHealth: foundation.maxHealth,
        assignedVillagers: foundation.assignedVillagers,
        isBuilding: foundation.isBuilding,
        buildProgress: foundation.buildProgress,
        status: foundation.status
      };

      // Move villager near the foundation
      this.villagerManager.moveVillagerNear(villager, foundation.x, foundation.y, () => {
        // Once near, assign build task
        const buildTask: BuildTask = {
          type: 'wall',
          foundation: foundationData
        };
        
        villager.currentBuildTask = buildTask;
        
        // Add villager to foundation's assigned villagers
        foundation.assignedVillagers.push(villager);
      });
    });
  }
  
  public handleTileClick(x: number, y: number, isShiftDown: boolean = false): void {
    // Ensure we're in wall build mode and have selected villagers
    if (this.buildMode !== 'wall') return;
    
    const selectedVillagers = this.villagerManager.getSelectedVillagers();
    if (selectedVillagers.length === 0) return;
    
    // Check resources
    if (!this.resourceManager.hasEnoughResources(BUILDING_COSTS.wall)) {
      console.warn('Not enough resources to build wall');
      return;
    }
    
    // Place wall foundation
    const foundation = this.gameMap.addWallFoundation(x, y);
    if (!foundation) return;
    
    // Deduct resources
    this.resourceManager.deductResources(BUILDING_COSTS.wall);
    
    // Assign selected villagers to build
    this.assignVillagersToFoundation(selectedVillagers, foundation);
    
    // Reset build mode if not holding shift
    if (!isShiftDown) {
      this.setBuildMode(null);
    }
  }
  
  public updateFoundationBuilding(delta: number): void {
    this.gameMap.updateFoundationBuilding(delta);
  }
  
  public showBuildMenu(x: number, y: number): void {
    if (!this.buildMenu) return;
    
    // Check if there are selected villagers
    const selectedVillagers = this.villagerManager.getSelectedVillagers();
    if (selectedVillagers.length === 0) return;
    
    // Position menu near the mouse
    const menuX = Math.min(window.innerWidth - 200, x);
    const menuY = Math.min(window.innerHeight - 150, y);
    
    this.buildMenu.style.left = menuX + 'px';
    this.buildMenu.style.top = menuY + 'px';
    this.buildMenu.style.display = 'block';
  }
}