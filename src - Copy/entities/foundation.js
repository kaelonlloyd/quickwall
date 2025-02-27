import * as PIXI from 'pixi.js';
import { 
  TILE_WIDTH, 
  TILE_HEIGHT,
  COLORS,
  FONT_FAMILY
} from '../constants/gameConstants';
import { gridToScreen, drawIsoDiamond } from '../utils/isometric';

class Foundation {
  constructor(id, x, y, offsetX, offsetY) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.progress = 0;
    this.isBuilding = false;
    
    // Create container for foundation elements
    this.container = new PIXI.Container();
    
    // Create the outline
    this.outline = new PIXI.Graphics();
    this.container.addChild(this.outline);
    
    // Create progress fill
    this.fill = new PIXI.Graphics();
    this.container.addChild(this.fill);
    
    // Create progress text
    this.progressText = new PIXI.Text('0%', {
      fontFamily: FONT_FAMILY,
      fontSize: 12,
      fill: 0xFFFFFF,
      align: 'center',
      fontWeight: 'bold',
      dropShadow: true,
      dropShadowColor: 0x000000,
      dropShadowDistance: 1
    });
    this.progressText.anchor.set(0.5);
    this.progressText.visible = false;
    this.container.addChild(this.progressText);
    
    // Draw initial state
    this.updateAppearance();
    
    // Position the container
    this.updatePosition();
  }
  
  updateAppearance() {
    const { x, y } = gridToScreen(0, 0, 0, 0);
    
    // Draw outline
    this.outline.clear();
    this.outline.lineStyle(this.isBuilding ? 4 : 2, this.isBuilding ? 0xFFD700 : COLORS.FOUNDATION_OUTLINE);
    drawIsoDiamond(this.outline, x, y, TILE_WIDTH, TILE_HEIGHT);
    
    // Draw progress fill
    this.fill.clear();
    if (this.progress > 0) {
      this.fill.beginFill(COLORS.FOUNDATION_FILL, 0.6);
      
      // Only fill based on progress
      const fillHeight = (this.progress / 100) * TILE_HEIGHT;
      this.fill.moveTo(x, y + TILE_HEIGHT/2 - fillHeight);              // Bottom of fill
      this.fill.lineTo(x + TILE_WIDTH/2, y + TILE_HEIGHT/2 - fillHeight + TILE_HEIGHT/2);  // Right of fill
      this.fill.lineTo(x, y + TILE_HEIGHT/2);                           // Bottom of diamond
      this.fill.lineTo(x - TILE_WIDTH/2, y + TILE_HEIGHT/2 - fillHeight + TILE_HEIGHT/2);  // Left of fill
      this.fill.endFill();
      
      // Update progress text
      this.progressText.text = `${Math.round(this.progress)}%`;
      this.progressText.visible = true;
    } else {
      this.progressText.visible = false;
    }
    
    // If building, add pulsing effect
    if (this.isBuilding) {
      this.outline.alpha = 0.8 + Math.sin(Date.now() / 200) * 0.2;
    } else {
      this.outline.alpha = 1;
    }
  }
  
  updatePosition() {
    const { x, y } = gridToScreen(this.x, this.y, this.offsetX, this.offsetY);
    this.container.position.set(x, y);
    this.progressText.position.set(0, 0); // Center in container
    this.container.zIndex = Math.round(this.y * 10) + 3; // Above tiles, below walls
  }
  
  updateProgress(amount) {
    this.progress += amount;
    if (this.progress >= 100) {
      this.progress = 100;
    }
    this.updateAppearance();
    return this.progress >= 100;
  }
  
  setBuilding(isBuilding) {
    this.isBuilding = isBuilding;
    this.updateAppearance();
  }
}

export default Foundation;