import { GridPosition } from '../types';
import { GameMap } from '../components/Map';

export class SubTilePathFinder {
  private gameMap: GameMap;
  private gridDensity: number = 4; // Each tile is divided into a 4x4 grid for more precise movement

  constructor(gameMap: GameMap) {
    this.gameMap = gameMap;
  }

  public findPath(
    startX: number, 
    startY: number, 
    targetX: number, 
    targetY: number, 
    options: { 
      maxIterations?: number, 
      diagonalMovement?: boolean,
      preciseTarget?: boolean 
    } = {}
  ): GridPosition[] {
    const {
      maxIterations = 500,
      diagonalMovement = true,
      preciseTarget = true
    } = options;

    // Convert exact coordinates to sub-tile grid positions
    const start: GridPosition = { 
      x: startX, 
      y: startY 
    };
    
    const target: GridPosition = { 
      x: targetX, 
      y: targetY 
    };

    // If start and target are the same, return empty path
    if (Math.abs(start.x - target.x) < 0.1 && Math.abs(start.y - target.y) < 0.1) {
      return [];
    }

    
    // Check if target is in the same tile as start
    const startTileX = Math.floor(start.x);
    const startTileY = Math.floor(start.y);
    const targetTileX = Math.floor(target.x);
    const targetTileY = Math.floor(target.y);

    // If target tile is not walkable, find the nearest walkable position
    if (!this.gameMap.isTileWalkable(targetTileX, targetTileY)) {
      const nearestPosition = this.findNearestAccessiblePoint(start, target);
      if (nearestPosition) {
        console.log(`Target tile (${targetTileX}, ${targetTileY}) is not walkable, routing to (${nearestPosition.x}, ${nearestPosition.y}) instead`);
        return this.findPath(startX, startY, nearestPosition.x, nearestPosition.y, options);
      } else {
        console.warn('No accessible point found near target');
        return [];
      }
    }

    // Priority queue for open set
    const openSet: PathNode[] = [
      this.createNode(start, null, 0, this.heuristic(start, target))
    ];
    
    const closedSet = new Set<string>();
    const nodeMap = new Map<string, PathNode>();

    let iterations = 0;
    while (openSet.length > 0 && iterations < maxIterations) {
      iterations++;
      
      // Get the node with the lowest f-score
      const currentNode = this.popLowestFScore(openSet);
      
      // Check if we've reached the target (within a small tolerance)
      const reachedTarget = preciseTarget 
        ? this.isCloseEnough(currentNode.position, target, 0.01)
        : this.isOnSameTile(currentNode.position, target);
        
      if (reachedTarget) {
        return this.reconstructPath(currentNode);
      }

      // Mark as closed
      closedSet.add(this.nodeKey(currentNode.position));

      // Get neighbors
      const neighbors = this.getSubTileNeighbors(currentNode.position, diagonalMovement);

      for (const neighborPos of neighbors) {
        const neighborKey = this.nodeKey(neighborPos);

        // Skip if already in closed set
        if (closedSet.has(neighborKey)) continue;

        // Check if this position is walkable in the sub-tile grid
        if (!this.isSubTileWalkable(neighborPos)) continue;

        // Calculate movement cost
        const movementCost = this.calculateMovementCost(currentNode.position, neighborPos);
        const newGScore = currentNode.gScore + movementCost;

        // Find or create neighbor node
        let neighborNode = nodeMap.get(neighborKey);
        if (!neighborNode) {
          neighborNode = this.createNode(
            neighborPos, 
            currentNode, 
            newGScore, 
            this.heuristic(neighborPos, target)
          );
          nodeMap.set(neighborKey, neighborNode);
          openSet.push(neighborNode);
        } else if (newGScore < neighborNode.gScore) {
          // Found a better path to this node
          neighborNode.parent = currentNode;
          neighborNode.gScore = newGScore;
          neighborNode.fScore = newGScore + neighborNode.hScore;
        }
      }
    }

    console.warn('Path finding reached max iterations or no path found', { start, target });
    
    // If we failed to find a path to the exact target, try to get as close as possible
    if (preciseTarget && iterations >= maxIterations) {
      console.log('Trying approximate path instead...');
      return this.findPath(startX, startY, targetX, targetY, { 
        ...options, 
        preciseTarget: false 
      });
    }
    
    return [];
  }

