import * as PIXI from 'pixi.js';
import { COLORS, TILE_HEIGHT, TILE_WIDTH, VILLAGER_SPEED } from '../constants';
import { GridPosition, Villager, VillagerTask, BuildTask } from '../types';
import { IsometricUtils } from '../utils/IsometricUtils';
import { GameMap } from './Map';
import { WallFoundation } from './WallManager';
import { PathFinder } from '../utils/pathfinding';

export class VillagerManager {
  private villagers: Villager[];
  private unitLayer: PIXI.Container;
  private isoUtils: IsometricUtils;
  private selectedVillagers: Villager[];
  private gameMap: GameMap;
  
  constructor(unitLayer: PIXI.Container, isoUtils: IsometricUtils, gameMap: GameMap) {
    this.villagers = [];
    this.unitLayer = unitLayer;
    this.isoUtils = isoUtils;
    this.selectedVillagers = [];
    this.gameMap = gameMap; 
    
    // Enable sorting in unit layer for depth-based rendering
    this.unitLayer.sortableChildren = true;
    
    // Create selection count text for DOM
    document.addEventListener('DOMContentLoaded', () => {
      const textContainer = document.createElement('div');
      textContainer.style.position = 'absolute';
      textContainer.style.bottom = '10px';
      textContainer.style.left = '10px';
      textContainer.style.color = 'white';
      textContainer.style.fontSize = '16px';
      textContainer.style.fontFamily = 'Arial';
      textContainer.style.textShadow = '1px 1px 1px black';
      textContainer.style.padding = '5px';
      textContainer.style.zIndex = '1000';
      textContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
      textContainer.style.borderRadius = '3px';
      textContainer.id = 'villager-selection-count';
      textContainer.textContent = 'Villagers: 0';
      document.body.appendChild(textContainer);
    });
  }
  
  public getIsoUtils(): IsometricUtils {
    return this.isoUtils;
  }
  
  public getSelectedVillagers(): Villager[] {
    return this.selectedVillagers;
  }
  
  public getSelectedVillager(): Villager | null {
    return this.selectedVillagers.length > 0 ? this.selectedVillagers[0] : null;
  }
  
  public clearSelection(): void {
    // Deselect all currently selected villagers
    this.selectedVillagers.forEach(v => {
      this.updateVillagerSelectionVisuals(v, false);
    });
    this.selectedVillagers = [];
    this.updateSelectionCountDisplay();
  }
  
  public addToSelection(villager: Villager): void {
    // Only add if not already selected
    if (!this.selectedVillagers.includes(villager)) {
      this.selectedVillagers.push(villager);
      this.updateVillagerSelectionVisuals(villager, true);
    }
    this.updateSelectionCountDisplay();
  }
  
  private updateVillagerSelectionVisuals(villager: Villager, isSelected: boolean): void {
    // Update selection ring
    villager.selectionRing.visible = isSelected;
    
    // Add a distinctive selection marker (flag on top of the villager)
    if (!villager.selectionFlag && isSelected) {
      // Create a flag marker if it doesn't exist
      const flag = new PIXI.Graphics();
      flag.beginFill(0xFFFF00); // Yellow flag
      flag.moveTo(TILE_WIDTH / 2, TILE_HEIGHT / 6 - 15); // Position above head
      flag.lineTo(TILE_WIDTH / 2 + 10, TILE_HEIGHT / 6 - 10);
      flag.lineTo(TILE_WIDTH / 2, TILE_HEIGHT / 6 - 5);
      flag.endFill();
      
      // Add flag pole
      flag.lineStyle(1, 0x000000);
      flag.moveTo(TILE_WIDTH / 2, TILE_HEIGHT / 6 - 15);
      flag.lineTo(TILE_WIDTH / 2, TILE_HEIGHT / 6 - 2);
      
      villager.sprite.addChild(flag);
      villager.selectionFlag = flag;
    } else if (villager.selectionFlag) {
      // Show/hide the existing flag
      villager.selectionFlag.visible = isSelected;
    }
    
    // Make the selection ring pulsate for better visibility
    if (isSelected && villager.selectionRing) {
      // Stop any existing animation
      if (villager.selectionAnimation) {
        clearInterval(villager.selectionAnimation);
      }
      
      // Create pulsating animation
      let scale = 1.0;
      let increasing = false;
      villager.selectionAnimation = setInterval(() => {
        if (increasing) {
          scale += 0.03;
          if (scale >= 1.3) {
            increasing = false;
          }
        } else {
          scale -= 0.03;
          if (scale <= 0.8) {
            increasing = true;
          }
        }
        
        if (villager.selectionRing) {
          villager.selectionRing.scale.set(scale);
        }
      }, 50);
    } else if (!isSelected && villager.selectionAnimation) {
      // Stop animation when not selected
      clearInterval(villager.selectionAnimation);
      villager.selectionAnimation = null;
      
      // Reset scale
      if (villager.selectionRing) {
        villager.selectionRing.scale.set(1.0);
      }
    }
  }
  
