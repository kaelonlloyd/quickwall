import * as PIXI from 'pixi.js';
import { FONT_FAMILY } from '../constants/gameConstants';

class StatusBar {
  constructor(app) {
    this.app = app;
    
    // Create container
    this.container = new PIXI.Container();
    
    // Create background
    this.background = new PIXI.Graphics();
    this.container.addChild(this.background);
    
    // Create text elements
    this.woodText = new PIXI.Text('Wood: 200', {
      fontFamily: FONT_FAMILY,
      fontSize: 16,
      fill: 0xFFFFFF,
      fontWeight: 'bold'
    });
    this.container.addChild(this.woodText);
    
    this.scoreText = new PIXI.Text('Score: 0', {
      fontFamily: FONT_FAMILY,
      fontSize: 16,
      fill: 0xFFFFFF,
      fontWeight: 'bold'
    });
    this.container.addChild(this.scoreText);
    
    this.timeText = new PIXI.Text('Time: 60s', {
      fontFamily: FONT_FAMILY,
      fontSize: 16,
      fill: 0xFFFFFF,
      fontWeight: 'bold'
    });
    this.container.addChild(this.timeText);
    
    this.modeText = new PIXI.Text('Mode: Walking', {
      fontFamily: FONT_FAMILY,
      fontSize: 16,
      fill: 0xFFFFFF,
      fontWeight: 'bold'
    });
    this.container.addChild(this.modeText);
    
    // Position elements
    this.resize(app.screen.width, app.screen.height);
  }
  
  update(wood, score, time, buildMode) {
    this.woodText.text = `Wood: ${wood}`;
    this.scoreText.text = `Score: ${score}`;
    this.timeText.text = `Time: ${time}s`;
    this.modeText.text = `Mode: ${buildMode ? 'Building' : 'Walking'}`;
  }
  
  resize(width, height) {
    // Update background
    this.background.clear();
    this.background.beginFill(0x000000, 0.7);
    this.background.drawRect(0, 0, width, 40);
    this.background.endFill();
    
    // Position text elements
    const padding = 20;
    const spacing = (width - padding * 2) / 4;
    
    this.woodText.position.set(padding, 10);
    this.scoreText.position.set(padding + spacing, 10);
    this.timeText.position.set(padding + spacing * 2, 10);
    this.modeText.position.set(padding + spacing * 3, 10);
  }
}

export default StatusBar;