  // Find the nearest accessible point to the target
  public findNearestAccessiblePoint(start: GridPosition, target: GridPosition): GridPosition | null {
    // Get the tile we're trying to reach
    const targetTileX = Math.floor(target.x);
    const targetTileY = Math.floor(target.y);
    
    // Calculate the relative position within the tile (0-1 range)
    const inTileX = target.x - targetTileX; // e.g., 0.7 means 70% across the tile
    const inTileY = target.y - targetTileY;
    
    // First get all walkable tiles adjacent to the target tile
    const adjacentTiles: GridPosition[] = [
      { x: targetTileX - 1, y: targetTileY },
      { x: targetTileX + 1, y: targetTileY },
      { x: targetTileX, y: targetTileY - 1 },
      { x: targetTileX, y: targetTileY + 1 },
      { x: targetTileX - 1, y: targetTileY - 1 },
      { x: targetTileX - 1, y: targetTileY + 1 },
      { x: targetTileX + 1, y: targetTileY - 1 },
      { x: targetTileX + 1, y: targetTileY + 1 }
    ].filter(tile => this.gameMap.isTileWalkable(tile.x, tile.y));
    
    if (adjacentTiles.length === 0) {
      // If no adjacent tiles are walkable, try a wider search
      return this.gameMap.findAlternativeWalkableTile(targetTileX, targetTileY, 3);
    }
    
    // Sort adjacent tiles by proximity to the specific part of the target tile
    // This helps get as close as possible to the exact point the user clicked
    adjacentTiles.sort((a, b) => {
      // For each adjacent tile, calculate the position nearest to the target
      const posA = this.getNearestPointOnTileBorder(a, targetTileX, targetTileY, inTileX, inTileY);
      const posB = this.getNearestPointOnTileBorder(b, targetTileX, targetTileY, inTileX, inTileY);
      
      // Calculate distances from start and to target
      const distAToTarget = this.euclideanDistance(posA, target);
      const distBToTarget = this.euclideanDistance(posB, target);
      
      // Prioritize getting close to the target
      return distAToTarget - distBToTarget;
    });
    
    // Get the best tile and calculate the optimal position within it
    const bestTile = adjacentTiles[0];
    return this.getNearestPointOnTileBorder(bestTile, targetTileX, targetTileY, inTileX, inTileY);
  }
  
  // Calculate the best position on a tile's border that's closest to the target point
  public getNearestPointOnTileBorder(
    tile: GridPosition, 
    targetTileX: number, 
    targetTileY: number,
    inTileX: number,
    inTileY: number
  ): GridPosition {
    // Determine which border this tile shares with the target tile
    const sharedBorderX = tile.x === targetTileX - 1 ? 1 : (tile.x === targetTileX + 1 ? 0 : inTileX);
    const sharedBorderY = tile.y === targetTileY - 1 ? 1 : (tile.y === targetTileY + 1 ? 0 : inTileY);
    
    // Calculate the position, clamping to tile boundaries
    let posX = tile.x + sharedBorderX;
    let posY = tile.y + sharedBorderY;
    
    // Ensure we're within the walkable tile's bounds
    posX = Math.max(tile.x, Math.min(tile.x + 0.95, posX));
    posY = Math.max(tile.y, Math.min(tile.y + 0.95, posY));
    
    return { x: posX, y: posY };
  }

  private getSubTileNeighbors(pos: GridPosition, allowDiagonal: boolean): GridPosition[] {
    const neighbors: GridPosition[] = [];
    const step = 0.25; // Step size for sub-tile grid (can be adjusted for finer movement)
    
    // Straight directions (cardinal)
    const cardinalDirections = [
      { x: step, y: 0 },   // Right
      { x: -step, y: 0 },  // Left
      { x: 0, y: step },   // Down
      { x: 0, y: -step }   // Up
    ];
    
    // Add cardinal neighbors
    for (const dir of cardinalDirections) {
      neighbors.push({
        x: pos.x + dir.x,
        y: pos.y + dir.y
      });
    }
    
    // Add diagonal neighbors if allowed
    if (allowDiagonal) {
      const diagonalDirections = [
        { x: step, y: step },     // Down-Right
        { x: step, y: -step },    // Up-Right
        { x: -step, y: step },    // Down-Left
        { x: -step, y: -step }    // Up-Left
      ];
      
      for (const dir of diagonalDirections) {
        neighbors.push({
          x: pos.x + dir.x,
          y: pos.y + dir.y
        });
      }
    }
    
    return neighbors;
  }