  public selectVillager(villager: Villager, addToSelection: boolean = false): void {
    if (!addToSelection) {
      // Deselect all currently selected villagers
      this.clearSelection();
    }
    
    // Add to selection
    this.addToSelection(villager);
    
    // Hide build menu when selecting new villagers
    const buildMenu = document.getElementById('build-menu');
    if (buildMenu) {
      buildMenu.style.display = 'none';
    }
  }
  
  private updateSelectionCountDisplay(): void {
    const countElement = document.getElementById('villager-selection-count');
    if (countElement) {
      countElement.textContent = `Villagers: ${this.selectedVillagers.length}`;
    }
  }
  
  public createVillager(x: number, y: number): Villager {
    const pos = this.isoUtils.toScreen(x, y);
    
    // Create villager sprite
    const villagerContainer = new PIXI.Container();
    villagerContainer.x = pos.x;
    villagerContainer.y = pos.y;
    
    // Set zIndex based on y-coordinate for proper depth sorting
    villagerContainer.zIndex = y;
    
    const villagerSprite = new PIXI.Graphics();
    
    // Body
    villagerSprite.beginFill(COLORS.VILLAGER_BODY);
    villagerSprite.drawCircle(TILE_WIDTH / 2, TILE_HEIGHT / 3, 10);
    villagerSprite.endFill();
    
    // Head
    villagerSprite.beginFill(COLORS.VILLAGER_HEAD);
    villagerSprite.drawCircle(TILE_WIDTH / 2, TILE_HEIGHT / 6, 5);
    villagerSprite.endFill();
    
    // Selection indicator (initially hidden)
    const selectionRing = new PIXI.Graphics();
    selectionRing.lineStyle(2, COLORS.SELECTION_RING);
    selectionRing.drawCircle(TILE_WIDTH / 2, TILE_HEIGHT / 3, 15);
    selectionRing.visible = false;
    
    // Health bar (background)
    const healthBarBg = new PIXI.Graphics();
    healthBarBg.beginFill(0xFF0000);
    healthBarBg.drawRect(TILE_WIDTH / 4, -10, TILE_WIDTH / 2, 4);
    healthBarBg.endFill();
    
    // Health bar (foreground)
    const healthBar = new PIXI.Graphics();
    healthBar.beginFill(0x00FF00);
    healthBar.drawRect(TILE_WIDTH / 4, -10, TILE_WIDTH / 2, 4);
    healthBar.endFill();
    
    villagerContainer.addChild(villagerSprite);
    villagerContainer.addChild(selectionRing);
    villagerContainer.addChild(healthBarBg);
    villagerContainer.addChild(healthBar);
    
    // Make villager interactive
    villagerContainer.interactive = true;
    villagerContainer.cursor = 'pointer';
    
    // Create villager object
    const villager: Villager = {
      sprite: villagerContainer,
      selectionRing: selectionRing,
      selectionFlag: null,
      selectionAnimation: null,
      healthBar: healthBar,
      health: 25,
      maxHealth: 25,
      x: x,
      y: y,
      pixelX: pos.x,
      pixelY: pos.y,
      targetX: x,
      targetY: y,
      moving: false,
      speed: VILLAGER_SPEED,
      path: [],
      task: null
    };
    
    // Add click event
    villagerContainer.on('pointerdown', (event) => {
      // Access the native event for checking modifier keys
      const nativeEvent = event.nativeEvent as PointerEvent;
      const isCtrlPressed = nativeEvent.ctrlKey || nativeEvent.metaKey;
      
      this.selectVillager(villager, isCtrlPressed);
      
      // Stop event propagation to prevent map click
      event.stopPropagation();
    });
    
    this.unitLayer.addChild(villagerContainer);
    this.villagers.push(villager);
    
    // Update health bar
    this.updateHealthBar(villager);
    
    return villager;
  }
  
