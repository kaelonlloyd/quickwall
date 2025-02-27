import * as PIXI from 'pixi.js';

// Extend DisplayObject to include custom properties we need
declare module 'pixi.js' {
  interface DisplayObject {
    tileX?: number;
    tileY?: number;
  }
}