  // Check if a sub-tile position is walkable
  private isSubTileWalkable(position: GridPosition): boolean {
    // Get the tile this sub-position is in
    const tileX = Math.floor(position.x);
    const tileY = Math.floor(position.y);
    
    // First check if the main tile is walkable
    if (!this.gameMap.isTileWalkable(tileX, tileY)) {
      return false;
    }
    
    // Check if we're too close to an unwalkable tile
    // (creates a small buffer zone around unwalkable tiles)
    const buffer = 0.1; // Buffer distance from unwalkable tiles
    
    // Only check nearby tiles if we're close to an edge
    const inTileX = position.x - tileX;
    const inTileY = position.y - tileY;
    
    // Check tiles in each direction if we're close to an edge
    if (inTileX < buffer) {
      // Check left tile
      if (!this.gameMap.isTileWalkable(tileX - 1, tileY)) {
        return false;
      }
    } else if (inTileX > 1 - buffer) {
      // Check right tile
      if (!this.gameMap.isTileWalkable(tileX + 1, tileY)) {
        return false;
      }
    }
    
    if (inTileY < buffer) {
      // Check top tile
      if (!this.gameMap.isTileWalkable(tileX, tileY - 1)) {
        return false;
      }
    } else if (inTileY > 1 - buffer) {
      // Check bottom tile
      if (!this.gameMap.isTileWalkable(tileX, tileY + 1)) {
        return false;
      }
    }
    
    // If we're close to both edges, check the diagonal tile too
    if (inTileX < buffer && inTileY < buffer) {
      // Check top-left diagonal
      if (!this.gameMap.isTileWalkable(tileX - 1, tileY - 1)) {
        return false;
      }
    } else if (inTileX > 1 - buffer && inTileY < buffer) {
      // Check top-right diagonal
      if (!this.gameMap.isTileWalkable(tileX + 1, tileY - 1)) {
        return false;
      }
    } else if (inTileX < buffer && inTileY > 1 - buffer) {
      // Check bottom-left diagonal
      if (!this.gameMap.isTileWalkable(tileX - 1, tileY + 1)) {
        return false;
      }
    } else if (inTileX > 1 - buffer && inTileY > 1 - buffer) {
      // Check bottom-right diagonal
      if (!this.gameMap.isTileWalkable(tileX + 1, tileY + 1)) {
        return false;
      }
    }
    
    return true;
  }

  private createNode(
    position: GridPosition, 
    parent: PathNode | null, 
    gScore: number, 
    hScore: number
  ): PathNode {
    return {
      position,
      parent,
      gScore,
      hScore,
      fScore: gScore + hScore
    };
  }

  private heuristic(a: GridPosition, b: GridPosition): number {
    // Octile distance with sub-tile precision
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    return (dx + dy) + (Math.sqrt(2) - 2) * Math.min(dx, dy);
  }

  private euclideanDistance(a: GridPosition, b: GridPosition): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private calculateMovementCost(from: GridPosition, to: GridPosition): number {
    // Calculate actual distance for more realistic movement costs
    return this.euclideanDistance(from, to);
  }

  private isCloseEnough(a: GridPosition, b: GridPosition, tolerance: number = 0.15): boolean {
    return this.euclideanDistance(a, b) <= tolerance;
  }
  
  private isOnSameTile(a: GridPosition, b: GridPosition): boolean {
    return Math.floor(a.x) === Math.floor(b.x) && Math.floor(a.y) === Math.floor(b.y);
  }

  private nodeKey(pos: GridPosition): string {
    // Higher precision for sub-tile positions
    return `${pos.x.toFixed(3)},${pos.y.toFixed(3)}`;
  }

  private popLowestFScore(openSet: PathNode[]): PathNode {
    if (openSet.length === 0) throw new Error('Open set is empty');
    
    let lowestIndex = 0;
    for (let i = 1; i < openSet.length; i++) {
      if (openSet[i].fScore < openSet[lowestIndex].fScore) {
        lowestIndex = i;
      }
    }
    
    const node = openSet[lowestIndex];
    openSet.splice(lowestIndex, 1);
    return node;
  }

  private reconstructPath(node: PathNode): GridPosition[] {
    const path: GridPosition[] = [];
    let current: PathNode | null = node;
    
    while (current) {
      path.unshift(current.position);
      current = current.parent;
    }
    
    // Smooth the path to make movement more natural
    return this.smoothPath(path);
  }
  
  // Simple path smoothing to remove unnecessary zigzags
  private smoothPath(path: GridPosition[]): GridPosition[] {
    if (path.length <= 2) return path;
    
    const smoothed: GridPosition[] = [path[0]];
    
    for (let i = 1; i < path.length - 1; i++) {
      const prev = path[i - 1];
      const current = path[i];
      const next = path[i + 1];
      
      // Skip points that create unnecessary zigzags
      const isZigzag = 
        (Math.abs(prev.x - next.x) < 0.01 && Math.abs(current.x - prev.x) > 0.01) ||
        (Math.abs(prev.y - next.y) < 0.01 && Math.abs(current.y - prev.y) > 0.01);
      
      if (!isZigzag) {
        smoothed.push(current);
      }
    }
    
    smoothed.push(path[path.length - 1]);
    return smoothed;
  }
}

// Type definitions for internal use
interface PathNode {
  position: GridPosition;
  parent: PathNode | null;
  gScore: number;
  hScore: number;
  fScore: number;
}