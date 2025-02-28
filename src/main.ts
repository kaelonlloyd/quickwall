import './index.css';
import './types/pixi-extensions';
import { Game } from './Game';
import { SimpleTest } from './SimpleTest';

// Wait for DOM to load
window.addEventListener('DOMContentLoaded', () => {
  console.log("DOM loaded, initializing...");
  
  // Add a debug element to check if JavaScript is running
  const debugElement = document.createElement('div');
  debugElement.style.position = 'fixed';
  debugElement.style.top = '5px';
  debugElement.style.right = '5px';
  debugElement.style.padding = '5px';
  debugElement.style.backgroundColor = 'rgba(0,0,0,0.5)';
  debugElement.style.color = 'white';
  debugElement.style.zIndex = '1000';
  debugElement.style.fontFamily = 'Arial, sans-serif';
  debugElement.textContent = 'Initializing...';
  document.body.appendChild(debugElement);
  
  // Add instructions
  const instructionsElement = document.createElement('div');
  instructionsElement.style.position = 'fixed';
  instructionsElement.style.top = '40px';
  instructionsElement.style.right = '5px';
  instructionsElement.style.padding = '10px';
  instructionsElement.style.backgroundColor = 'rgba(0,0,0,0.5)';
  instructionsElement.style.color = 'white';
  instructionsElement.style.zIndex = '1000';
  instructionsElement.style.fontFamily = 'Arial, sans-serif';
  instructionsElement.style.fontSize = '14px';
  instructionsElement.style.borderRadius = '3px';
  instructionsElement.style.width = '250px';
  instructionsElement.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 5px;">Controls:</div>
    <ul style="padding-left: 20px; margin: 0;">
      <li>Left-click: Select villager</li>
      <li>Ctrl+Left-click: Add to selection</li>
      <li>Click and drag: Select multiple villagers</li>
      <li>Right-click: Move selected villagers</li>
      <li>Press 'B': Build wall (costs 5 wood, 2 stone)</li>
    </ul>
  `;
  document.body.appendChild(instructionsElement);
  
  const runTest = false; // Set to true if you want to run the simple test first
  
  try {
    // Option to run simple test first
    if (runTest) {
      // Try simple test first to check if PIXI works at all
      const simpleTest = new SimpleTest();
      
      // After 2 seconds, if PIXI works, try initializing the full game
      setTimeout(() => {
        debugElement.textContent = 'Starting Game...';
        try {
          const game = new Game();
          debugElement.textContent = 'Game Initialized';
        } catch (error) {
          console.error("Game initialization failed:", error);
          debugElement.textContent = 'Game Init Failed: ' + (error instanceof Error ? error.message : String(error));
        }
      }, 2000);
    } else {
      // Directly initialize the game
      debugElement.textContent = 'Starting Game...';
      const game = new Game();
      debugElement.textContent = 'Game Initialized';
    }
  } catch (error) {
    console.error("Initialization failed:", error);
    debugElement.textContent = 'Game Init Failed: ' + (error instanceof Error ? error.message : String(error));
  }
});