import * as PIXI from 'pixi.js';
import { 
  ENEMY_VISUAL_SIZE, 
  TILE_WIDTH, 
  TILE_HEIGHT,
  COLORS 
} from '../constants/gameConstants';
import { gridToScreen } from '../utils/isometric';
import { checkEnemyWallCollision, checkEnemyEnemyCollision, distance } from '../utils/collision';

class Enemy {
  constructor(id, x, y, speed, offsetX, offsetY) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.speed = speed;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    
    // Visual size calculation
    this.visualWidth = TILE_WIDTH * ENEMY_VISUAL_SIZE;
    this.visualHeight = TILE_HEIGHT * ENEMY_VISUAL_SIZE * 2.5; // Taller than wide
    
    // Create the graphics
    this.container = new PIXI.Container();
    
    // Enemy body
    this.graphics = new PIXI.Graphics();
    
    // Draw head
    this.graphics.beginFill(COLORS.ENEMY_HEAD);
    this.graphics.drawCircle(0, -18, 5);
    this.graphics.endFill();
    
    // Draw body
    this.graphics.beginFill(COLORS.ENEMY_BODY);
    this.graphics.drawRoundedRect(-6, -13, 12, 20, 3);
    this.graphics.endFill();
    
    // Add overlay for shading
    this.graphics.beginFill(0x000000, 0.3);
    this.graphics.drawRoundedRect(-6, -13, 12, 20, 3);
    this.graphics.endFill();
    
    this.container.addChild(this.graphics);
    
    // Position the container
    this.updatePosition();
  }
  
  updatePosition() {
    const { x, y } = gridToScreen(this.x, this.y, this.offsetX, this.offsetY);
    this.container.x = x;
    this.container.y = y;
    this.container.zIndex = Math.round(this.y * 10); // For proper layering
  }
  
  update(deltaTime, villager, walls, enemies) {
    // Calculate direction towards villager
    const dx = villager.gridX - this.x;
    const dy = villager.gridY - this.y;
    const dist = distance(this.x, this.y, villager.gridX, villager.gridY);
    
    if (dist < 0.1) return; // Prevent division by zero
    
    // Calculate movement for this frame
    const moveDistance = Math.min(dist, this.speed * deltaTime);
    const newX = this.x + (dx / dist) * moveDistance;
    const newY = this.y + (dy / dist) * moveDistance;
    
    // Check for collisions
    if (checkEnemyWallCollision(newX, newY, walls)) {
      return;
    }
    
    if (checkEnemyEnemyCollision(newX, newY, this.id, enemies)) {
      return;
    }
    
    // Update position
    this.x = newX;
    this.y = newY;
    this.updatePosition();
  }
}

export default Enemy;
