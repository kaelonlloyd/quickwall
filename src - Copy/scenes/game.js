import * as PIXI from 'pixi.js';
import { FONT_FAMILY } from '../constants/gameConstants';

class GameScene {
  constructor(app, gameManager) {
    this.app = app;
    this.gameManager = gameManager;
    
    // Create container
    this.container = new PIXI.Container();
    this.container.visible = false;
    app.stage.addChild(this.container);
    
    // Create instruction text
    this.instructionsContainer = new PIXI.Container();
    this.instructionsContainer.position.set(10, 50);
    this.container.addChild(this.instructionsContainer);
    
    // Create background for instructions
    this.instructionsBg = new PIXI.Graphics();
    this.instructionsContainer.addChild(this.instructionsBg);
    
    // Create title text
    this.instructionsTitle = new PIXI.Text('How to Play:', {
      fontFamily: FONT_FAMILY,
      fontSize: 16,
      fill: 0xFFFFFF,
      fontWeight: 'bold'
    });
    this.instructionsTitle.position.set(10, 10);
    this.instructionsContainer.addChild(this.instructionsTitle);
    
    // Create instruction lines
    const instructions = [
      'Click to move your villager (blue character)',
      'Press E or click the build icon to enter build mode',
      'In build mode, click on an adjacent tile to build a wall (costs 2 wood)',
      'Hold SHIFT or CTRL to place wall foundations to build later',
      'Press ESC or click the back arrow to exit build mode',
      'Villager must be adjacent to a foundation to build it',
      'Protect your villager from enemy raiders (red units)',
      'Survive for 60 seconds to win!'
    ];
    
    this.instructionLines = [];
    instructions.forEach((text, index) => {
      const line = new PIXI.Text(`• ${text}`, {
        fontFamily: FONT_FAMILY,
        fontSize: 14,
        fill: 0xFFFFFF
      });
      line.position.set(15, 35 + index * 20);
      this.instructionsContainer.addChild(line);
      this.instructionLines.push(line);
    });
    
    // Size the background
    const maxWidth = 400;
    const height = 40 + instructions.length * 20;
    this.instructionsBg.beginFill(0x000000, 0.5);
    this.instructionsBg.drawRoundedRect(0, 0, maxWidth, height, 10);
    this.instructionsBg.endFill();
  }
  
  show() {
    this.container.visible = true;
  }
  
  hide() {
    this.container.visible = false;
  }
  
  handleClick(x, y) {
    // Game scene doesn't handle clicks directly (handled by InputManager)
  }
  
  resize(width, height) {
    // Position instructions at the bottom right
    if (width < 800) {
      // For narrow screens, position at the bottom
      this.instructionsContainer.position.set(
        width / 2 - this.instructionsBg.width / 2,
        height - this.instructionsBg.height - 10
      );
    } else {
      // For wider screens, position at the top right
      this.instructionsContainer.position.set(
        width - this.instructionsBg.width - 10,
        50
      );
    }
  }
}

export default GameScene;