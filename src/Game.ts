// src/Game.ts - Fully decoupled rendering from game logic
import * as PIXI from 'pixi.js';
import { COLORS, MAP_HEIGHT, MAP_WIDTH } from './constants';
import { Resources } from './types';
import { RenderingSystem } from './rendering/RenderingSystem';
import { CoordinateTransformer, RenderingMode } from './utils/CoordinateTransformer';
import { ResourceManager } from './utils/ResourceManager';
import { GameMap } from './components/Map';
import { VillagerManager } from './components/Villager';
import { BuildingManager } from './components/Building';
import { WallManager } from './components/WallManager';
import { PathVisualizer } from './utils/PathVisualizer';
import { RenderingToggle } from './components/RenderingToggle';
import { DynamicPathfinder } from './utils/DynamicPathfinder';
import { IsometricUtils } from './utils/IsometricUtils';
import { CollisionDetector } from './utils/CollisionDetector';

export class Game {
  private app!: PIXI.Application;
  private worldContainer!: PIXI.Container;


  
  // Rendering system
  private renderingSystem!: RenderingSystem;
  
  // Game components (pure logic)
  private resourceManager!: ResourceManager;
  private gameMap!: GameMap;
  private villagerManager!: VillagerManager;
  private buildingManager!: BuildingManager;
  private wallManager!: WallManager;
  
  // Utilities
  private isoUtils!: IsometricUtils;
  private dynamicPathfinder!: DynamicPathfinder;
  private collisionDetector!: CollisionDetector;
  
  // UI components
  private renderingToggle!: RenderingToggle;
  private pathVisualizer!: PathVisualizer;
  
  // Game state
  private showBuildTimes: boolean = false;
  private isShiftKeyDown: boolean = false;
  
  constructor() {
    // Create PixiJS Application
    this.app = new PIXI.Application();
    
    // Initialize the application asynchronously
    this.initializeApp().catch(console.error);
  }

  // Initialize the application with fully decoupled rendering
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
    
    // Create world container
    this.worldContainer = new PIXI.Container();
    this.app.stage.addChild(this.worldContainer);
    
    // Center the world container
    this.worldContainer.x = this.app.screen.width / 2;
    this.worldContainer.y = this.app.screen.height / 4;
    

    // Create isometric utilities
    this.isoUtils = new IsometricUtils(this.worldContainer.x, this.worldContainer.y);
    
    // Initialize the rendering system
    this.renderingSystem = new RenderingSystem(this.worldContainer, RenderingMode.ISOMETRIC);
    

    // Initialize game components (pure logic)
    await this.initializeGameComponents(this.renderingSystem.getTransformer());


    // Initialize path visualizer for debugging
    this.pathVisualizer = new PathVisualizer(
      this.worldContainer, 
      this.renderingSystem.getTransformer()
    );
    

    // Initialize collision detector
    this.collisionDetector = new CollisionDetector(
      this.gameMap,
      this.isoUtils,
      this.renderingSystem.getLayers().uiLayer
    );
    
    // Set up dynamic pathfinder
    this.dynamicPathfinder = new DynamicPathfinder(this.gameMap, this.pathVisualizer);
    this.villagerManager.setPathfinder(this.dynamicPathfinder);
    
    // Set up UI components
    this.setupUI();
    
    // Set up event handlers
    this.setupEventHandlers();
    
    // Set up game loop
    this.app.ticker.add(this.gameLoop.bind(this));
    
    // Handle window resize
    window.addEventListener('resize', this.onResize.bind(this));
    
    // Initialize game state
    this.initGameState();
    
    // Do the initial rendering of the game state
    this.renderingSystem.renderGameState(this.gameMap, this.villagerManager, this.wallManager);
    
