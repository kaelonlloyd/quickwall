import * as PIXI from 'pixi.js';

// A super simple PIXI test to verify basic rendering works
export class SimpleTest {
  constructor() {
    console.log("Starting simple PIXI test");
    
    // Create the application using the new initialization method
    const app = new PIXI.Application();
    
    // Initialize the application
    app.init({
      width: 800,
      height: 600,
      backgroundColor: 0xFF0000
    }).then(() => {
      console.log("PIXI application initialized");
      
      // Add to DOM using the new canvas property
      document.body.appendChild(app.canvas);
      
      // Create a simple shape
      const graphics = new PIXI.Graphics();
      graphics.beginFill(0xFFFF00);
      graphics.drawRect(200, 200, 100, 100);
      graphics.endFill();
      app.stage.addChild(graphics);
      
      console.log("Simple PIXI test initialized");
    }).catch((error) => {
      console.error("Failed to initialize PIXI application:", error);
    });
  }
}