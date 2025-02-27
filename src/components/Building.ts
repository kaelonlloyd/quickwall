import { BUILDING_COSTS } from '../constants';
import { GridPosition, Villager } from '../types';
import { GameMap } from './Map';
import { ResourceManager } from '../utils/ResourceManager';
import { VillagerManager } from './Villager';

export class BuildingManager {
  private gameMap: GameMap;
  private resourceManager: ResourceManager;
  private villagerManager: VillagerManager;
  private buildMode: string | null;
  private buildMenu: HTMLElement;
  
  constructor(gameMap: GameMap, resourceManager: ResourceManager, villagerManager: VillagerManager) {
    this.gameMap = gameMap;
    this.resourceManager = resourceManager;
    this.villagerManager = villagerManager;
    this.buildMode = null;
    this.buildMenu = document.getElementById('build-menu') as HTMLElement;
    
    this.setupEventListeners();
  }
  
  private setupEventListeners(): void {
    // Set up build menu button events
    const buildWallButton = document.getElementById('build-wall');
    if (buildWallButton) {
      buildWallButton.addEventListener('click', () => {
        this.setBuildMode('wall');
        this.hideBuildMenu();
      });
    }
    
    // Set up keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.key === 'b' || e.key === 'B') {
        // Build wall at current location if villagers are selected
        const selectedVillagers = this.villagerManager.getSelectedVillagers();
        if (selectedVillagers.length > 0) {
          // Get the first selected villager to build
          const villager = selectedVillagers[0];
          const x = Math.floor(villager.x);
          const y = Math.floor(villager.y);
          
          // Try to build wall in the direction villager is facing
          // For now, just build in front of the villager
          const targetX = x + 1;
          const targetY = y;
          
          this.buildWall(targetX, targetY);
        }
      }
    });
    
    // Hide build menu when clicking elsewhere
    document.addEventListener('click', (e) => {
      if (e.target !== this.buildMenu && 
          this.buildMenu && 
          !this.buildMenu.contains(e.target as Node)) {
        this.hideBuildMenu();
      }
    });
  }
  
  public getBuildMode(): string | null {
    return this.buildMode;
  }
  
  public setBuildMode(mode: string | null): void {
    this.buildMode = mode;
  }
  
  public getClosestVillager(x: number, y: number): Villager | null {
    const villagers = this.villagerManager.getSelectedVillagers();
    if (villagers.length === 0) return null;
    
    // Find the closest villager to the target position
    let closestVillager = villagers[0];
    let closestDistance = this.getDistance(closestVillager.x, closestVillager.y, x, y);
    
    for (let i = 1; i < villagers.length; i++) {
      const villager = villagers[i];
      const distance = this.getDistance(villager.x, villager.y, x, y);
      
      if (distance < closestDistance) {
        closestVillager = villager;
        closestDistance = distance;
      }
    }
    
    return closestVillager;
  }
  
  private getDistance(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  public showBuildMenu(x: number, y: number): void {
    if (!this.buildMenu) return;
    
    // Position menu near the mouse
    const menuX = Math.min(window.innerWidth - 150, x);
    const menuY = Math.min(window.innerHeight - 100, y);
    
    this.buildMenu.style.left = menuX + 'px';
    this.buildMenu.style.top = menuY + 'px';
    this.buildMenu.style.display = 'block';
  }
  
  public hideBuildMenu(): void {
    if (this.buildMenu) {
      this.buildMenu.style.display = 'none';
    }
  }
  
  public buildAtLocation(type: string, x: number, y: number): boolean {
    // Handle building based on type
    if (type === 'wall') {
      return this.buildWall(x, y);
    }
    
    console.warn(`Unknown building type: ${type}`);
    return false;
  }
  
  public buildWall(x: number, y: number): boolean {
    // Check resources
    if (!this.resourceManager.hasEnoughResources(BUILDING_COSTS.wall)) {
      return false;
    }
    
    // Try to place the wall
    if (this.gameMap.addWall(x, y)) {
      // Deduct resources on success
      this.resourceManager.deductResources(BUILDING_COSTS.wall);
      return true;
    }
    
    return false;
  }
  
  public handleTileClick(x: number, y: number): void {
    // If we're in build mode, try to build at the location
    if (this.buildMode !== null) {
      // Make a copy of the current build mode as a string
      const buildModeType: string = this.buildMode;
      
      // Find the closest villager to the target position
      const closestVillager = this.getClosestVillager(x, y);
      
      if (closestVillager) {
        if (this.villagerManager.isAdjacentToVillager(closestVillager, x, y)) {
          this.buildAtLocation(buildModeType, x, y);
        } else {
          // Move the closest villager near the target first
          this.villagerManager.moveVillagerNear(closestVillager, x, y, () => {
            this.buildAtLocation(buildModeType, x, y);
          });
        }
        
        // Clear build mode after building attempt
        this.buildMode = null;
      }
    }
  }
}