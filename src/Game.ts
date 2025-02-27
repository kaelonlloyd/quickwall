import * as PIXI from 'pixi.js';
import { COLORS, MAP_HEIGHT, MAP_WIDTH } from './constants';
import { Resources } from './types';
import { IsometricUtils } from './utils/IsometricUtils';
import { ResourceManager } from './utils/ResourceManager';
import { GameMap } from './components/Map';
import { VillagerManager } from './components/Villager';
import { BuildingManager } from './components/Building';
import { UIManager } from './components/UI';

export class Game {
  private app: PIXI.Application;
  private worldContainer: PIXI.Container;
  private groundLayer: PIXI.Container;
  private objectLayer: PIXI.Container;
  private unitLayer: PIXI.Container;
  private uiLayer: PIXI.Container;
  
  private isoUtils: IsometricUtils;
  private resourceManager: ResourceManager;
  private gameMap: GameMap;
  private villagerManager: VillagerManager;
  private buildingManager: BuildingManager;
  private uiManager: UIManager;
  
  constructor() {
    // Create PixiJS Application with explicit renderer
    this.app = new PIXI.Application({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: COLORS.SKY,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      antialias: true
    });
    
    // Make sure the renderer exists
    if (!this.app.renderer) {
      console.error("Failed to initialize PIXI renderer");
      throw new Error("Failed to initialize PIXI renderer");
    }
    
    // Add the canvas to the DOM and set its style
    const canvas = this.app.canvas as HTMLCanvasElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    document.body.appendChild(canvas);
    
    // Create layers for proper rendering order
    this.worldContainer = new PIXI.Container();
    this.groundLayer = new PIXI.Container();
    this.objectLayer = new PIXI.Container();
    this.unitLayer = new PIXI.Container();
    this.uiLayer = new PIXI.Container();
    
    // Set up layer hierarchy
    this.worldContainer.addChild(this.groundLayer);
    this.worldContainer.addChild(this.objectLayer);
    this.worldContainer.addChild(this.unitLayer);
    this.worldContainer.addChild(this.uiLayer);
    this.app.stage.addChild(this.worldContainer);
    
    // Center the world container
    this.worldContainer.x = this.app.screen.width / 2;
    this.worldContainer.y = this.app.screen.height / 4;
    
    // Initialize utilities and managers
    this.isoUtils = new IsometricUtils(this.worldContainer.x, this.worldContainer.y);
    
    // Initial resources
    const initialResources: Resources = {
      wood: 100,
      stone: 50
    };
    
    this.resourceManager = new ResourceManager(initialResources);
    
    // Initialize game components
    this.gameMap = new GameMap(this.groundLayer, this.objectLayer, this.isoUtils);
    this.villagerManager = new VillagerManager(this.unitLayer, this.isoUtils, this.gameMap);
    this.buildingManager = new BuildingManager(this.gameMap, this.resourceManager, this.villagerManager);
    this.uiManager = new UIManager(
      this.app, 
      this.groundLayer, 
      this.gameMap, 
      this.villagerManager, 
      this.buildingManager
    );
    
    // Set up game loop
    this.app.ticker.add(this.gameLoop.bind(this));
    
    // Handle window resize
    window.addEventListener('resize', this.onResize.bind(this));
    
    // Initialize game state
    this.init();
  }
  
  private init(): void {
    console.log("Game initialization started");
    
    // Create initial villager at center of map
    const startX = Math.floor(MAP_WIDTH / 2);
    const startY = Math.floor(MAP_HEIGHT / 2);
    console.log("Creating villager at:", startX, startY);
    
    const villager = this.villagerManager.createVillager(startX, startY);
    this.villagerManager.selectVillager(villager);
    
    // Force position update for all containers - with null check
    if (this.app && this.app.renderer) {
      this.app.renderer.render(this.app.stage);
    }
    
    // Set initial camera position to focus on the villager
    this.worldContainer.x = this.app.screen.width / 2;
    this.worldContainer.y = this.app.screen.height / 4;
    this.isoUtils.updateWorldPosition(this.worldContainer.x, this.worldContainer.y);
    
    console.log("World container position:", this.worldContainer.x, this.worldContainer.y);
    
    // Periodically add some resources (simulating gathering)
    setInterval(() => {
      this.resourceManager.addResources(1, 1);
    }, 3000);
    
    console.log("Game initialization completed");
  }
  
  private gameLoop(delta: number): void {
    // Update villagers
    this.villagerManager.updateVillagers(delta);
  }
  
  private onResize(): void {
    this.app.renderer.resize(window.innerWidth, window.innerHeight);
    this.worldContainer.x = this.app.screen.width / 2;
    this.worldContainer.y = this.app.screen.height / 4;
    this.isoUtils.updateWorldPosition(this.worldContainer.x, this.worldContainer.y);
  }
}