  public updateHealthBar(villager: Villager): void {
    const healthPercent = villager.health / villager.maxHealth;
    villager.healthBar.clear();
    villager.healthBar.beginFill(healthPercent > 0.5 ? 0x00FF00 : (healthPercent > 0.25 ? 0xFFFF00 : 0xFF0000));
    villager.healthBar.drawRect(TILE_WIDTH / 4, -10, (TILE_WIDTH / 2) * healthPercent, 4);
    villager.healthBar.endFill();
  }

  public moveVillagerTo(villager: Villager, targetX: number, targetY: number, callback?: () => void): void {
    this.moveVillager(villager, targetX, targetY, callback);
  }
  
  public moveVillager(villager: Villager, targetX: number, targetY: number, callback?: () => void): void {
    console.log(`Moving villager to: x=${targetX}, y=${targetY}`);
    
    // Validate target coordinates
    if (targetX === undefined || targetY === undefined || isNaN(targetX) || isNaN(targetY)) {
      console.error('Invalid target coordinates', { targetX, targetY });
      return;
    }
    
    // Ensure target is within map bounds
    const clampedX = Math.max(0, Math.min(targetX, 19));
    const clampedY = Math.max(0, Math.min(targetY, 19));
    
    // Find path to target
    const pathFinder = new PathFinder(this.gameMap);
    const path = pathFinder.findPath(villager.x, villager.y, clampedX, clampedY);
    
    // If no path found, try to get adjacent walkable tile
    if (path.length === 0) {
      const adjacentTile = this.gameMap.getAdjacentWalkableTile(clampedX, clampedY);
      if (adjacentTile) {
        const newPath = pathFinder.findPath(villager.x, villager.y, adjacentTile.x, adjacentTile.y);
        if (newPath.length > 0) {
          path.push(...newPath);
        }
      }
    }
    
    // No path found at all
    if (path.length === 0) {
      console.warn('Unable to find path to target', { targetX, targetY });
      return;
    }
    
    // Use the final position from the path
    const finalTarget = path[path.length - 1];
    
    // Set target position
    villager.targetX = finalTarget.x;
    villager.targetY = finalTarget.y;
    villager.moving = true;
    villager.path = path;
    
    // Set callback to execute when destination reached
    if (callback) {
      villager.task = {
        type: 'move',
        target: { x: finalTarget.x, y: finalTarget.y },
        callback
      };
    } else {
      villager.task = {
        type: 'move',
        target: { x: finalTarget.x, y: finalTarget.y }
      };
    }
  }
  
  public moveSelectedVillagersToPoint(targetX: number, targetY: number): void {
    if (this.selectedVillagers.length === 0) return;
    
    // For multiple units, we'll calculate positions around the target point
    if (this.selectedVillagers.length === 1) {
      // For single unit, just move directly to target
      this.moveVillager(this.selectedVillagers[0], targetX, targetY);
      return;
    }
    
    // Generate positions in a circle around the target point
    const positions = this.generateFormationPositions(targetX, targetY, this.selectedVillagers.length);
    
    // Assign each villager a position
    for (let i = 0; i < this.selectedVillagers.length; i++) {
      const targetPos = positions[i];
      if (targetPos && this.gameMap.isTileWalkable(targetPos.x, targetPos.y)) {
        this.moveVillager(this.selectedVillagers[i], targetPos.x, targetPos.y);
      } else {
        // If position is not walkable, find a nearby walkable tile
        const nearbyPos = this.gameMap.getAdjacentWalkableTile(targetX, targetY);
        if (nearbyPos) {
          this.moveVillager(this.selectedVillagers[i], nearbyPos.x, nearbyPos.y);
        }
      }
    }
  }
  
  private generateFormationPositions(centerX: number, centerY: number, count: number): GridPosition[] {
    const positions: GridPosition[] = [];
    
    // First position is the center
    positions.push({ x: centerX, y: centerY });
    
    if (count === 1) return positions;
    
    // Generate positions in a circular formation
    const radius = Math.ceil(Math.sqrt(count) / 2);
    let added = 1;
    
    for (let r = 1; r <= radius && added < count; r++) {
      // Add positions in concentric rings
      for (let i = -r; i <= r && added < count; i++) {
        for (let j = -r; j <= r && added < count; j++) {
          // Only add positions on the perimeter of the ring
          if (Math.abs(i) === r || Math.abs(j) === r) {
            const x = centerX + i;
            const y = centerY + j;
            
            // Only add if within map bounds
            if (x >= 0 && x < 20 && y >= 0 && y < 20) {
              // Skip the center which was already added
              if (!(i === 0 && j === 0)) {
                positions.push({ x, y });
                added++;
              }
            }
          }
        }
      }
    }
    
    return positions;
  }
  
