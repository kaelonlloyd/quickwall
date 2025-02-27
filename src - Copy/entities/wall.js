import * as PIXI from 'pixi.js';
import { 
  TILE_WIDTH, 
  TILE_HEIGHT,
  COLORS 
} from '../constants/gameConstants';
import { gridToScreen, drawIsoCube } from '../utils/isometric';

class Wall {
  constructor(id, x, y, offsetX, offsetY) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.health = 100;
    
    // Create the graphics
    this.graphics = new PIXI.Graphics();
    this.draw();
    
    // Position the graphics
    this.updatePosition();
  }
  
  draw() {
    this.graphics.clear();
    
    const { x, y } = gridToScreen(this.x, this.y, 0, 0);
    
    // Wall is a cube that sits on the tile
    const wallHeight = TILE_HEIGHT * 1.5;
    
    drawIsoCube(
      this.graphics,
      x,
      y,
      TILE_WIDTH,
      TILE_HEIGHT,
      wallHeight,
      COLORS.WALL_TOP,
      COLORS.WALL_LEFT,
      COLORS.WALL_RIGHT
    );
  }
  
  updatePosition() {
    const { x, y } = gridToScreen(this.x, this.y, this.offsetX, this.offsetY);
    this.graphics.x = 0;
    this.graphics.y = -TILE_HEIGHT * 0.75; // Move it up to sit on the tile
    this.graphics.position.set(x, y);
    this.graphics.zIndex = Math.round(this.y * 10) + 5; // Higher than tiles, lower than entities
  }
  
  takeDamage(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      return true; // Wall is destroyed
    }
    return false;
  }
}

export default Wall;