    console.log("Game fully initialized with decoupled rendering");
  }

  /**
   * Initialize the core game components (pure logic, no rendering)
   */
  private async initializeGameComponents(transformer: CoordinateTransformer): Promise<void> {
    // Create the game components in the correct order with proper dependencies
    
    // 1. Initial resources
    const initialResources: Resources = {
      wood: 100,
      stone: 50
    };
    this.resourceManager = new ResourceManager(initialResources);
    
    // 2. Create the wall manager (pure logic)
    this.wallManager = new WallManager();
    
    // 3. Create the game map (pure logic)
    this.gameMap = new GameMap();
    
    // 4. Set dependencies on the game map
    this.gameMap.setWallManager(this.wallManager);
    
    // 5. Create the villager manager (pure logic)
    this.villagerManager = new VillagerManager(this.gameMap);
    
    // 6. Set the villager manager in the game map
    this.gameMap.setVillagerManager(this.villagerManager);
    
    // 7. Create the building manager
    this.buildingManager = new BuildingManager(
      this.gameMap, 
      this.resourceManager, 
      this.villagerManager
    );
    
    // Initialize the map
    this.gameMap.initMap();
    
    console.log("Game components initialized");
  }
  
  /**
   * Set up UI components
   */
  private setupUI(): void {
    // Initialize the rendering toggle
    this.renderingToggle = new RenderingToggle(
      this.renderingSystem.getTransformer(),
      this.handleRenderingModeChange.bind(this)
    );
    this.renderingToggle.addShortcutToInstructions();
    
    // Set up UI handlers for build time toggle
    this.renderingSystem.getWallRenderer().setShowBuildTimes(this.showBuildTimes);
    
    // Create selection count display
    this.createSelectionCountDisplay();
  }

  /**
   * Set up event handlers for user interaction
   */
  private setupEventHandlers(): void {
    // Track keyboard state
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Shift') {
        this.isShiftKeyDown = true;
      }
      
      // Toggle collision detection visualization with C key
      if (e.key === 'c' || e.key === 'C') {
        this.collisionDetector.setEnabled(!this.collisionDetector.getIsEnabled);
      }
      
      // Toggle path visualization with P key
      if (e.key === 'p' || e.key === 'P') {
        this.pathVisualizer.setDebugEnabled(!this.pathVisualizer.isDebugEnabled());
      }
    });
    
    document.addEventListener('keyup', (e) => {
      if (e.key === 'Shift') {
        this.isShiftKeyDown = false;
      }
    });
    
    // Provide the shift key state to the UI manager
    const uiManager = this.renderingSystem.getUIManager();
    if (uiManager) {
      uiManager.setShiftKeyHandler(() => this.isShiftKeyDown);
      
      // Set up build time toggle handler
      uiManager.setBuildTimeToggleHandler((enabled) => {
        this.showBuildTimes = enabled;
        this.renderingSystem.getWallRenderer().setShowBuildTimes(enabled);
      });
    }
    
    // Set up click handling for various game elements
    this.setupClickHandlers();
  }
  
  /**
   * Set up click handlers for game elements
   */
  private setupClickHandlers(): void {
    // Get renderers
    const tileRenderer = this.renderingSystem.getTileRenderer();
    const villagerRenderer = this.renderingSystem.getVillagerRenderer();
    const wallRenderer = this.renderingSystem.getWallRenderer();
    const uiManager = this.renderingSystem.getUIManager();
    
    // Connect UI manager to the game components
    if (uiManager) {
      uiManager.connectToGameComponents(
        this.gameMap,
        this.villagerManager,
        this.buildingManager
      );
    }
    
    // Set up villager click handler
    villagerRenderer.setVillagerClickHandler((villager, event) => {
      const nativeEvent = event.nativeEvent as PointerEvent;
      const isCtrlPressed = nativeEvent.ctrlKey || nativeEvent.metaKey;
      
      // Handle selection in the villager manager (pure logic)
      this.villagerManager.handleVillagerSelection(villager, isCtrlPressed);
      
      // Update visual selection state (rendering)
      const isSelected = this.villagerManager.getSelectedVillagers().includes(villager);
      villagerRenderer.updateVillagerSelection(villager, isSelected);
    });
    
    // Set up wall foundation click handler
    wallRenderer.setFoundationClickHandler((foundation, event) => {
      if (event.button === 2) { // Right click
        const selectedVillagers = this.villagerManager.getSelectedVillagers();
        if (selectedVillagers.length > 0) {
          this.buildingManager.assignVillagersToFoundation(selectedVillagers, foundation);
        }
      }
    });
  }

  /**
   * Handle rendering mode changes
   */
  private handleRenderingModeChange(newMode: RenderingMode): void {
    console.log(`Rendering mode changed to ${newMode}`);
    
    // Update the isometric utils world position
    const worldPos = this.renderingSystem.getTransformer().getWorldPosition();
    this.isoUtils.updateWorldPosition(worldPos.x, worldPos.y);
    
    // Refresh all visuals with the new rendering mode
    this.renderingSystem.refreshAllVisuals(this.gameMap, this.villagerManager, this.wallManager);
  }

  /**
   * Initialize the game state (create initial entities)
   */
  private initGameState(): void {
    console.log("Initializing game state");
    
    // Create initial villagers at nearby positions
    const startX = Math.floor(MAP_WIDTH / 2);
    const startY = Math.floor(MAP_HEIGHT / 2);
    
    // Create the initial villager
    const villager1 = this.villagerManager.createVillager(startX, startY);
    this.villagerManager.selectVillager(villager1);
    
    // Create a few more villagers nearby
    this.villagerManager.createVillager(startX - 1, startY);
    this.villagerManager.createVillager(startX + 1, startY);
    this.villagerManager.createVillager(startX, startY - 1);
    
    // Periodically add some resources (simulating gathering)
    setInterval(() => {
      this.resourceManager.addResources(1, 1);
    }, 3000);
  }
  
  /**
   * Create selection count display
   */
  private createSelectionCountDisplay(): void {
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
  }

  /**
   * Handle window resize
   */
  private onResize(): void {
    if (this.app.renderer) {
      this.app.renderer.resize(window.innerWidth, window.innerHeight);
      this.worldContainer.x = this.app.screen.width / 2;
      this.worldContainer.y = this.app.screen.height / 4;
      
      // Update transformer with new world position
      this.renderingSystem.updateWorldPosition(this.worldContainer.x, this.worldContainer.y);
      
      // Update isometric utils
      this.isoUtils.updateWorldPosition(this.worldContainer.x, this.worldContainer.y);
    }
  }

  /**
   * Game loop
   */
  private gameLoop(ticker: PIXI.Ticker): void {
    // Calculate delta time for consistent updates
    const delta = ticker.deltaTime;
    
    // Update game logic (no rendering concerns)
    this.updateGameLogic(delta);
    
    // Update rendering system (only rendering concerns)
    this.updateRendering(delta);
  }
  
  /**
   * Update game logic (no rendering)
   */
  private updateGameLogic(delta: number): void {
    // Update villager movement and actions
    this.villagerManager.updateVillagers(delta);
    
    // Update building construction
    this.wallManager.updateFoundationBuilding(delta);
    
    // Check for collisions (debug feature)
    if (this.collisionDetector.getIsEnabled) {
      this.villagerManager.getAllVillagers().forEach(villager => {
        this.collisionDetector.checkVillagerCollision(villager);
      });
    }
  }
  
  /**
   * Update rendering (no game logic)
   */
  private updateRendering(delta: number): void {
    // Update all visual components through the rendering system
    this.renderingSystem.update(delta);
    
    // Update movement visualization for selected villagers
    if (this.pathVisualizer.isDebugEnabled()) {
      this.updatePathVisualizations();
    }
    
    // Sync villager visuals with their current state
    this.syncVillagerVisuals();
  }
  
  /**
   * Sync villager visuals with their logical state
   */
  private syncVillagerVisuals(): void {
    const villagers = this.villagerManager.getAllVillagers();
    const villagerRenderer = this.renderingSystem.getVillagerRenderer();
    
    villagers.forEach(villager => {
      // Update position
      villagerRenderer.updateVillagerPosition(villager);
      
      // Update visual state based on logical state
      villagerRenderer.updateVillagerVisuals(villager);
    });
  }



  /**
   * Update visualization of villager paths (debug feature)
   */
  private updatePathVisualizations(): void {
    if (!this.pathVisualizer.isDebugEnabled()) return;
    
    // Visualize paths for all moving villagers
    const villagers = this.villagerManager.getAllVillagers();
    
    villagers.forEach((villager, index) => {
      if (villager.moving && villager.path.length > 0) {
        // Create a full path from current position to the end
        const fullPath = [{ x: villager.x, y: villager.y }, ...villager.path];
        
        // Use different colors for selected and unselected villagers
        const isSelected = this.villagerManager.getSelectedVillagers().includes(villager);
        const color = isSelected ? 0x00FF00 : 0x0088FF;
        
        // Generate a stable ID for this villager's path
        const pathId = `villager_${index}_path`;
        
        // Visualize the path
        this.pathVisualizer.visualizePath(fullPath, color);
      }
    });
  }
}