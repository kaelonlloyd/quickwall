import * as PIXI from 'pixi.js';
import { GridPosition } from '../types';
import { IsometricUtils } from '../utils/IsometricUtils';

/**
 * A utility class for visualizing paths in the game world
 * This is helpful for debugging pathfinding and sub-tile movement
 */
// Update PathVisualizer class to ensure visibility

export class PathVisualizer {
  private container: PIXI.Container;
  private isoUtils: IsometricUtils;
  private pathGraphics: PIXI.Graphics;
  private debugEnabled: boolean = false;
  
  constructor(container: PIXI.Container, isoUtils: IsometricUtils) {
    this.container = container;
    this.isoUtils = isoUtils;
    
    // Create the graphics object for path visualization with high z-index
    this.pathGraphics = new PIXI.Graphics();
    this.pathGraphics.zIndex = 1000; // Ensure it renders above other elements
    
    // Make sure to actually add it to the container
    this.container.addChild(this.pathGraphics);
    
    console.log("PathVisualizer initialized");
    
    // Add a debug toggle key listener
    window.addEventListener('keydown', (e) => {
      if (e.key === 'd' || e.key === 'D') {
        this.debugEnabled = !this.debugEnabled;
        console.log(`Path visualization ${this.debugEnabled ? 'enabled' : 'disabled'}`);
        
        // Force a visible change to confirm toggling works
        if (this.debugEnabled) {
          // Draw something obvious to confirm visualization is working
          this.pathGraphics.clear();
          this.pathGraphics.lineStyle(3, 0xFF0000, 1);
          this.pathGraphics.drawCircle(0, 0, 50);
          console.log("Drew test circle at origin");
        } else {
          this.clearPaths();
        }
      }
    });
  }
  
  // Add explicit logging to track visualization calls
 public visualizePath(path: GridPosition[], color: number = 0xFF0000): void {
    console.log(`Visualizing path with ${path.length} points, debug enabled: ${this.debugEnabled}`);
    
    if (!this.debugEnabled || path.length === 0) return;
    
    // Clear previous visualizations first
    this.pathGraphics.clear();
    
    // Set line style - make it thicker and more visible
    this.pathGraphics.lineStyle(3, color, 0.8);
    
    // Start at the first point
    const startPos = this.isoUtils.toScreen(path[0].x, path[0].y);
    
    // Draw a circle at the starting point
    this.pathGraphics.beginFill(color, 0.7);
    this.pathGraphics.drawCircle(startPos.x, startPos.y, 5);
    this.pathGraphics.endFill();
    
    // Move to the starting point for the line
    this.pathGraphics.moveTo(startPos.x, startPos.y);
    
    // Draw lines to each subsequent point
    for (let i = 1; i < path.length; i++) {
      const pos = this.isoUtils.toScreen(path[i].x, path[i].y);
      
      // Draw line to this point
      this.pathGraphics.lineTo(pos.x, pos.y);
      
      // Draw a circle at this point
      this.pathGraphics.beginFill(color, 0.7);
      this.pathGraphics.drawCircle(pos.x, pos.y, 5);
      this.pathGraphics.endFill();
      
      // Continue the line from here
      this.pathGraphics.moveTo(pos.x, pos.y);
    }
    
    // Draw an end marker
    if (path.length > 1) {
      const endPos = this.isoUtils.toScreen(path[path.length - 1].x, path[path.length - 1].y);
      this.pathGraphics.beginFill(0xFFFF00, 0.8);
      this.pathGraphics.drawCircle(endPos.x, endPos.y, 8);
      this.pathGraphics.endFill();
    }
  }
  
  // Make sure grid visualization is more visible
  public visualizeSubTileGrid(tileX: number, tileY: number): void {
    console.log(`visualizeSubTileGrid called, debug=${this.debugEnabled}, tile=(${tileX}, ${tileY})`);
    
    if (!this.debugEnabled) {
      console.log("Grid visualization skipped - debug disabled");
      return;
    }
    
    // Use more visible styling
    this.pathGraphics.clear();
    this.pathGraphics.lineStyle(1.5, 0x00FF00, 0.5); // Thicker, more visible lines
    
    // Draw vertical lines
    for (let x = 0; x <= 1; x += 0.25) {
      const start = this.isoUtils.toScreen(tileX + x, tileY);
      const end = this.isoUtils.toScreen(tileX + x, tileY + 1);
      this.pathGraphics.moveTo(start.x, start.y);
      this.pathGraphics.lineTo(end.x, end.y);
      console.log(`Grid vertical line: (${start.x}, ${start.y}) to (${end.x}, ${end.y})`);
    }
    
    // Draw horizontal lines
    for (let y = 0; y <= 1; y += 0.25) {
      const start = this.isoUtils.toScreen(tileX, tileY + y);
      const end = this.isoUtils.toScreen(tileX + 1, tileY + y);
      this.pathGraphics.moveTo(start.x, start.y);
      this.pathGraphics.lineTo(end.x, end.y);
      console.log(`Grid horizontal line: (${start.x}, ${start.y}) to (${end.x}, ${end.y})`);
    }
    
    // Add tile center marker for reference
    this.markPoint(tileX + 0.5, tileY + 0.5, 0xFFFF00, 8);
    
    console.log("Grid visualization complete");
  }
  
  public markPoint(x: number, y: number, color: number = 0xFF0000, size: number = 5): void {
    if (!this.debugEnabled) return;
    
    const pos = this.isoUtils.toScreen(x, y);
    
    // Make point markers very visible
    this.pathGraphics.lineStyle(2, 0x000000, 1); // Black outline
    this.pathGraphics.beginFill(color, 0.8);
    this.pathGraphics.drawCircle(pos.x, pos.y, size);
    this.pathGraphics.endFill();
    
    console.log(`Marked point at iso=(${x}, ${y}), screen=(${pos.x}, ${pos.y})`);
  }
  
  public clearPaths(): void {
    console.log("Clearing path visualizations");
    this.pathGraphics.clear();
  }
  
  public isDebugEnabled(): boolean {
    return this.debugEnabled;
  }
  
  public setDebugEnabled(enabled: boolean): void {
    console.log(`Setting debug visualization to ${enabled}`);
    this.debugEnabled = enabled;
    
    // Draw something immediately to confirm toggling works
    if (enabled) {
      // Draw a test marker at the world origin
      this.pathGraphics.clear();
      this.pathGraphics.lineStyle(2, 0xFF0000, 1);
      this.pathGraphics.drawCircle(0, 0, 20);
      console.log("Drew test circle at origin");
    } else {
      this.clearPaths();
    }
  }
}