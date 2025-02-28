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
  private wallManager!: WallManager;
  
  
  constructor() {
    // Create PixiJS Application
    this.app = new PIXI.Application();
    
    // Initialize the application asynchronously
    this.initializeApp().catch(console.error);

    
  }


  private async initializeApp(): Promise<void> {

      // Then add this to your initializeApp method in Game.ts

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
    

    this.villagerManager = new VillagerManager(this.unitLayer, this.isoUtils, this.gameMap);

    this.wallManager = new WallManager(
      this.objectLayer, 
      this.isoUtils, 
      (x, y) => this.gameMap.getVillagersOnTile(x, y),
      (foundation) => this.gameMap.handleVillagersOnFoundation(foundation)
    );
    

    this.gameMap = new GameMap(
      this.groundLayer, 
      this.objectLayer, 
      this.isoUtils, 
      this.villagerManager,
      this.wallManager
    );


    
    this.buildingManager = new BuildingManager(this.gameMap, this.resourceManager, this.villagerManager);
    this.uiManager = new UIManager(
      this.app, 
      this.groundLayer,
      this.objectLayer,
      this.gameMap, 
      this.villagerManager, 
      this.buildingManager
    );
    
    // Set up game loop
    this.app.ticker.add(this.gameLoop.bind(this));
    
    // Handle window resize
    window.addEventListener('resize', this.onResize.bind(this));
    
    // Initialize game state
    this.initGame();
    
    // Setup event listeners for keyboard controls
    this.setupEventListeners();

      // Call this in your initializeApp method:
  this.setupContextMenuPrevention();
  
  }
  

  private setupContextMenuPrevention(): void {
    // Simple, focused approach
    document.oncontextmenu = () => false;
    this.app.canvas.oncontextmenu = () => false;
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
    // Update villagers' movement
    this.villagerManager.updateVillagers(ticker.deltaTime);
    
    // Update wall foundation building
    this.buildingManager.updateFoundationBuilding(ticker.deltaTime);
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