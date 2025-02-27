import * as PIXI from 'pixi.js';
import { FONT_FAMILY, WALL_COST } from '../constants/gameConstants';

class BuildMenu {
  constructor(app, gameManager) {
    this.app = app;
    this.gameManager = gameManager;
    this.foundationMode = false;
    
    // Create container
    this.container = new PIXI.Container();
    this.container.position.set(20, app.screen.height - 120);
    
    // Create background
    this.background = new PIXI.Graphics();
    this.background.beginFill(0x000000, 0.7);
    this.background.drawRoundedRect(0, 0, 120, 100, 10);
    this.background.endFill();
    this.container.addChild(this.background);
    
    // Create build button
    this.buildButton = this.createButton(60, 30, 0xAA8833, 'Build', () => {
      this.gameManager.toggleBuildMode();
    });
    this.container.addChild(this.buildButton);
    
    // Create cancel button
    this.cancelButton = this.createButton(60, 70, 0x666666, '↩ Back', () => {
      this.gameManager.cancelBuilding();
    });
    this.container.addChild(this.cancelButton);
    
    // Create wall cost text
    this.wallCostText = new PIXI.Text(`Wall (${WALL_COST} wood)`, {
      fontFamily: FONT_FAMILY,
      fontSize: 12,
      fill: 0xFFFFFF,
      align: 'center'
    });
    this.wallCostText.position.set(60, 45);
    this.wallCostText.anchor.set(0.5, 0);
    this.container.addChild(this.wallCostText);
    
    // Create keybind text
    this.keybindText = new PIXI.Text('Press [E]', {
      fontFamily: FONT_FAMILY,
      fontSize: 10,
      fill: 0xCCCCCC,
      align: 'center'
    });
    this.keybindText.position.set(60, 60);
    this.keybindText.anchor.set(0.5, 0);
    this.container.addChild(this.keybindText);
    
    // Create foundation mode text
    this.foundationModeText = new PIXI.Text('Foundation Mode', {
      fontFamily: FONT_FAMILY,
      fontSize: 10,
      fill: 0xFFD700,
      align: 'center'
    });
    this.foundationModeText.position.set(60, 85);
    this.foundationModeText.anchor.set(0.5, 0);
    this.foundationModeText.visible = false;
    this.container.addChild(this.foundationModeText);
  }
  
  createButton(x, y, color, text, onClick) {
    const button = new PIXI.Container();
    button.position.set(x, y);
    button.interactive = true;
    button.buttonMode = true;
    
    // Button background
    const bg = new PIXI.Graphics();
    bg.beginFill(color);
    bg.drawRoundedRect(-40, -15, 80, 30, 5);
    bg.endFill();
    button.addChild(bg);
    
    // Button text
    const buttonText = new PIXI.Text(text, {
      fontFamily: FONT_FAMILY,
      fontSize: 14,
      fill: 0xFFFFFF,
      align: 'center'
    });
    buttonText.anchor.set(0.5);
    button.addChild(buttonText);
    
    // Add hover effects
    button.on('pointerover', () => {
      bg.tint = 0xBBBBBB;
    });
    
    button.on('pointerout', () => {
      bg.tint = 0xFFFFFF;
    });
    
    // Add click handler
    button.on('pointerdown', onClick);
    
    return button;
  }
  
  updateButtonState(buildMode) {
    if (buildMode) {
      this.buildButton.children[0].tint = 0xDDAA44;
    } else {
      this.buildButton.children[0].tint = 0xFFFFFF;
    }
  }
  
  updateFoundationMode(enabled) {
    this.foundationMode = enabled;
    this.foundationModeText.visible = enabled;
  }
  
  isFoundationMode() {
    return this.foundationMode;
  }
  
  resize(width, height) {
    this.container.position.set(20, height - 120);
  }
}

export default BuildMenu;