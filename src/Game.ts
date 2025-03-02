// src/Game.ts - Updated with decoupled rendering
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
import { VillagerEvent } from './components/VillagerStateMachine';

export class Game {
  private app!: PIXI.Application;
  private worldContainer!: PIXI.Container;
  
  // Rendering system
  private renderingSystem!: RenderingSystem;
  
  // Game components
  private resourceManager!: ResourceManager;
  private gameMap!: GameMap;
  private villagerManager!: VillagerManager;
  private buildingManager!: BuildingManager;
  private wallManager!: WallManager;
  
  // UI components
  private renderingToggle!: RenderingToggle;
  private pathVisualizer!: PathVisualizer;
  
  // Game state
  private showBuildTimes: boolean = false;
  private showSubTileGrid: boolean = false;
  
  constructor() {
    // Create PixiJS Application
    this.app = new PIXI.Application();
    
    // Initialize the application asynchronously
    this.initializeApp().catch(console.error);
  }

  // Initialize the application with decoupled rendering
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
    
    // Initialize the rendering system - this creates all the layers
    this.renderingSystem = new RenderingSystem(this.worldContainer, RenderingMode.ISOMETRIC);
    
    // Initialize path visualizer for debugging
    this.pathVisualizer = new PathVisualizer(
      this.worldContainer, 
      this.renderingSystem.getTransformer()
    );
    
    // Initial resources
    const initialResources: Resources = {
      wood: 100,
      stone: 50
    };
    
    this.resourceManager = new ResourceManager(initialResources);
    
    // Create the wall manager - now without rendering responsibilities
    this.wallManager = new WallManager();
    
    // Create the game map - now without rendering responsibilities
    this.gameMap = new GameMap();
    
    // Set the wall manager in the game map
    this.gameMap.setWallManager(this.wallManager);
    
    // Create the villager manager - now without rendering responsibilities
    this.villagerManager = new VillagerManager(this.gameMap);
    
    // Make sure the GameMap knows about the VillagerManager
    this.gameMap.setVillagerManager(this.villagerManager);
    
    // Create the building manager
    this.buildingManager = new BuildingManager(this.gameMap, this.resourceManager, this.villagerManager);
    
    // Initialize the rendering toggle
    this.renderingToggle = new RenderingToggle(
      this.renderingSystem.getTransformer(),
      this.handleRenderingModeChange.bind(this)
    );
    this.renderingToggle.addShortcutToInstructions();
    
    // Set up event handlers
    this.setupEventHandlers();
    
    // Set up game loop
    this.app.ticker.add(this.gameLoop.bind(this));
    
    // Handle window resize
    window.addEventListener('resize', this.onResize.bind(this));
    
    // Initialize game state
    this.initGame();
    
