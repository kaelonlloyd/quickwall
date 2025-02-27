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
  debugElement.style.backgroundColor = 'rgba(255,0,0,0.5)';
  debugElement.style.color = 'white';
  debugElement.style.zIndex = '1000';
  debugElement.textContent = 'Initializing...';
  document.body.appendChild(debugElement);
  
  try {
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
        debugElement.textContent = 'Game Init Failed: ' + error.message;
      }
    }, 2000);
  } catch (error) {
    console.error("PIXI test failed:", error);
    debugElement.textContent = 'PIXI Failed: ' + error.message;
  }
});