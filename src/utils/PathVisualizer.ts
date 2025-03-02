// src/utils/PathVisualizer.ts - Modified to use CoordinateTransformer
import * as PIXI from 'pixi.js';
import { GridPosition } from '../types';
import { CoordinateTransformer } from './CoordinateTransformer';

/**
 * A utility class for visualizing paths in the game world
 * This is helpful for debugging pathfinding and sub-tile movement
 */
export class PathVisualizer {
  private container: PIXI.Container;
  private transformer: CoordinateTransformer;
  private pathGraphics: PIXI.Graphics;
  private debugEnabled: boolean = false;
  private pathVisuals: Map<string, PIXI.Graphics> = new Map();
  
  constructor(container: PIXI.Container, transformer: CoordinateTransformer) {
    this.container = container;
    this.transformer = transformer;
    
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
  
  /**
   * Visualize a path with an optional ID to update existing path
   */
  public visualizePath(path: GridPosition[], color: number = 0xFF0000, id?: string): void {
    console.log(`Visualizing path with ${path.length} points, debug enabled: ${this.debugEnabled}`);
    
    if (!this.debugEnabled || path.length === 0) return;
    
    // Get or create the graphics object for this path
    let pathGraphics: PIXI.Graphics;
    
    if (id && this.pathVisuals.has(id)) {
      // Update existing path visualization
      pathGraphics = this.pathVisuals.get(id)!;
      pathGraphics.clear();
    } else {
      // Create new path visualization
      pathGraphics = id ? new PIXI.Graphics() : this.pathGraphics;
      
      if (id) {
        this.container.addChild(pathGraphics);
        this.pathVisuals.set(id, pathGraphics);
      } else {
        // If no ID, clear the main path graphics
        this.pathGraphics.clear();
      }
    }
    
    // Set line style - make it thicker and more visible
    pathGraphics.lineStyle(3, color, 0.8);
    
    // Start at the first point
    const startPos = this.transformer.toScreen(path[0].x, path[0].y);
    
    // Draw a circle at the starting point
    pathGraphics.beginFill(color, 0.7);
    pathGraphics.drawCircle(startPos.x, startPos.y, 5);
    pathGraphics.endFill();
    
    // Move to the starting point for the line
    pathGraphics.moveTo(startPos.x, startPos.y);
    
    // Draw lines to each subsequent point
    for (let i = 1; i < path.length; i++) {
      const pos = this.transformer.toScreen(path[i].x, path[i].y);
      
      // Draw line to this point
      pathGraphics.lineTo(pos.x, pos.y);
      
      // Draw a circle at this point
      pathGraphics.beginFill(color, 0.7);
      pathGraphics.drawCircle(pos.x, pos.y, 5);
      pathGraphics.endFill();
      
      // Continue the line from here
      pathGraphics.moveTo(pos.x, pos.y);
    }
    
    // Draw an end marker
    if (path.length > 1) {
      const endPos = this.transformer.toScreen(path[path.length - 1].x, path[path.length - 1].y);
      pathGraphics.beginFill(0xFFFF00, 0.8);
      pathGraphics.drawCircle(endPos.x, endPos.y, 8);
      pathGraphics.endFill();
    }
  }
  
  /**
   * Visualize a sub-tile grid for debugging
   */
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
      const start = this.transformer.toScreen(tileX + x, tileY);
      const end = this.transformer.toScreen(tileX + x, tileY + 1);
      this.pathGraphics.moveTo(start.x, start.y);
      this.pathGraphics.lineTo(end.x, end.y);
      console.log(`Grid vertical line: (${start.x}, ${start.y}) to (${end.x}, ${end.y})`);
    }
    
    // Draw horizontal lines
    for (let y = 0; y <= 1; y += 0.25) {
      const start = this.transformer.toScreen(tileX, tileY + y);
      const end = this.transformer.toScreen(tileX + 1, tileY + y);
      this.pathGraphics.moveTo(start.x, start.y);
      this.pathGraphics.lineTo(end.x, end.y);
      console.log(`Grid horizontal line: (${start.x}, ${start.y}) to (${end.x}, ${end.y})`);
    }
    
    // Add tile center marker for reference
    this.markPoint(tileX + 0.5, tileY + 0.5, 0xFFFF00, 8);
    
    console.log("Grid visualization complete");
  }
  
  /**
   * Mark a specific point on the map
   */
  public markPoint(x: number, y: number, color: number = 0xFF0000, size: number = 5): void {
    if (!this.debugEnabled) return;
    
    const pos = this.transformer.toScreen(x, y);
    
    // Make point markers very visible
    this.pathGraphics.lineStyle(2, 0x000000, 1); // Black outline
    this.pathGraphics.beginFill(color, 0.8);
    this.pathGraphics.drawCircle(pos.x, pos.y, size);
    this.pathGraphics.endFill();
    
    console.log(`Marked point at iso=(${x}, ${y}), screen=(${pos.x}, ${pos.y})`);
  }
  
  /**
   * Clear all path visualizations
   */
  public clearPaths(): void {
    console.log("Clearing path visualizations");
    this.pathGraphics.clear();
    
    // Clear all stored path visuals
    this.pathVisuals.forEach((graphics) => {
      this.container.removeChild(graphics);
      graphics.destroy();
    });
    this.pathVisuals.clear();
  }
  
  /**
   * Check if debug visualization is enabled
   */
  public isDebugEnabled(): boolean {
    return this.debugEnabled;
  }
  
  /**
   * Set debug visualization state
   */
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