    // Do the initial rendering of the game state
    this.renderingSystem.renderGameState(this.gameMap, this.villagerManager, this.wallManager);
  }

  /**
   * Set up event handlers for user interaction
   */
  private setupEventHandlers(): void {
    // Get renderers
    const tileRenderer = this.renderingSystem.getTileRenderer();
    const villagerRenderer = this.renderingSystem.getVillagerRenderer();
    const wallRenderer = this.renderingSystem.getWallRenderer();
    
    // Set up tile click handler
    tileRenderer.setTileClickHandler((x, y, event) => {
      const nativeEvent = event.nativeEvent as PointerEvent;
      
      // Check for wall build mode first
      if (this.buildingManager.getBuildMode() === 'wall') {
        // Check if shift key is down
        const isShiftDown = nativeEvent.shiftKey;
        
        if (nativeEvent.button === 0) { // Left click in build mode
          this.buildingManager.handleTileClick(x, y, isShiftDown);
          return;
        }
      }
      
      // Handle normal tile clicks
      if (nativeEvent.button === 0) { // Left click
        // Check if Ctrl key is pressed for multi-selection
        const isCtrlPressed = nativeEvent.ctrlKey || nativeEvent.metaKey;
        this.handleLeftClick(x, y, isCtrlPressed);
      } else if (nativeEvent.button === 2) { // Right click
        this.handleRightClick(x, y, event.global.x, event.global.y);
      }
    });
    
    // Set up tile hover handlers
    tileRenderer.setTileHoverHandlers(
      // Hover in
      (x, y) => {
        // If in wall build mode, provide visual feedback
        if (this.buildingManager.getBuildMode() === 'wall') {
          // Check if wall can be placed
          const canPlaceWall = this.gameMap.getTile(x, y)?.type !== 3 && // Not TREE
                              this.gameMap.getTile(x, y)?.type !== 4 && // Not STONE
                              this.gameMap.getTile(x, y)?.type !== 1;   // Not WALL
          
          // Visual indication based on placement possibility
          tileRenderer.highlightTile(x, y, canPlaceWall ? 0x00FF00 : 0xFF0000);
        } else {
          tileRenderer.highlightTile(x, y, 0xDDDDDD);
        }
      },
      // Hover out
      (x, y) => {
        tileRenderer.clearHighlight(x, y);
      }
    );
    
    // Set up villager click handler
    villagerRenderer.setVillagerClickHandler((villager, event) => {
      const nativeEvent = event.nativeEvent as PointerEvent;
      const isCtrlPressed = nativeEvent.ctrlKey || nativeEvent.metaKey;
      
      this.villagerManager.selectVillager(villager, isCtrlPressed);
      
      // Update visual selection state
      villagerRenderer.updateVillagerSelection(
        villager, 
        this.villagerManager.getSelectedVillagers().includes(villager)
      );
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
    
    // Refresh all visuals with the new rendering mode
    this.renderingSystem.refreshAllVisuals(this.gameMap, this.villagerManager, this.wallManager);
  }

  /**
   * Handle left-click on tiles
   */
  private handleLeftClick(x: number, y: number, isCtrlPressed: boolean): void {
    console.log(`Left click - Coordinates: x=${x}, y=${y}`);
    
    // Check if we're in build mode
    if (this.buildingManager.getBuildMode() === 'wall') {
      const isShiftDown = false; // We'd get this from a keyboard state tracker
      this.buildingManager.handleTileClick(x, y, isShiftDown);
      return;
    }
    
    // Check if there's a villager at this position
    const villagerAtPosition = this.villagerManager.findVillagerAtPosition(x, y);
    
    if (villagerAtPosition) {
      this.villagerManager.selectVillager(villagerAtPosition, isCtrlPressed);
      
      // Update visual selection state
      this.renderingSystem.getVillagerRenderer().updateVillagerSelection(
        villagerAtPosition, 
        this.villagerManager.getSelectedVillagers().includes(villagerAtPosition)
      );
    } else {
      // If no villager, deselect all (unless Ctrl is pressed)
      if (!isCtrlPressed) {
        this.villagerManager.clearSelection();
        
        // Update all villager visuals to reflect deselection
        this.villagerManager.getAllVillagers().forEach(villager => {
          this.renderingSystem.getVillagerRenderer().updateVillagerSelection(villager, false);
        });
      }
    }
  }

  /**
   * Handle right-click on tiles
   */
  private handleRightClick(x: number, y: number, mouseX: number, mouseY: number): void {
    console.log(`Right click - Coordinates: x=${x}, y=${y}, Screen: (${mouseX}, ${mouseY})`);
    
    // Get the precise sub-tile position
    const transformer = this.renderingSystem.getTransformer();
    const preciseIsoPosition = transformer.getPrecisePositionFromScreen(mouseX, mouseY);
    
    const selectedVillagers = this.villagerManager.getSelectedVillagers();
    
    // If we have villagers selected, right-click on ground moves them
    if (selectedVillagers.length > 0) {
      // Move all selected villagers as a group to the precise position
      this.villagerManager.moveSelectedVillagersToPoint(
        preciseIsoPosition.x, 
        preciseIsoPosition.y
      );
    } else {
      // If no villagers selected, open build menu
      this.buildingManager.showBuildMenu(mouseX, mouseY);
    }
  }

  /**
   * Initialize the game state
   */
  private initGame(): void {
    console.log("Game initialization started");
    
    // Create initial map
    this.gameMap.initMap();
    
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
    }
  }

  /**
   * Game loop
   */
  private gameLoop(ticker: PIXI.Ticker): void {
    // Calculate delta time for consistent updates
    const delta = ticker.deltaTime;
    
    // Update game logic
    this.villagerManager.updateVillagers(delta);
    this.wallManager.updateFoundationBuilding(delta);
    
    // Update renderers
    this.renderingSystem.update(delta);
    
    // Update path visualizations if enabled
    if (this.pathVisualizer.isDebugEnabled()) {
      this.updatePathVisualizations();
    }
  }

  /**
   * Update visualization of villager paths
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
        
        // Visualize the path with its unique ID
        this.pathVisualizer.visualizePath(fullPath, color, pathId);
      }
    });
  }
}