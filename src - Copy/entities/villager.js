import * as PIXI from 'pixi.js';
import { 
  VILLAGER_VISUAL_SIZE, 
  TILE_WIDTH, 
  TILE_HEIGHT,
  COLORS,
  VILLAGER_SPEED
} from '../constants/gameConstants';
import { gridToScreen } from '../utils/isometric';
import { checkVillagerCollision } from '../utils/collision';

class Villager {
  constructor(x, y, offsetX, offsetY) {
    this.gridX = x;
    this.gridY = y;
    this.targetX = x;
    this.targetY = y;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.moving = false;
    this.buildMode = false;
    this.building = false;
    this.buildingId = null;
    this.shiftQueue = [];
    this.safe = true;

    // Create container for villager elements
    this.container = new PIXI.Container();
    
    // Visual size calculation
    this.visualWidth = TILE_WIDTH * VILLAGER_VISUAL_SIZE;
    this.visualHeight = TILE_HEIGHT * VILLAGER_VISUAL_SIZE * 3; // Taller than wide
    
    // Build indicator
    this.buildIndicator = new PIXI.Graphics();
    this.buildIndicator.beginFill(0xFFD700);
    this.buildIndicator.drawCircle(0, -30, 8);
    this.buildIndicator.endFill();
    this.buildIndicator.visible = false;
    this.container.addChild(this.buildIndicator);

    // Building indicator
    this.buildingIndicator = new PIXI.Graphics();
    this.buildingIndicator.beginFill(0xFF6600);
    this.buildingIndicator.drawCircle(0, -30, 8);
    this.buildingIndicator.endFill();
    this.buildingIndicator.visible = false;
    this.container.addChild(this.buildingIndicator);
    
    // Villager body
    this.body = new PIXI.Graphics();
    this.updateAppearance();
    this.container.addChild(this.body);
    
    // Position the container
    this.updatePosition();
  }

  updateAppearance() {
    this.body.clear();
    
    // Draw head
    this.body.beginFill(this.safe ? COLORS.VILLAGER_HEAD : 0xFF7F7F);
    this.body.drawCircle(0, -20, 6);
    this.body.endFill();
    
    // Draw body
    this.body.beginFill(this.safe ? COLORS.VILLAGER_BODY : 0xAA3333);
    this.body.drawRoundedRect(-8, -14, 16, 24, 4);
    this.body.endFill();
    
    // Draw feet
    this.body.beginFill(0x654321);
    this.body.drawRect(-8, 10, 16, 5);
    this.body.endFill();
  }

  updatePosition() {
    const { x, y } = gridToScreen(this.gridX, this.gridY, this.offsetX, this.offsetY);
    this.container.x = x;
    this.container.y = y;
    this.container.zIndex = Math.round(this.gridY * 10); // For proper layering
  }

  setTarget(x, y, useShiftQueue = false) {
    this.targetX = x;
    this.targetY = y;
    this.moving = true;
    
    if (!useShiftQueue) {
      this.shiftQueue = [];
    }
  }

  addToQueue(x, y) {
    this.shiftQueue.push({ x, y });
  }

  toggleBuildMode() {
    this.buildMode = !this.buildMode;
    this.buildIndicator.visible = this.buildMode;
  }

  startBuilding(foundationId) {
    this.building = true;
    this.buildingId = foundationId;
    this.buildingIndicator.visible = true;
    this.buildIndicator.visible = false;
  }

  stopBuilding() {
    this.building = false;
    this.buildingId = null;
    this.buildingIndicator.visible = false;
  }

  processNextQueueItem() {
    if (this.shiftQueue.length === 0) {
      this.stopBuilding();
      return;
    }
    
    const nextTarget = this.shiftQueue.shift();
    this.setTarget(nextTarget.x, nextTarget.y, true);
    this.stopBuilding();
  }

  cancelAll() {
    this.stopBuilding();
    this.buildMode = false;
    this.buildIndicator.visible = false;
    this.shiftQueue = [];
  }

  setUnderAttack() {
    this.safe = false;
    this.updateAppearance();
  }

  update(deltaTime, walls, enemies, foundations) {
    // If building or not moving or already at target, do nothing
    if (this.building || !this.moving || (this.gridX === this.targetX && this.gridY === this.targetY)) {
      this.moving = false;
      return;
    }

    // Calculate direction
    const dx = this.targetX - this.gridX;
    const dy = this.targetY - this.gridY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Calculate movement for this frame
    const moveDistance = Math.min(distance, VILLAGER_SPEED * deltaTime);
    
    // If very close to target, snap to it
    if (moveDistance < 0.05) {
      this.gridX = this.targetX;
      this.gridY = this.targetY;
      this.moving = false;
      
      // Update position
      this.updatePosition();
      
      // Check if there's a foundation to build
      const foundationToBuild = this.findNearestFoundation(foundations);
      if (foundationToBuild) {
        this.startBuilding(foundationToBuild.id);
      }
      
      return;
    }
    
    // Calculate new position
    const newX = this.gridX + (dx / distance) * moveDistance;
    const newY = this.gridY + (dy / distance) * moveDistance;
    
    // Check for collisions
    if (!checkVillagerCollision(newX, newY, walls, enemies)) {
      this.gridX = newX;
      this.gridY = newY;
      this.updatePosition();
    } else {
      this.moving = false;
    }
  }

  findNearestFoundation(foundations) {
    const vx = Math.round(this.gridX);
    const vy = Math.round(this.gridY);
    
    // Find adjacent foundations
    return foundations.find(foundation => {
      return Math.abs(vx - foundation.x) <= 1 && 
             Math.abs(vy - foundation.y) <= 1 && 
             !(vx === foundation.x && vy === foundation.y);
    });
  }

  reset(x, y) {
    this.gridX = x;
    this.gridY = y;
    this.targetX = x;
    this.targetY = y;
    this.moving = false;
    this.buildMode = false;
    this.building = false;
    this.buildingId = null;
    this.shiftQueue = [];
    this.safe = true;
    this.buildIndicator.visible = false;
    this.buildingIndicator.visible = false;
    this.updateAppearance();
    this.updatePosition();
  }
}

export default Villager;
