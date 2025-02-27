import * as PIXI from 'pixi.js';
import { FONT_FAMILY } from '../constants/gameConstants';

class MenuScene {
  constructor(app, gameManager) {
    this.app = app;
    this.gameManager = gameManager;
    this.selectedDifficulty = 'medium';
    
    // Create container
    this.container = new PIXI.Container();
    this.container.visible = false;
    app.stage.addChild(this.container);
    
    // Create background overlay
    this.background = new PIXI.Graphics();
    this.container.addChild(this.background);
    
    // Create title text
    this.titleText = new PIXI.Text('Quick Wall Hero', {
      fontFamily: FONT_FAMILY,
      fontSize: 36,
      fill: 0xFFFFFF,
      fontWeight: 'bold',
      align: 'center',
      dropShadow: true,
      dropShadowColor: 0x000000,
      dropShadowDistance: 4
    });
    this.titleText.anchor.set(0.5, 0);
    this.container.addChild(this.titleText);
    
    // Create subtitle text
    this.subtitleText = new PIXI.Text('Practice your AoE2 quick walling skills!', {
      fontFamily: FONT_FAMILY,
      fontSize: 18,
      fill: 0xFFFFFF,
      align: 'center',
      dropShadow: true,
      dropShadowColor: 0x000000,
      dropShadowDistance: 2
    });
    this.subtitleText.anchor.set(0.5, 0);
    this.container.addChild(this.subtitleText);
    
    // Create difficulty text
    this.difficultyText = new PIXI.Text('Difficulty:', {
      fontFamily: FONT_FAMILY,
      fontSize: 20,
      fill: 0xFFFFFF,
      align: 'center'
    });
    this.difficultyText.anchor.set(0.5, 0);
    this.container.addChild(this.difficultyText);
    
    // Create difficulty buttons
    this.difficultyButtons = {
      easy: this.createDifficultyButton('Easy', 'easy'),
      medium: this.createDifficultyButton('Medium', 'medium'),
      hard: this.createDifficultyButton('Hard', 'hard')
    };
    
    // Add difficulty buttons to container
    Object.values(this.difficultyButtons).forEach(button => {
      this.container.addChild(button);
    });
    
    // Create start button
    this.startButton = this.createButton('Start Game', () => {
      this.gameManager.startGame(this.selectedDifficulty);
    });
    this.container.addChild(this.startButton);
    
    // Position elements
    this.resize(app.screen.width, app.screen.height);
    
    // Update difficulty button colors
    this.updateDifficultyButtons();
  }
  
  createDifficultyButton(text, difficulty) {
    const button = new PIXI.Container();
    button.interactive = true;
    button.buttonMode = true;
    
    // Button background
    const bg = new PIXI.Graphics();
    bg.beginFill(0x555555);
    bg.drawRoundedRect(-50, -15, 100, 30, 5);
    bg.endFill();
    button.addChild(bg);
    
    // Button text
    const buttonText = new PIXI.Text(text, {
      fontFamily: FONT_FAMILY,
      fontSize: 16,
      fill: 0xFFFFFF,
      align: 'center'
    });
    buttonText.anchor.set(0.5);
    button.addChild(buttonText);
    
    // Add hover effects
    button.on('pointerover', () => {
      if (this.selectedDifficulty !== difficulty) {
        bg.tint = 0xAAAAAA;
      }
    });
    
    button.on('pointerout', () => {
      if (this.selectedDifficulty !== difficulty) {
        bg.tint = 0xFFFFFF;
      }
    });
    
    // Add click handler
    button.on('pointerdown', () => {
      this.selectedDifficulty = difficulty;
      this.updateDifficultyButtons();
    });
    
    return button;
  }
  
  createButton(text, onClick) {
    const button = new PIXI.Container();
    button.interactive = true;
    button.buttonMode = true;
    
    // Button background
    const bg = new PIXI.Graphics();
    bg.beginFill(0x3A8EE6);
    bg.drawRoundedRect(-100, -20, 200, 40, 8);
    bg.endFill();
    button.addChild(bg);
    
    // Button text
    const buttonText = new PIXI.Text(text, {
      fontFamily: FONT_FAMILY,
      fontSize: 18,
      fill: 0xFFFFFF,
      fontWeight: 'bold',
      align: 'center'
    });
    buttonText.anchor.set(0.5);
    button.addChild(buttonText);
    
    // Add hover effects
    button.on('pointerover', () => {
      bg.tint = 0xAAAAAA;
    });
    
    button.on('pointerout', () => {
      bg.tint = 0xFFFFFF;
    });
    
    // Add click handler
    button.on('pointerdown', onClick);
    
    return button;
  }
  
  updateDifficultyButtons() {
    // Update button colors based on selected difficulty
    Object.entries(this.difficultyButtons).forEach(([difficulty, button]) => {
      const bg = button.children[0];
      
      if (difficulty === this.selectedDifficulty) {
        bg.tint = 0x3A8EE6;
      } else {
        bg.tint = 0xFFFFFF;
      }
    });
  }
  
  show() {
    this.container.visible = true;
    this.resize(this.app.screen.width, this.app.screen.height);
  }
  
  hide() {
    this.container.visible = false;
  }
  
  handleClick(x, y) {
    // Clicks are handled by the button event handlers
  }
  
  resize(width, height) {
    // Update background
    this.background.clear();
    this.background.beginFill(0x000000, 0.5);
    this.background.drawRect(0, 0, width, height);
    this.background.endFill();
    
    // Position elements
    const centerX = width / 2;
    const centerY = height / 2;
    
    this.titleText.position.set(centerX, centerY - 150);
    this.subtitleText.position.set(centerX, centerY - 100);
    this.difficultyText.position.set(centerX, centerY - 50);
    
    // Position difficulty buttons
    const buttonWidth = 120;
    const buttonSpacing = 20;
    const totalWidth = buttonWidth * 3 + buttonSpacing * 2;
    const startX = centerX - totalWidth / 2 + buttonWidth / 2;
    
    this.difficultyButtons.easy.position.set(startX, centerY);
    this.difficultyButtons.medium.position.set(startX + buttonWidth + buttonSpacing, centerY);
    this.difficultyButtons.hard.position.set(startX + (buttonWidth + buttonSpacing) * 2, centerY);
    
    // Position start button
    this.startButton.position.set(centerX, centerY + 80);
  }
}

export default MenuScene;