  public moveVillagerNear(villager: Villager, targetX: number, targetY: number, callback?: () => void): void {
    // Potential adjacent tiles around the foundation
    const potentialTiles: GridPosition[] = [
      { x: targetX - 1, y: targetY },     // Left
      { x: targetX + 1, y: targetY },     // Right
      { x: targetX, y: targetY - 1 },     // Top
      { x: targetX, y: targetY + 1 },     // Bottom
      { x: targetX - 1, y: targetY - 1 }, // Top-Left
      { x: targetX + 1, y: targetY - 1 }, // Top-Right
      { x: targetX - 1, y: targetY + 1 }, // Bottom-Left
      { x: targetX + 1, y: targetY + 1 }  // Bottom-Right
    ];

    // Find all walkable tiles
    const walkableTiles = potentialTiles.filter(tile => 
      tile.x >= 0 && tile.x < 20 && 
      tile.y >= 0 && tile.y < 20 && 
      this.gameMap.isTileWalkable(tile.x, tile.y)
    );

    // If no walkable tiles, log error and return
    if (walkableTiles.length === 0) {
      console.error('No walkable tiles found near foundation', { targetX, targetY });
      return;
    }

    // Precise distance calculation with multiple tie-breakers
    const closestTile = walkableTiles.reduce((closest, current) => {
      // Euclidean distance
      const closestDist = Math.sqrt(
        Math.pow(closest.x - targetX, 2) + Math.pow(closest.y - targetY, 2)
      );
      const currentDist = Math.sqrt(
        Math.pow(current.x - targetX, 2) + Math.pow(current.y - targetY, 2)
      );

      // Compare distances with multiple tie-breakers
      if (currentDist < closestDist) return current;
      if (currentDist > closestDist) return closest;

      // If distances are equal, prefer tiles closer to villager's current position
      const closestVillagerDist = Math.sqrt(
        Math.pow(closest.x - villager.x, 2) + Math.pow(closest.y - villager.y, 2)
      );
      const currentVillagerDist = Math.sqrt(
        Math.pow(current.x - villager.x, 2) + Math.pow(current.y - villager.y, 2)
      );

      // If villager distances are equal, prefer bottom-right quadrant
      if (currentVillagerDist < closestVillagerDist) return current;
      if (currentVillagerDist > closestVillagerDist) return closest;

      // Final tie-breaker: prefer bottom-right
      return (current.x > closest.x || current.y > closest.y) ? current : closest;
    });

    // Move to the closest walkable tile
    this.moveVillager(villager, closestTile.x, closestTile.y, callback);
  }
  
  public updateVillagers(delta: number): void {
    // First, update positions for all moving villagers
    const movedVillagers = new Set<Villager>();
    
    // Process movement for all villagers first
    for (const villager of this.villagers) {
      if (villager.moving && villager.path && villager.path.length > 0) {
        // Get next waypoint in the path
        const nextWaypoint = villager.path[0];
        
        // Calculate direction to next waypoint
        const dx = nextWaypoint.x - villager.x;
        const dy = nextWaypoint.y - villager.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If very close to waypoint, move to it exactly
        if (distance < 0.1) {
          villager.x = nextWaypoint.x;
          villager.y = nextWaypoint.y;
          
          // Remove this waypoint from path
          villager.path.shift();
          
          // Update sprite position
          const pos = this.isoUtils.toScreen(villager.x, villager.y);
          villager.sprite.x = pos.x;
          villager.sprite.y = pos.y;
          
          // Update zIndex for proper depth sorting
          villager.sprite.zIndex = villager.y;
          
          // If path is now empty, we've reached destination
          if (villager.path.length === 0) {
            villager.moving = false;
            
            // Execute callback if exists
            if (villager.task && villager.task.callback) {
              const callback = villager.task.callback;
              villager.task = null;
              callback();
            }
            
            movedVillagers.add(villager);
          }
        } else {
          // Move towards waypoint
          const speed = villager.speed * delta / 60;
          const moveDistance = Math.min(distance, speed);
          const angle = Math.atan2(dy, dx);
          
          // Calculate new position
          let newX = villager.x + Math.cos(angle) * moveDistance;
          let newY = villager.y + Math.sin(angle) * moveDistance;
          
          // Validate and update position
          const nextX = Math.floor(newX);
          const nextY = Math.floor(newY);
          
          // Check if the position is walkable
          if (this.gameMap.isTileWalkable(nextX, nextY)) {
            villager.x = newX;
            villager.y = newY;
            
            // Update sprite position
            const pos = this.isoUtils.toScreen(villager.x, villager.y);
            villager.sprite.x = pos.x;
            villager.sprite.y = pos.y;
            
            // Update zIndex for proper depth sorting
            villager.sprite.zIndex = villager.y;
          }
        }
      }
    }
    
    // Build task handling
    this.handleVillagerBuildTasks(delta);
  }
  
