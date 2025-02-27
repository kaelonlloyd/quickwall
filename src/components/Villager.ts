import * as PIXI from 'pixi.js';
import { COLORS, TILE_HEIGHT, TILE_WIDTH, VILLAGER_SPEED } from '../constants';
import { GridPosition, Villager, VillagerTask } from '../types';
import { IsometricUtils } from '../utils/IsometricUtils';
import { GameMap } from './Map';

export class VillagerManager {
  private villagers: Villager[];
  private unitLayer: PIXI.Container;
  private isoUtils: IsometricUtils;
  private selectedVillagers: Villager[];
  private gameMap: GameMap;
  private selectionCountText: PIXI.Text;
  
  constructor(unitLayer: PIXI.Container, isoUtils: IsometricUtils, gameMap: GameMap) {
    this.villagers = [];
    this.unitLayer = unitLayer;
    this.isoUtils = isoUtils;
    this.selectedVillagers = [];
    this.gameMap = gameMap;
    
    // Create selection count text
    this.selectionCountText = new PIXI.Text('Villagers: 0', {
      fontSize: 16,
      fill: 0xFFFFFF,
      fontFamily: 'Arial',
      dropShadow: {
        alpha: 1,
        angle: Math.PI / 6,
        blur: 2,
        color: 0x000000,
        distance: 3
      }
    });
    this.selectionCountText.x = 10;
    this.selectionCountText.y = window.innerHeight - 40;
    document.addEventListener('DOMContentLoaded', () => {
      const app = document.querySelector('canvas');
      if (app && app.parentNode) {
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
        app.parentNode.appendChild(textContainer);
      }
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
      // In PIXI v8, we need to access the native event differently
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
    
    // Set target position
    villager.targetX = clampedX;
    villager.targetY = clampedY;
    villager.moving = true;
    
    // Set callback to execute when destination reached
    if (callback) {
      villager.task = {
        type: 'move',
        target: { x: clampedX, y: clampedY },
        callback
      };
    } else {
      villager.task = {
        type: 'move',
        target: { x: clampedX, y: clampedY }
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
    // Find an adjacent walkable tile
    const adjacentTile = this.gameMap.getAdjacentWalkableTile(targetX, targetY);
    
    if (adjacentTile) {
      this.moveVillager(villager, adjacentTile.x, adjacentTile.y, callback);
    } else {
      console.warn('No walkable adjacent tile found', { targetX, targetY });
    }
  }
  
  public updateVillagers(delta: number): void {
    // First, update positions for all moving villagers
    const movedVillagers = new Set<Villager>();
    
    // Process movement for all villagers first
    for (const villager of this.villagers) {
      if (villager.moving) {
        // Validate target coordinates
        if (isNaN(villager.targetX) || isNaN(villager.targetY)) {
          console.error('Invalid target coordinates during update', {
            targetX: villager.targetX, 
            targetY: villager.targetY
          });
          villager.moving = false;
          continue;
        }

        // Calculate direction to target
        const dx = villager.targetX - villager.x;
        const dy = villager.targetY - villager.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 0.1) {
          // Target reached
          villager.x = villager.targetX;
          villager.y = villager.targetY;
          villager.moving = false;
          
          // Update sprite position
          const pos = this.isoUtils.toScreen(villager.x, villager.y);
          villager.sprite.x = pos.x;
          villager.sprite.y = pos.y;
          
          // Execute callback if exists
          if (villager.task && villager.task.callback) {
            const callback = villager.task.callback;
            villager.task = null;
            callback();
          }
          
          movedVillagers.add(villager);
        } else {
          // Potential new position calculation
          const speed = villager.speed * delta / 60;
          const moveDistance = Math.min(distance, speed);
          const angle = Math.atan2(dy, dx);
          
          // Calculate new position
          let newX = villager.x + Math.cos(angle) * moveDistance;
          let newY = villager.y + Math.sin(angle) * moveDistance;
          
          // Store the intended position
          villager.intendedX = newX;
          villager.intendedY = newY;
        }
      }
    }
    
    // Now resolve collisions between villagers
    for (const villager of this.villagers) {
      if (villager.moving && !movedVillagers.has(villager)) {
        if (villager.intendedX === undefined || villager.intendedY === undefined) {
          continue;
        }
        
        const newX = villager.intendedX;
        const newY = villager.intendedY;
        
        // Validate and round coordinates
        const nextX = Math.floor(newX);
        const nextY = Math.floor(newY);
        
        // Check if the position is walkable on the map
        if (!this.gameMap.isTileWalkable(nextX, nextY)) {
          villager.moving = false;
          continue;
        }
        
        // Check for collisions with other villagers at the intended position
        const collidingVillagers = this.findCollidingVillagers(newX, newY, villager);
        
        if (collidingVillagers.length === 0) {
          // No collision, safe to move
          villager.x = newX;
          villager.y = newY;
          
          // Update sprite position
          const pos = this.isoUtils.toScreen(villager.x, villager.y);
          villager.sprite.x = pos.x;
          villager.sprite.y = pos.y;
          
          movedVillagers.add(villager);
        } else {
          // We have a collision
          let canMove = false;
          
          // If all colliding villagers are already at their target position,
          // consider this one "arrived" if it's close enough
          const allAtTarget = collidingVillagers.every(v => !v.moving);
          
          // Calculate distance to target
          const dx = villager.targetX - villager.x;
          const dy = villager.targetY - villager.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (allAtTarget && distance < 1.0) {
            // Consider the villager has reached its destination
            villager.moving = false;
            
            // Execute callback if exists
            if (villager.task && villager.task.callback) {
              const callback = villager.task.callback;
              villager.task = null;
              callback();
            }
            
            movedVillagers.add(villager);
          } else {
            // Try to find an alternative path around the obstacle
            const alternativePath = this.findAlternativePath(villager, collidingVillagers);
            
            if (alternativePath) {
              villager.x = alternativePath.x;
              villager.y = alternativePath.y;
              
              // Update sprite position
              const pos = this.isoUtils.toScreen(villager.x, villager.y);
              villager.sprite.x = pos.x;
              villager.sprite.y = pos.y;
              
              movedVillagers.add(villager);
            } else {
              // If we couldn't find any valid movement, wait in place
              // Don't stop movement altogether, just wait for a frame
            }
          }
        }
      }
    }
    
    // Clear intended positions after processing
    for (const villager of this.villagers) {
      delete villager.intendedX;
      delete villager.intendedY;
    }
  }
  
  private findCollidingVillagers(x: number, y: number, currentVillager: Villager): Villager[] {
    const collidingVillagers: Villager[] = [];
    const tolerance = 0.4; // Slightly reduced collision radius
    
    for (const villager of this.villagers) {
      if (villager === currentVillager) continue;
      
      const dx = Math.abs(villager.x - x);
      const dy = Math.abs(villager.y - y);
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < tolerance) {
        collidingVillagers.push(villager);
      }
    }
    
    return collidingVillagers;
  }
  
  private findAlternativePath(
    villager: Villager,
    obstacles: Villager[]
  ): { x: number, y: number } | null {
    // Get the direction to the target
    const dx = villager.targetX - villager.x;
    const dy = villager.targetY - villager.y;
    const originalAngle = Math.atan2(dy, dx);
    
    // Try different angles to find a clear path
    const angleOffsets = [
      Math.PI / 12, -Math.PI / 12,  // Small angles first
      Math.PI / 8, -Math.PI / 8,    // Slightly larger angles
      Math.PI / 6, -Math.PI / 6,    // Even larger
      Math.PI / 4, -Math.PI / 4     // Largest turn angles
    ];
    
    // Try each angle offset
    for (const offset of angleOffsets) {
      const newAngle = originalAngle + offset;
      const moveDistance = 0.1; // Small step size
      
      const newX = villager.x + Math.cos(newAngle) * moveDistance;
      const newY = villager.y + Math.sin(newAngle) * moveDistance;
      
      // Check if this new position collides with any obstacles
      if (
        this.gameMap.isTileWalkable(Math.floor(newX), Math.floor(newY)) && 
        this.findCollidingVillagers(newX, newY, villager).length === 0
      ) {
        return { x: newX, y: newY };
      }
    }
    
    // As a fallback, try to move away from all obstacles
    if (obstacles.length > 0) {
      let avoidX = 0;
      let avoidY = 0;
      
      // Calculate average direction to move away from obstacles
      for (const obstacle of obstacles) {
        avoidX += villager.x - obstacle.x;
        avoidY += villager.y - obstacle.y;
      }
      
      // Normalize the avoidance vector
      const avoidMagnitude = Math.sqrt(avoidX * avoidX + avoidY * avoidY);
      if (avoidMagnitude > 0) {
        avoidX /= avoidMagnitude;
        avoidY /= avoidMagnitude;
        
        // Try to move a small step in the avoidance direction
        const newX = villager.x + avoidX * 0.05;
        const newY = villager.y + avoidY * 0.05;
        
        if (
          this.gameMap.isTileWalkable(Math.floor(newX), Math.floor(newY)) && 
          this.findCollidingVillagers(newX, newY, villager).length === 0
        ) {
          return { x: newX, y: newY };
        }
      }
    }
    
    return null; // No valid alternative found
  }
  
  public isAdjacentToVillager(villager: Villager, x: number, y: number): boolean {
    return this.isoUtils.isAdjacentToVillager(villager, x, y);
  }
  
  public getAllVillagers(): Villager[] {
    return this.villagers;
  }
}