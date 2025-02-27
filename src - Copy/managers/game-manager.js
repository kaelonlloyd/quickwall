import * as PIXI from 'pixi.js';
import { 
  GRID_SIZE, 
  DIFFICULTY_SETTINGS, 
  INITIAL_GAME_TIME,
  INITIAL_WOOD,
  INITIAL_VILLAGER_POSITION,
  WALL_COST,
  BUILD_SPEED,
  COLORS
} from '../constants/gameConstants';
import { 
  gridToScreen, 
  calculateWorldDimensions, 
  calculateCenterOffset,
  drawIsoDiamond, 
  isAdjacent,
  isWithinGrid
} from '../utils/isometric';
import { isVillagerUnderAttack } from '../utils/collision';

import Villager from '../entities/Villager';
import Enemy from '../entities/Enemy';
import Wall from '../entities/Wall';
import Foundation from '../entities/Foundation';

import GameScene from '../scenes/GameScene';
import MenuScene from '../scenes/MenuScene';
import GameOverScene from '../scenes/GameOverScene';
import StatusBar from '../ui/StatusBar';
import BuildMenu from '../ui/BuildMenu';

class GameManager {
  constructor(app) {
    this.app = app;
    
    // Game state
    this.gameStarted = false;
    this.gameOver = false;
    this.score = 0;
    this.time = INITIAL_GAME_TIME;
    this.difficulty = 'medium';
    this.wood = INITIAL_WOOD;
    this.currentScene = null;
    
    // Calculate world dimensions
    const { width, height } = calculateWorldDimensions();
    this.worldWidth = width;
    this.worldHeight = height;
    
    // Calculate center offset
    const { x, y } = calculateCenterOffset(app.screen.width, app.screen.height);
    this.offsetX = x;
    this.offsetY = y;

    // Create containers
    this.worldContainer = new PIXI.Container();
    this.worldContainer.sortableChildren = true; // Enable z-index sorting
    
    this.gridContainer = new PIXI.Container();
    this.gridContainer.sortableChildren = true;
    
    this.entitiesContainer = new PIXI.Container();
    this.entitiesContainer.sortableChildren = true;

    this.uiContainer = new PIXI.Container();
    
    // Add containers to stage
    this.worldContainer.addChild(this.gridContainer);
    this.worldContainer.addChild(this.entitiesContainer);
    this.app.stage.addChild(this.worldContainer);
    this.app.stage.addChild(this.uiContainer);
    
    // Entities
    this.villager = null;
    this.enemies = [];
    this.walls = [];
    this.foundations = [];
    
    // UI elements
    this.selectedTileGraphics = null;
    this.statusBar = null;
    this.buildMenu = null;
    
    // Initialize scenes
    this.initializeScenes();
    
    // Show menu by default
    this.showMenu();
  }
  
  initializeScenes() {
    this.menuScene = new MenuScene(this.app, this);
    this.gameScene = new GameScene(this.app, this);
    this.gameOverScene = new GameOverScene(this.app, this);
  }
  
  showMenu() {
    if (this.currentScene) {
      this.currentScene.hide();
    }
    
    this.currentScene = this.menuScene;
    this.currentScene.show();
    this.gameStarted = false;
    this.gameOver = false;
  }
  
  startGame(difficulty) {
    // Hide current scene
    if (this.currentScene) {
      this.currentScene.hide();
    }
    
    // Set up game state
    this.difficulty = difficulty;
    this.gameStarted = true;
    this.gameOver = false;
    this.score = 0;
    this.time = INITIAL_GAME_TIME;
    this.wood = INITIAL_WOOD;
    
    // Clear previous game elements
    this.clearGame();
    
    // Initialize game elements
    this.initializeGame();
    
    // Show game scene
    this.currentScene = this.gameScene;
    this.currentScene.show();
    
    // Start enemy spawning
    this.startEnemySpawning();
    
    // Start game timer
    this.startGameTimer();
  }
  
  endGame(victory = false) {
    this.gameOver = true;
    
    // Stop enemy spawning
    this.stopEnemySpawning();
    
    // Show game over scene
    if (this.currentScene) {
      this.currentScene.hide();
    }
    
    this.gameOverScene.setResults(this.score, victory);
    this.currentScene = this.gameOverScene;
    this.currentScene.show();
  }
  
