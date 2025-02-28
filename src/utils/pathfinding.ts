import { GridPosition } from '../types';
import { GameMap } from '../components/Map';

export class ImprovedPathFinder {
  private gameMap: GameMap;

  constructor(gameMap: GameMap) {
    this.gameMap = gameMap;
  }

  public findPath(startX: number, startY: number, targetX: number, targetY: number, options: { 
    maxIterations?: number, 
    diagonalMovement?: boolean 
  } = {}): GridPosition[] {
    const {
      maxIterations = 500,
      diagonalMovement = true
    } = options;

    // Sanitize and validate input coordinates
    const start: GridPosition = { 
      x: Math.floor(startX), 
      y: Math.floor(startY) 
    };
    const target: GridPosition = { 
      x: Math.floor(targetX), 
      y: Math.floor(targetY) 
    };

    // If start and target are the same, return empty path
    if (start.x === target.x && start.y === target.y) {
      return [];
    }

    // If target is not walkable, find the nearest walkable tile
    if (!this.gameMap.isTileWalkable(target.x, target.y)) {
      const nearestWalkable = this.findNearestWalkableTile(start, target);
      if (nearestWalkable) {
        target.x = nearestWalkable.x;
        target.y = nearestWalkable.y;
      } else {
        console.warn('No walkable path found');
        return [];
      }
    }

    // Priority queue for open set
    const openSet: PathNode[] = [this.createNode(start, null, 0, this.heuristic(start, target))];
    const closedSet = new Set<string>();
    const nodeMap = new Map<string, PathNode>();

    while (openSet.length > 0 && nodeMap.size < maxIterations) {
      // Get the node with the lowest f-score
      const currentNode = this.popLowestFScore(openSet);
      
      // Check if we've reached the target
      if (this.isNodeTarget(currentNode, target)) {
        return this.reconstructPath(currentNode);
      }

      // Mark as closed
      closedSet.add(this.nodeKey(currentNode.position));

      // Get walkable neighbors
      const neighbors = this.getWalkableNeighbors(currentNode.position, diagonalMovement);

      for (const neighborPos of neighbors) {
        const neighborKey = this.nodeKey(neighborPos);

        // Skip if already in closed set
        if (closedSet.has(neighborKey)) continue;

        // Calculate movement cost (diagonal movement slightly more expensive)
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

    console.warn('Path finding reached max iterations', { start, target });
    return [];
  }

  private findNearestWalkableTile(start: GridPosition, target: GridPosition): GridPosition | null {
    // Spiral search for the nearest walkable tile
    const maxRadius = 10; // Limit search radius
    for (let radius = 1; radius <= maxRadius; radius++) {
      const candidates: GridPosition[] = [];
      
      // Check tiles in a spiral pattern around the target
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          if (Math.abs(dx) === radius || Math.abs(dy) === radius) {
            const checkX = target.x + dx;
            const checkY = target.y + dy;
            
            // Validate map boundaries
            if (checkX >= 0 && checkX < 20 && checkY >= 0 && checkY < 20) {
              if (this.gameMap.isTileWalkable(checkX, checkY)) {
                candidates.push({ x: checkX, y: checkY });
              }
            }
          }
        }
      }
      
      // If candidates found, return the closest one
      if (candidates.length > 0) {
        return candidates.reduce((closest, current) => {
          const closestDist = this.manhattanDistance(start, closest);
          const currentDist = this.manhattanDistance(start, current);
          return currentDist < closestDist ? current : closest;
        });
      }
    }
    
    return null;
  }

  private getWalkableNeighbors(position: GridPosition, allowDiagonal: boolean): GridPosition[] {
    const neighbors: GridPosition[] = [];
    const directions = allowDiagonal 
      ? [
          { x: -1, y: 0 }, { x: 1, y: 0 },   // Left, Right
          { x: 0, y: -1 }, { x: 0, y: 1 },   // Up, Down
          { x: -1, y: -1 }, { x: 1, y: -1 },   // Top-Left, Top-Right
          { x: -1, y: 1 }, { x: 1, y: 1 }    // Bottom-Left, Bottom-Right
        ]
      : [
          { x: -1, y: 0 }, { x: 1, y: 0 },   // Left, Right
          { x: 0, y: -1 }, { x: 0, y: 1 }    // Up, Down
        ];

    for (const dir of directions) {
      const newX = position.x + dir.x;
      const newY = position.y + dir.y;

      // Check walkability and map boundaries
      if (newX >= 0 && newX < 20 && newY >= 0 && newY < 20 && 
          this.gameMap.isTileWalkable(newX, newY)) {
        
        // Optional: Diagonal movement blocking
        if (allowDiagonal) {
          // Prevent diagonal movement through corners that would require walking through blocked tiles
          if (dir.x !== 0 && dir.y !== 0) {
            if (!this.gameMap.isTileWalkable(position.x + dir.x, position.y) || 
                !this.gameMap.isTileWalkable(position.x, position.y + dir.y)) {
              continue;
            }
          }
        }

        neighbors.push({ x: newX, y: newY });
      }
    }

    return neighbors;
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
    // Manhattan distance with diagonal preference
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    const diagonalCost = Math.min(dx, dy);
    const straightCost = Math.abs(dx - dy);
    
    return diagonalCost * 1.414 + straightCost;
  }

  private manhattanDistance(a: GridPosition, b: GridPosition): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  private calculateMovementCost(from: GridPosition, to: GridPosition): number {
    // Slightly more expensive for diagonal movement
    return from.x !== to.x && from.y !== to.y ? 1.414 : 1;
  }

  private isNodeTarget(node: PathNode, target: GridPosition): boolean {
    return node.position.x === target.x && node.position.y === target.y;
  }

  private nodeKey(node: GridPosition): string {
    return `${node.x},${node.y}`;
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
    
    return path;
  }
}

// Type definitions for internal use
interface PathNode {
  position: GridPosition;
  parent: PathNode | null;
  gScore: number;  // Cost from start
  hScore: number;  // Estimated cost to goal (heuristic)
  fScore: number;  // Total estimated cost
}