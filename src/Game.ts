import * as PIXI from 'pixi.js';
import { COLORS, MAP_HEIGHT, MAP_WIDTH } from './constants';
import { Resources } from './types';
import { IsometricUtils } from './utils/IsometricUtils';
import { ResourceManager } from './utils/ResourceManager';
import { GameMap } from './components/Map';
import { VillagerManager } from './components/Villager';
import { BuildingManager } from './components/Building';
import { UIManager } from './components/UI';
import { WallManager } from './components/WallManager';

export class Game {
  private app!: PIXI.Application;
  private worldContainer!: PIXI.Container;
  private groundLayer!: PIXI.Container;
  private objectLayer!: PIXI.Container;
  private unitLayer!: PIXI.Container;
  private uiLayer!: PIXI.Container;
  
  private isoUtils!: IsometricUtils;
  private resourceManager!: ResourceManager;
  private gameMap!: GameMap;
  private villagerManager!: VillagerManager;
  private buildingManager!: BuildingManager;
  private uiManager!: UIManager;
  public wallManager!: WallManager;
  
  private showBuildTimes: boolean = false;
  
  constructor() {
    // Create PixiJS Application
    this.app = new PIXI.Application();
    
    // Initialize the application asynchronously
    this.initializeApp().catch(console.error);
  }

  
  // Update the Game class constructor and initialization to fix dependency issues

// Replace the initialization code in initializeApp method
private async initializeApp(): Promise<void> {
  // Initialize with options
  await this.app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: COLORS.SKY,
    resolution: window.devicePixelRatio || 1,
    antialias: true
  });
  
  // Ensure renderer exists
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
  
  // Set up sortable children for proper depth ordering
  this.worldContainer.sortableChildren = true;
  this.groundLayer.sortableChildren = true;
  this.objectLayer.sortableChildren = true;
  this.unitLayer.sortableChildren = true;
  this.uiLayer.sortableChildren = true;
  
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
  
  // Fix initialization order to resolve circular dependencies
  
  // First, create the villager manager with a temporary game map parameter
  this.villagerManager = new VillagerManager(this.unitLayer, this.isoUtils, null as any); // Will be set later
  
  // Add necessary method for villager manager to set the game map later
  // (Make sure to add this method to VillagerManager class)
  // this.villagerManager.setGameMap = function(gameMap) { this.gameMap = gameMap; };
  

    // Create the wall manager FIRST
    this.wallManager = new WallManager(
      this.objectLayer,
      this.isoUtils,
      // Use safer callbacks with null checks
      (x, y) => this.gameMap ? this.gameMap.getVillagersOnTile(x, y) : [],
      (foundation) => this.gameMap ? this.gameMap.handleVillagersOnFoundation(foundation) : undefined,
      (villager) => this.villagerManager ? this.villagerManager.forceVillagerMove(villager) : false
    );
    
    // Then create the game map with the wall manager
    this.gameMap = new GameMap(
      this.groundLayer,
      this.objectLayer,
      this.isoUtils
    );
    
    // Now, explicitly set the wall manager in the game map
    this.gameMap.setWallManager(this.wallManager);
    
    // Now, initialize the VillagerManager with the game map
    this.villagerManager = new VillagerManager(this.unitLayer, this.isoUtils, this.gameMap);
    
    // Make sure the GameMap knows about the VillagerManager as well
    this.gameMap.setVillagerManager(this.villagerManager);
    
  // Now update the villager manager with the game map reference
  if (typeof this.villagerManager.setGameMap === 'function') {
    this.villagerManager.setGameMap(this.gameMap);
  }
  
  // Create the building manager
  this.buildingManager = new BuildingManager(this.gameMap, this.resourceManager, this.villagerManager);
  
  // Create the UI manager
  this.uiManager = new UIManager(
    this.app, 
    this.groundLayer,
    this.objectLayer,
    this.gameMap, 
    this.villagerManager, 
    this.buildingManager,
    this.isoUtils
  );

   // Set up the build time toggle handler
  this.uiManager.setBuildTimeToggleHandler((enabled) => {
    this.showBuildTimes = enabled;
  });
  
  // Set up game loop
  this.app.ticker.add(this.gameLoop.bind(this));
  
  // Handle window resize
  window.addEventListener('resize', this.onResize.bind(this));
  
  // Initialize game state
  this.initGame();
  
  // Setup event listeners for keyboard controls
  this.setupEventListeners();
  
  // Setup context menu prevention
  this.setupContextMenuPrevention();
}
  
  private setupContextMenuPrevention(): void {
    // Simple, focused approach
    document.oncontextmenu = () => false;
    this.app.canvas.oncontextmenu = () => false;
  }
  

  public toggleBuildTimeDisplay(): void {
    this.showBuildTimes = !this.showBuildTimes;
    console.log(`Build time display: ${this.showBuildTimes ? 'ON' : 'OFF'}`);
  }

  private initGame(): void {
    console.log("Game initialization started");
    
    // Create initial villagers at nearby positions
    const startX = Math.floor(MAP_WIDTH / 2);
    const startY = Math.floor(MAP_HEIGHT / 2);
    console.log("Creating villagers at center area");
    
    // Create the initial villager
    const villager1 = this.villagerManager.createVillager(startX, startY);
    this.villagerManager.selectVillager(villager1);
    
    // Create a few more villagers nearby
    this.villagerManager.createVillager(startX - 1, startY);
    this.villagerManager.createVillager(startX + 1, startY);
    this.villagerManager.createVillager(startX, startY - 1);
    
    // Force position update for all containers
    if (this.app.renderer) {
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
    
    // Create selection count display
    const selectionCountElement = document.createElement('div');
    selectionCountElement.id = 'villager-selection-count';
    selectionCountElement.textContent = 'Villagers: 1';
    selectionCountElement.style.position = 'absolute';
    selectionCountElement.style.bottom = '10px';
    selectionCountElement.style.left = '10px';
    selectionCountElement.style.color = 'white';
    selectionCountElement.style.fontSize = '16px';
    selectionCountElement.style.fontFamily = 'Arial';
    selectionCountElement.style.textShadow = '1px 1px 1px black';
    selectionCountElement.style.padding = '5px';
    selectionCountElement.style.zIndex = '1000';
    selectionCountElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    selectionCountElement.style.borderRadius = '3px';
    document.body.appendChild(selectionCountElement);
    
    console.log("Game initialization completed");
  }

  private onResize(): void {
    if (this.app.renderer) {
      this.app.renderer.resize(window.innerWidth, window.innerHeight);
      this.worldContainer.x = this.app.screen.width / 2;
      this.worldContainer.y = this.app.screen.height / 4;
      this.isoUtils.updateWorldPosition(this.worldContainer.x, this.worldContainer.y);
      
      // Update selection count display position
      const selectionCountElement = document.getElementById('villager-selection-count');
      if (selectionCountElement) {
        selectionCountElement.style.bottom = '10px';
        selectionCountElement.style.left = '10px';
      }
    }
  }


  private gameLoop(ticker: PIXI.Ticker): void {
    // Calculate delta time for consistent updates
    const delta = ticker.deltaTime;
    
    // Update villagers' movement and states
    this.villagerManager.updateVillagers(delta);
    
    // Update wall foundation building with improved duration formula
 if (this.wallManager) {
      this.wallManager.updateFoundationBuilding(delta);
      
      // Update build time displays if enabled
      if (this.showBuildTimes) {
        this.wallManager.updateAllBuildTimeDisplays();
      }
    
    // Update building manager state
    if (this.buildingManager) {
      this.buildingManager.updateFoundationBuilding(delta);
    }
    
    // Sort for proper depth
    this.sortContainersForDepth();
  }
}

private sortContainersForDepth(): void {
  // Sort object layer by y-position (depth)
  for (let i = 0; i < this.objectLayer.children.length; i++) {
    const child = this.objectLayer.children[i];
    if ((child as any).tileY !== undefined) {
      child.zIndex = (child as any).tileY * 10;
    }
  }
  
  // Sort unit layer by y-position (depth)
  for (let i = 0; i < this.unitLayer.children.length; i++) {
    const unit = this.unitLayer.children[i];
    // Get the villager data for this sprite
    const villager = this.villagerManager.getAllVillagers().find(v => v.sprite === unit);
    if (villager) {
      unit.zIndex = villager.y * 10;
    }
  }
  
  // Sort the layers
  if (this.groundLayer.sortableChildren) this.groundLayer.sortChildren();
  if (this.objectLayer.sortableChildren) this.objectLayer.sortChildren();
  if (this.unitLayer.sortableChildren) this.unitLayer.sortChildren();
}
  



  // Update UI event listeners to pass shift key state
  private setupEventListeners(): void {
    // Keyboard event to track shift key
    let isShiftDown = false;
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Shift') {
        isShiftDown = true;
      }
    });
    
    window.addEventListener('keyup', (e) => {
      if (e.key === 'Shift') {
        isShiftDown = false;
      }
    });
    
    // Modify tile click handling in UI to pass shift key state
    this.uiManager.setShiftKeyHandler(() => isShiftDown);
  }
}