  clearGame() {
    // Clear grid
    this.gridContainer.removeChildren();
    
    // Clear entities
    this.entitiesContainer.removeChildren();
    
    // Clear UI
    this.uiContainer.removeChildren();
    
    // Clear arrays
    this.enemies = [];
    this.walls = [];
    this.foundations = [];
    
    // Clear timers
    if (this.enemySpawnTimer) {
      clearInterval(this.enemySpawnTimer);
    }
    
    if (this.gameTimer) {
      clearInterval(this.gameTimer);
    }
  }
  
  initializeGame() {
    // Create grid
    this.createGrid();
    
    // Create villager
    this.createVillager();
    
    // Create UI
    this.createUI();
  }
  
  createGrid() {
    const grid = new PIXI.Graphics();
    
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const { x: screenX, y: screenY } = gridToScreen(x, y, this.offsetX, this.offsetY);
        
        // Alternate colors for tiles
        const color = (x + y) % 2 === 0 ? COLORS.TILE_LIGHT : COLORS.TILE_DARK;
        
        grid.beginFill(color);
        drawIsoDiamond(grid, screenX, screenY, PIXI.Sprite.width, PIXI.Sprite.height);
        grid.endFill();
      }
    }
    
    this.gridContainer.addChild(grid);
    
    // Create selected tile indicator
    this.selectedTileGraphics = new PIXI.Graphics();
    this.gridContainer.addChild(this.selectedTileGraphics);
  }
  
  createVillager() {
    this.villager = new Villager(
      INITIAL_VILLAGER_POSITION.x, 
      INITIAL_VILLAGER_POSITION.y, 
      this.offsetX, 
      this.offsetY
    );
    this.entitiesContainer.addChild(this.villager.container);
  }
  
  createUI() {
    // Status bar
    this.statusBar = new StatusBar(this.app);
    this.statusBar.update(this.wood, this.score, this.time, this.villager.buildMode);
    this.uiContainer.addChild(this.statusBar.container);
    
    // Build menu
    this.buildMenu = new BuildMenu(this.app, this);
    this.uiContainer.addChild(this.buildMenu.container);
  }
  
  startEnemySpawning() {
    const spawnRate = DIFFICULTY_SETTINGS[this.difficulty].spawnRate;
    
    this.enemySpawnTimer = setInterval(() => {
      this.spawnEnemy();
    }, spawnRate);
  }
  
  stopEnemySpawning() {
    if (this.enemySpawnTimer) {
      clearInterval(this.enemySpawnTimer);
      this.enemySpawnTimer = null;
    }
  }
  
  spawnEnemy() {
    if (!this.gameStarted || this.gameOver) return;
    
    // Determine spawn location (random edge)
    const side = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
    let x, y;
    
    switch(side) {
      case 0: // top
        x = Math.floor(Math.random() * GRID_SIZE);
        y = 0;
        break;
      case 1: // right
        x = GRID_SIZE - 1;
        y = Math.floor(Math.random() * GRID_SIZE);
        break;
      case 2: // bottom
        x = Math.floor(Math.random() * GRID_SIZE);
        y = GRID_SIZE - 1;
        break;
      case 3: // left
        x = 0;
        y = Math.floor(Math.random() * GRID_SIZE);
        break;
      default:
        x = 0;
        y = 0;
    }
    
    // Create enemy
    const enemy = new Enemy(
      Date.now(), 
      x, 
      y, 
      DIFFICULTY_SETTINGS[this.difficulty].enemySpeed,
      this.offsetX,
      this.offsetY
    );
    
    this.enemies.push(enemy);
    this.entitiesContainer.addChild(enemy.container);
  }
  
  startGameTimer() {
    this.gameTimer = setInterval(() => {
      this.time--;
      if (this.time <= 0) {
        this.time = 0;
        this.endGame(true); // Victory!
      }
      
      // Update UI
      if (this.statusBar) {
        this.statusBar.update(this.wood, this.score, this.time, this.villager.buildMode);
      }
    }, 1000);
  }
  
  update(deltaTime) {
    if (!this.gameStarted || this.gameOver) return;
    
    // Update villager
    if (this.villager) {
      this.villager.update(deltaTime, this.walls, this.enemies, this.foundations);
    }
    
    // Update enemies
    for (const enemy of this.enemies) {
      enemy.update(deltaTime, this.villager, this.walls, this.enemies);
    }
    
    // Update foundations (building)
    this.updateBuilding(deltaTime);
    
    // Check collisions
    this.checkCollisions();
  }
  
  updateBuilding(deltaTime) {
    if (!this.villager.building || !this.villager.buildingId) return;
    
    const foundation = this.foundations.find(f => f.id === this.villager.buildingId);
    if (!foundation) {
      this.villager.stopBuilding();
      return;
    }
    
    // Update foundation progress
    const isComplete = foundation.updateProgress(BUILD_SPEED * deltaTime);
    
    if (isComplete) {
      // Create wall from foundation
      this.createWall(foundation.id, foundation.x, foundation.y);
      
      // Remove foundation
      this.removeFoundation(foundation.id);
      
      // Process next queue item
      this.villager.processNextQueueItem();
    }
  }
  
  checkCollisions() {
    if (isVillagerUnderAttack(this.villager, this.enemies) && this.villager.safe) {
      this.villager.setUnderAttack();
      this.endGame(false); // Defeat!
    }
  }
  
  updateSelectedTile(gridPos) {
    this.selectedTileGraphics.clear();
    
    if (!gridPos) return;
    
    const { x, y } = gridToScreen(gridPos.x, gridPos.y, this.offsetX, this.offsetY);
    
    // Determine color based on current state
    let color = COLORS.TILE_SELECTED;
    
    if (this.villager.buildMode) {
      const villagerX = Math.round(this.villager.gridX);
      const villagerY = Math.round(this.villager.gridY);
      
      if (isAdjacent(villagerX, villagerY, gridPos.x, gridPos.y)) {
        // Adjacent to villager - can build
        color = COLORS.TILE_BUILDABLE;
      } else if (this.isFoundationMode()) {
        // Foundation mode - can place foundations anywhere
        color = 0x8B8000; // darker gold
      }
    }
    
    // Draw highlight
    this.selectedTileGraphics.lineStyle(2, color, 0.8);
    drawIsoDiamond(
      this.selectedTileGraphics, 
      x, 
      y, 
      PIXI.Sprite.width, 
      PIXI.Sprite.height
    );
  }
  
  placeFoundation(x, y, useFoundationMode = false) {
    // Check if we have enough wood
    if (this.wood < WALL_COST) return;
    
    // Check if position is valid
    if (!isWithinGrid(x, y)) return;
    
    // Check if there's already something at this position
    const wallExists = this.walls.some(wall => wall.x === x && wall.y === y);
    const foundationExists = this.foundations.some(f => f.x === x && f.y === y);
    const villagerAtPosition = Math.round(this.villager.gridX) === x && Math.round(this.villager.gridY) === y;
    const enemyAtPosition = this.enemies.some(enemy => Math.round(enemy.x) === x && Math.round(enemy.y) === y);
    
    if (wallExists || foundationExists || villagerAtPosition || enemyAtPosition) {
      return;
    }
    
    // Check if adjacent to villager (unless using foundation mode)
    const villagerX = Math.round(this.villager.gridX);
    const villagerY = Math.round(this.villager.gridY);
    const isAdjacentToVillager = isAdjacent(villagerX, villagerY, x, y);
    
    if (!isAdjacentToVillager && !useFoundationMode) {
      return;
    }
    
    // Create foundation
    const foundationId = Date.now();
    const foundation = new Foundation(foundationId, x, y, this.offsetX, this.offsetY);
    
    // Add to game
    this.foundations.push(foundation);
    this.entitiesContainer.addChild(foundation.container);
    
    // Deduct wood
    this.wood -= WALL_COST;
    this.score++;
    
    // Update UI
    this.statusBar.update(this.wood, this.score, this.time, this.villager.buildMode);
    
    // If using foundation mode and villager isn't building or moving
    if (useFoundationMode) {
      if (!this.villager.building && !this.villager.moving) {
        this.moveVillagerTo(x, y, true);
      } else {
        this.villager.addToQueue(x, y);
      }
    }
    
    // Exit build mode if not using foundation mode
    if (!useFoundationMode) {
      this.villager.toggleBuildMode();
      this.statusBar.update(this.wood, this.score, this.time, this.villager.buildMode);
      this.buildMenu.updateButtonState(false);
    }
  }
  
  createWall(id, x, y) {
    const wall = new Wall(id, x, y, this.offsetX, this.offsetY);
    this.walls.push(wall);
    this.entitiesContainer.addChild(wall.graphics);
  }
  
  removeFoundation(id) {
    const index = this.foundations.findIndex(f => f.id === id);
    if (index === -1) return;
    
    // Remove from stage
    this.entitiesContainer.removeChild(this.foundations[index].container);
    
    // Remove from array
    this.foundations.splice(index, 1);
  }
  
  moveVillagerTo(x, y, useShiftQueue = false) {
    if (!isWithinGrid(x, y)) return;
    this.villager.setTarget(x, y, useShiftQueue);
  }
  
  toggleBuildMode() {
    this.villager.toggleBuildMode();
    this.statusBar.update(this.wood, this.score, this.time, this.villager.buildMode);
    this.buildMenu.updateButtonState(this.villager.buildMode);
  }
  
  cancelBuilding() {
    this.villager.cancelAll();
    this.statusBar.update(this.wood, this.score, this.time, this.villager.buildMode);
    this.buildMenu.updateButtonState(false);
  }
  
  updateFoundationMode(enabled) {
    // This is called when shift/ctrl is pressed/released
    // Update UI if needed
    this.buildMenu.updateFoundationMode(enabled);
  }
  
  handleMenuClick(x, y) {
    // This is handled by the current scene
    if (this.currentScene) {
      this.currentScene.handleClick(x, y);
    }
  }
  
  // Public getters
  isGameActive() {
    return this.gameStarted && !this.gameOver;
  }
  
  isInMenu() {
    return this.currentScene === this.menuScene;
  }
  
  isInBuildMode() {
    return this.villager && this.villager.buildMode;
  }
  
  isFoundationMode() {
    return this.buildMenu && this.buildMenu.isFoundationMode();
  }
  
  getWorldOffset() {
    return {
      offsetX: this.offsetX,
      offsetY: this.offsetY
    };
  }
  
  getScore() {
    return this.score;
  }
  
  getDifficulty() {
    return this.difficulty;
  }
  
  setDifficulty(difficulty) {
    this.difficulty = difficulty;
  }
  
  resize(width, height) {
    // Recalculate center offset
    const { x, y } = calculateCenterOffset(width, height);
    this.offsetX = x;
    this.offsetY = y;
    
    // Update all entity positions
    this.updateAllPositions();
    
    // Update UI positions
    if (this.statusBar) {
      this.statusBar.resize(width, height);
    }
    
    if (this.buildMenu) {
      this.buildMenu.resize(width, height);
    }
    
    // Update current scene
    if (this.currentScene) {
      this.currentScene.resize(width, height);
    }
  }
  
  updateAllPositions() {
    // Update grid (recreate)
    this.gridContainer.removeChildren();
    this.createGrid();
    
    // Update villager
    if (this.villager) {
      this.villager.offsetX = this.offsetX;
      this.villager.offsetY = this.offsetY;
      this.villager.updatePosition();
    }
    
    // Update enemies
    for (const enemy of this.enemies) {
      enemy.offsetX = this.offsetX;
      enemy.offsetY = this.offsetY;
      enemy.updatePosition();
    }
    
    // Update walls
    for (const wall of this.walls) {
      wall.offsetX = this.offsetX;
      wall.offsetY = this.offsetY;
      wall.updatePosition();
    }
    
    // Update foundations
    for (const foundation of this.foundations) {
      foundation.offsetX = this.offsetX;
      foundation.offsetY = this.offsetY;
      foundation.updatePosition();
    }
  }
}

export default GameManager;