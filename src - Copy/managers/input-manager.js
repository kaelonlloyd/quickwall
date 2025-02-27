import { screenToGrid, isWithinGrid } from '../utils/isometric';

class InputManager {
  constructor(app, gameManager) {
    this.app = app;
    this.gameManager = gameManager;
    this.isShiftPressed = false;
    this.isCtrlPressed = false;
    this.selectedTile = null;
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Mouse events
    this.app.stage.interactive = true;
    this.app.stage.hitArea = this.app.screen;
    
    this.app.stage.on('pointermove', this.onPointerMove.bind(this));
    this.app.stage.on('pointerdown', this.onPointerDown.bind(this));
    
    // Keyboard events
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));
  }
  
  onPointerMove(event) {
    if (!this.gameManager.isGameActive()) return;
    
    const { x, y } = event.data.global;
    const { offsetX, offsetY } = this.gameManager.getWorldOffset();
    const gridPos = screenToGrid(x, y, offsetX, offsetY);
    
    if (isWithinGrid(gridPos.x, gridPos.y)) {
      this.selectedTile = gridPos;
      this.gameManager.updateSelectedTile(gridPos);
    } else {
      this.selectedTile = null;
      this.gameManager.updateSelectedTile(null);
    }
  }
  
  onPointerDown(event) {
    if (!this.gameManager.isGameActive()) {
      // Handle menu clicks
      if (this.gameManager.isInMenu()) {
        this.gameManager.handleMenuClick(event.data.global.x, event.data.global.y);
      }
      return;
    }
    
    if (!this.selectedTile) return;
    
    // Handle tile click based on current mode
    if (this.gameManager.isInBuildMode()) {
      this.gameManager.placeFoundation(
        this.selectedTile.x, 
        this.selectedTile.y, 
        this.isShiftPressed || this.isCtrlPressed
      );
    } else {
      this.gameManager.moveVillagerTo(
        this.selectedTile.x, 
        this.selectedTile.y, 
        this.isShiftPressed
      );
    }
  }
  
  onKeyDown(event) {
    if (!this.gameManager.isGameActive()) return;
    
    switch (event.key) {
      case 'Shift':
        this.isShiftPressed = true;
        this.gameManager.updateFoundationMode(true);
        break;
      case 'Control':
        this.isCtrlPressed = true;
        this.gameManager.updateFoundationMode(true);
        break;
      case 'e':
      case 'E':
        this.gameManager.toggleBuildMode();
        break;
      case 'Escape':
        this.gameManager.cancelBuilding();
        break;
    }
  }
  
  onKeyUp(event) {
    switch (event.key) {
      case 'Shift':
        this.isShiftPressed = false;
        if (!this.isCtrlPressed) {
          this.gameManager.updateFoundationMode(false);
        }
        break;
      case 'Control':
        this.isCtrlPressed = false;
        if (!this.isShiftPressed) {
          this.gameManager.updateFoundationMode(false);
        }
        break;
    }
  }
  
  cleanup() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.app.stage.off('pointermove');
    this.app.stage.off('pointerdown');
  }
  
  isFoundationMode() {
    return this.isShiftPressed || this.isCtrlPressed;
  }
}

export default InputManager;