  private handleVillagerBuildTasks(delta: number): void {
    this.villagers.forEach(villager => {
      // Check if villager has a current build task
      if (villager.currentBuildTask && villager.currentBuildTask.type === 'wall') {
        const foundation = villager.currentBuildTask.foundation;
        const buildPosition = villager.currentBuildTask.buildPosition;
        
        // Find the corresponding wall foundation in the game map
        const wallFoundations = this.gameMap.getWallFoundations();
        const matchingFoundation = wallFoundations.find(
          f => f.x === foundation.x && f.y === foundation.y
        );
        
        // Check if villager is at their assigned build position - use more lenient distance check
        if (matchingFoundation && buildPosition) {
          const dx = Math.abs(villager.x - buildPosition.x);
          const dy = Math.abs(villager.y - buildPosition.y);
          
          // Use a more lenient distance threshold (0.8 instead of 0.5)
          // This will help ensure villagers can start building from any direction
          if (dx < 0.8 && dy < 0.8) {
            console.log("Villager at build position, starting to build");
            matchingFoundation.isBuilding = true;
          }
        }
        
        // If foundation is completed or removed, clear the build task
        if (!matchingFoundation || matchingFoundation.status === 'complete') {
          // Release the build position
          if (matchingFoundation && buildPosition) {
            this.gameMap.wallManager.releaseBuildPosition(matchingFoundation, buildPosition);
          }
          
          // Clear the build task
          villager.currentBuildTask = undefined;
        }
      }
    });
  }
  
  
  public getAllVillagers(): Villager[] {
    return this.villagers;
  }
  
  public isAdjacentToVillager(villager: Villager, x: number, y: number): boolean {
    return this.isoUtils.isAdjacentToVillager(villager, x, y);
  }

  private isAdjacentToFoundation(villager: Villager, foundation: WallFoundation): boolean {
    // If the villager has a specific build position, use that instead
    if (villager.currentBuildTask && 
        villager.currentBuildTask.buildPosition && 
        villager.currentBuildTask.foundation.x === foundation.x && 
        villager.currentBuildTask.foundation.y === foundation.y) {
      
      const buildPos = villager.currentBuildTask.buildPosition;
      const dx = Math.abs(villager.x - buildPos.x);
      const dy = Math.abs(villager.y - buildPos.y);
      return dx < 0.5 && dy < 0.5; // At the exact build position
    }
    
    // Otherwise use the standard adjacency check
    const dx = Math.abs(villager.x - foundation.x);
    const dy = Math.abs(villager.y - foundation.y);
    
    // Check if villager is in an adjacent tile in any direction
    return (
      (dx <= 1 && dy <= 1) && // Within adjacent tiles
      !(dx === 0 && dy === 0) // Not on the same exact tile
    );
  }

  private findClosestFoundationEdge(villager: Villager, foundation: WallFoundation): { x: number, y: number } | null {
    // Possible adjacent positions relative to foundation
    const adjacentPositions = [
      { x: foundation.x - 1, y: foundation.y },     // Left
      { x: foundation.x + 1, y: foundation.y },     // Right
      { x: foundation.x, y: foundation.y - 1 },     // Top
      { x: foundation.x, y: foundation.y + 1 },     // Bottom
      { x: foundation.x - 1, y: foundation.y - 1 }, // Top-Left
      { x: foundation.x + 1, y: foundation.y - 1 }, // Top-Right
      { x: foundation.x - 1, y: foundation.y + 1 }, // Bottom-Left
      { x: foundation.x + 1, y: foundation.y + 1 }  // Bottom-Right
    ];
    
    // Find the closest adjacent position to the villager
    return adjacentPositions.find(pos => 
      Math.abs(villager.x - pos.x) <= 1 && 
      Math.abs(villager.y - pos.y) <= 1 &&
      this.gameMap.isTileWalkable(pos.x, pos.y)
    ) || null;
  }
}