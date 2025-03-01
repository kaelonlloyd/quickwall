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
import { PathVisualizer } from './utils/PathVisualizer';

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
  private showSubTileGrid: boolean = false;
  private hoveredTile: { x: number, y: number } = { x: -1, y: -1 };

  private pathVisualizer!: PathVisualizer;
  
  constructor() {
    // Create PixiJS Application
    this.app = new PIXI.Application();
    
    // Initialize the application asynchronously
    this.initializeApp().catch(console.error);
  }

  // Initialize the application with sub-tile movement improvements
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
    
    // Initialize path visualizer for debugging
    this.pathVisualizer = new PathVisualizer(this.worldContainer, this.isoUtils);
    
    // Initial resources
    const initialResources: Resources = {
      wood: 100,
      stone: 50
    };
    
    this.resourceManager = new ResourceManager(initialResources);
    
    // Create the wall manager
    this.wallManager = new WallManager(
      this.objectLayer,
      this.isoUtils,
      (x, y) => this.gameMap ? this.gameMap.getVillagersOnTile(x, y) : [],
      (foundation) => this.gameMap ? this.gameMap.handleVillagersOnFoundation(foundation) : undefined,
      (villager) => this.villagerManager ? this.villagerManager.forceVillagerMove(villager) : false
    );
    
    // Create the game map
    this.gameMap = new GameMap(
      this.groundLayer,
      this.objectLayer,
      this.isoUtils
    );
    
    // Set the wall manager in the game map
    this.gameMap.setWallManager(this.wallManager);
    
    // Create the villager manager with the game map
    this.villagerManager = new VillagerManager(this.unitLayer, this.isoUtils, this.gameMap);
    
    // Make sure the GameMap knows about the VillagerManager
    this.gameMap.setVillagerManager(this.villagerManager);
    
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
    
    // Add debug options display
    this.addDebugOptionsDisplay();


  
    this.setupMouseTracking();
    // Update sub-tile grid visualization if enabled and we have a hovered tile
    if (this.showSubTileGrid && this.hoveredTile.x >= 0 && this.hoveredTile.y >= 0) {
      this.pathVisualizer.visualizeSubTileGrid(this.hoveredTile.x, this.hoveredTile.y);
    }
    
  }


  private setupMouseTracking(): void {
    this.app.canvas.addEventListener('mousemove', (e) => {
      // Get mouse position
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      
      // Convert to isometric coordinates
      const isoPos = this.isoUtils.getPrecisePositionFromScreen(mouseX, mouseY);
      const tileX = Math.floor(isoPos.x);
      const tileY = Math.floor(isoPos.y);
      
      // Update hoveredTile if changed
      if (tileX !== this.hoveredTile.x || tileY !== this.hoveredTile.y) {
        this.hoveredTile = { x: tileX, y: tileY };
        
        // Update grid visualization if enabled
        if (this.showSubTileGrid) {
          this.pathVisualizer.clearPaths();
          this.pathVisualizer.visualizeSubTileGrid(tileX, tileY);
        }
      }
    });
  }


  private updatePathVisualization(): void {
    if (!this.pathVisualizer.isDebugEnabled()) return;
    
    // Visualize paths for all moving villagers
    const villagers = this.villagerManager.getAllVillagers();
    
    villagers.forEach(villager => {

      console.log(villager.path);

      if (villager.path.length > 0) {
        // Create a full path from current position to the end
        const path = [{ x: villager.x, y: villager.y }, ...villager.path];
        
        // Use different colors for selected and unselected villagers
        const isSelected = this.villagerManager.getSelectedVillagers().includes(villager);
        const color = isSelected ? 0x00FF00 : 0x0088FF;
        
        this.pathVisualizer.visualizePath(path, color);
      }
    });
  }
  
 private addDebugOptionsDisplay(): void {
  const debugPanel = document.createElement('div');
  debugPanel.style.position = 'fixed';
  debugPanel.style.top = '120px';
  debugPanel.style.right = '10px';
  debugPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  debugPanel.style.color = 'white';
  debugPanel.style.padding = '10px';
  debugPanel.style.borderRadius = '5px';
  debugPanel.style.zIndex = '1000';
  debugPanel.style.fontFamily = 'Arial, sans-serif';
  debugPanel.style.fontSize = '14px';
  
  // Create a toggle for path visualization
  const pathToggle = document.createElement('div');
  pathToggle.innerHTML = `
    <label style="display: flex; align-items: center; margin-bottom: 8px;">
      <input type="checkbox" id="toggle-path-viz" style="margin-right: 8px;"> 
      Show Paths (D key)
    </label>
  `;
  
  // Create a toggle for sub-tile grid visualization
  const gridToggle = document.createElement('div');
  gridToggle.innerHTML = `
    <label style="display: flex; align-items: center; margin-bottom: 8px;">
      <input type="checkbox" id="toggle-subtile-grid" style="margin-right: 8px;"> 
      Show Sub-tile Grid
    </label>
  `;
  
  // Add a status indicator to show current state
  const statusDisplay = document.createElement('div');
  statusDisplay.id = 'debug-status';
  statusDisplay.style.marginTop = '10px';
  statusDisplay.style.padding = '5px';
  statusDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  statusDisplay.style.borderRadius = '3px';
  statusDisplay.textContent = 'Debug: Off';
  
  // Add elements to the panel
  debugPanel.appendChild(pathToggle);
  debugPanel.appendChild(gridToggle);
  debugPanel.appendChild(statusDisplay);
  
  // Add the panel to the document
  document.body.appendChild(debugPanel);
  
  // Set up event listeners with explicit logging
  const pathCheckbox = document.getElementById('toggle-path-viz') as HTMLInputElement;
  if (pathCheckbox) {
    // Initialize checkbox state
    pathCheckbox.checked = this.pathVisualizer.isDebugEnabled();
    
    pathCheckbox.addEventListener('change', () => {
      console.log(`Path visualization checkbox changed to ${pathCheckbox.checked}`);
      this.pathVisualizer.setDebugEnabled(pathCheckbox.checked);
      
      // Draw a test path immediately for confirmation
      if (pathCheckbox.checked) {
        // Create a simple test path
        const testPath = [
          { x: 10, y: 10 },
          { x: 11, y: 10 },
          { x: 12, y: 11 }
        ];
        console.log("Drawing test path");
        this.pathVisualizer.visualizePath(testPath, 0xFF0000);
      }
      
      this.updateDebugStatus();
    });
  }

    
  
  
  const gridCheckbox = document.getElementById('toggle-subtile-grid') as HTMLInputElement;
  if (gridCheckbox) {
    // Initialize checkbox state
    gridCheckbox.checked = this.showSubTileGrid;
    
    gridCheckbox.addEventListener('change', () => {
      console.log(`Sub-tile grid checkbox changed to ${gridCheckbox.checked}`);
      this.showSubTileGrid = gridCheckbox.checked;
      
      if (gridCheckbox.checked) {
        // Force visualization of center tile
        const centerX = Math.floor(MAP_WIDTH / 2);
        const centerY = Math.floor(MAP_HEIGHT / 2);
        console.log(`Visualizing grid at center tile (${centerX}, ${centerY})`);
        this.pathVisualizer.visualizeSubTileGrid(centerX, centerY);
      } else {
        // Clear visualizations when disabled
        this.pathVisualizer.clearPaths();
      }
      
      this.updateDebugStatus();
    });
  }
  
  // Add keyboard listener to sync D key toggle with checkbox
  window.addEventListener('keydown', (e) => {
    if (e.key === 'd' || e.key === 'D') {
      if (pathCheckbox) {
        // Toggle the checkbox to match the new state
        pathCheckbox.checked = this.pathVisualizer.isDebugEnabled();
        this.updateDebugStatus();
      }
    }
  });
  
  console.log("Debug options display added");
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

    this.updatePathVisualization();
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
  

private updateDebugStatus(): void {
  const statusElement = document.getElementById('debug-status');
  if (statusElement) {
    const pathStatus = this.pathVisualizer.isDebugEnabled() ? "ON" : "OFF";
    const gridStatus = this.showSubTileGrid ? "ON" : "OFF";
    statusElement.textContent = `Debug: Paths ${pathStatus}, Grid ${gridStatus}`;
    statusElement.style.backgroundColor = 
      (this.pathVisualizer.isDebugEnabled() || this.showSubTileGrid) 
        ? 'rgba(0, 255, 0, 0.3)' 
        : 'rgba(0, 0, 0, 0.5)';
  }
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


    this.app.canvas.addEventListener('click', (e) => {
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      
      // Convert to precise isometric coordinates
      const isoPos = this.isoUtils.getPrecisePositionFromScreen(mouseX, mouseY);
      
      // Visualize the click point
      const clickGraphics = new PIXI.Graphics();
      clickGraphics.lineStyle(2, 0xFF0000, 1);
      clickGraphics.beginFill(0xFF0000, 0.7);
      
      const screenPos = this.isoUtils.toScreen(isoPos.x, isoPos.y);
      clickGraphics.drawCircle(screenPos.x, screenPos.y, 5);
      clickGraphics.endFill();
      
      // Add to object layer with high z-index
      clickGraphics.zIndex = 1000;
      this.objectLayer.addChild(clickGraphics);
      
      // Optional: Remove the dot after a few seconds
      setTimeout(() => {
        this.objectLayer.removeChild(clickGraphics);
        clickGraphics.destroy();
      }, 3000);
      
      console.log(`Click at precise iso coords: (${isoPos.x.toFixed(2)}, ${isoPos.y.toFixed(2)})`);
    });
  
    
    // Modify tile click handling in UI to pass shift key state
    this.uiManager.setShiftKeyHandler(() => isShiftDown);
  }
}