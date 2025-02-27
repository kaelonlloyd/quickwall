import * as PIXI from 'pixi.js';
import { COLORS, TILE_HEIGHT, TILE_WIDTH, VILLAGER_SPEED } from '../constants';
import { GridPosition, Villager } from '../types';
import { IsometricUtils } from '../utils/IsometricUtils';
import { GameMap } from './Map';

export class VillagerManager {
  private villagers: Villager[];
  private unitLayer: PIXI.Container;
  private isoUtils: IsometricUtils;
  private selectedVillager: Villager | null;
  private gameMap: GameMap;
  
  constructor(unitLayer: PIXI.Container, isoUtils: IsometricUtils, gameMap: GameMap) {
    this.villagers = [];
    this.unitLayer = unitLayer;
    this.isoUtils = isoUtils;
    this.selectedVillager = null;
    this.gameMap = gameMap;
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
    
    villagerContainer.addChild(villagerSprite);
    villagerContainer.addChild(selectionRing);
    
    // Make villager interactive
    villagerContainer.interactive = true;
    villagerContainer.cursor = 'pointer';
    
    // Add click event
    villagerContainer.on('pointerdown', () => {
      this.selectVillager(villager);
    });
    
    this.unitLayer.addChild(villagerContainer);
    
    // Create villager object
    const villager: Villager = {
      sprite: villagerContainer,
      selectionRing: selectionRing,
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
    
    this.villagers.push(villager);
    return villager;
  }
  
  public selectVillager(villager: Villager): void {
    // Deselect previous villager if any
    if (this.selectedVillager) {
      this.selectedVillager.selectionRing.visible = false;
    }
    
    // Select new villager
    this.selectedVillager = villager;
    villager.selectionRing.visible = true;
    
    // Hide build menu when selecting a new villager
    const buildMenu = document.getElementById('build-menu');
    if (buildMenu) {
      buildMenu.style.display = 'none';
    }
  }
  
  public getSelectedVillager(): Villager | null {
    return this.selectedVillager;
  }
  
  public moveVillager(villager: Villager, targetX: number, targetY: number, callback?: () => void): void {
    // Set target position
    villager.targetX = targetX;
    villager.targetY = targetY;
    villager.moving = true;
    
    // Set callback to execute when destination reached
    if (callback) {
      villager.task = {
        type: 'move',
        target: { x: targetX, y: targetY },
        callback
      };
    } else {
      villager.task = {
        type: 'move',
        target: { x: targetX, y: targetY }
      };
    }
  }
  
  public moveVillagerNear(villager: Villager, targetX: number, targetY: number, callback?: () => void): void {
    // Find an adjacent walkable tile
    const adjacentTile = this.gameMap.getAdjacentWalkableTile(targetX, targetY);
    
    if (adjacentTile) {
      this.moveVillager(villager, adjacentTile.x, adjacentTile.y, callback);
    }
  }
  
  public updateVillagers(delta: number): void {
    for (const villager of this.villagers) {
      if (villager.moving) {
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
        } else {
          // Move towards target
          const speed = villager.speed * delta / 60;
          const moveDistance = Math.min(distance, speed);
          const angle = Math.atan2(dy, dx);
          
          // Calculate new position
          const newX = villager.x + Math.cos(angle) * moveDistance;
          const newY = villager.y + Math.sin(angle) * moveDistance;
          
          // Check if the next position is walkable
          const nextX = Math.floor(newX);
          const nextY = Math.floor(newY);
          
          if (this.gameMap.isTileWalkable(nextX, nextY)) {
            villager.x = newX;
            villager.y = newY;
            
            // Update sprite position
            const pos = this.isoUtils.toScreen(villager.x, villager.y);
            villager.sprite.x = pos.x;
            villager.sprite.y = pos.y;
          } else {
            // If blocked, try to find another path (for now just stop)
            villager.moving = false;
          }
        }
      }
    }
  }
  
  public isAdjacentToVillager(villager: Villager, x: number, y: number): boolean {
    return this.isoUtils.isAdjacentToVillager(villager, x, y);
  }
}
