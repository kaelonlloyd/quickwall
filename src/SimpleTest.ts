import * as PIXI from 'pixi.js';

// A super simple PIXI test to verify basic rendering works
export class SimpleTest {
  constructor() {
    console.log("Starting simple PIXI test");
    
    // Create a very basic application
    const app = new PIXI.Application({
      width: 800,
      height: 600,
      backgroundColor: 0xFF0000
    });
    
    // Add to DOM
    document.body.appendChild(app.view as HTMLCanvasElement);
    
    // Create a simple shape
    const graphics = new PIXI.Graphics();
    graphics.beginFill(0xFFFF00);
    graphics.drawRect(200, 200, 100, 100);
    graphics.endFill();
    app.stage.addChild(graphics);
    
    console.log("Simple PIXI test initialized");
  }
}