import { GridPosition } from '../types';
import { GameMap } from '../components/Map';

export class PathFinder {
  private gameMap: GameMap;

  constructor(gameMap: GameMap) {
    this.gameMap = gameMap;
  }

  public findPath(startX: number, startY: number, targetX: number, targetY: number): GridPosition[] {
    // Convert coordinates to integer
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

    // If target is not walkable, find adjacent walkable tile
    if (!this.gameMap.isTileWalkable(target.x, target.y)) {
      const adjacentTile = this.gameMap.getAdjacentWalkableTile(target.x, target.y);
      if (adjacentTile) {
        target.x = adjacentTile.x;
        target.y = adjacentTile.y;
      } else {
        console.warn('No walkable tile found near target');
        return [];
      }
    }

    // A* Pathfinding implementation
    const openSet: GridPosition[] = [start];
    const closedSet = new Set<string>();
    const cameFrom = new Map<string, GridPosition>();
    
    // Cost tracking
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();
    
    gScore.set(this.gridPositionToKey(start), 0);
    fScore.set(this.gridPositionToKey(start), this.heuristic(start, target));

    while (openSet.length > 0) {
      // Find the node with the lowest f score
      const current = this.getLowestFScoreNode(openSet, fScore);
      
      // Check if we've reached the target
      if (current.x === target.x && current.y === target.y) {
        return this.reconstructPath(cameFrom, current);
      }

      // Remove current from open set and add to closed set
      const openIndex = openSet.findIndex(pos => 
        pos.x === current.x && pos.y === current.y
      );
      openSet.splice(openIndex, 1);
      closedSet.add(this.gridPositionToKey(current));

      // Check neighbor tiles
      const neighbors = this.getWalkableNeighbors(current);
      
      for (const neighbor of neighbors) {
        const neighborKey = this.gridPositionToKey(neighbor);
        
        // Skip if already evaluated
        if (closedSet.has(neighborKey)) continue;

        // Calculate tentative g score
        const currentKey = this.gridPositionToKey(current);
        const tentativeGScore = (gScore.get(currentKey) || 0) + 1;

        // Add to open set if not already there
        if (!openSet.some(pos => pos.x === neighbor.x && pos.y === neighbor.y)) {
          openSet.push(neighbor);
        } else if (tentativeGScore >= (gScore.get(neighborKey) || Infinity)) {
          // This is not a better path
          continue;
        }

        // This path is the best until now. Record it!
        cameFrom.set(neighborKey, current);
        gScore.set(neighborKey, tentativeGScore);
        fScore.set(neighborKey, tentativeGScore + this.heuristic(neighbor, target));
      }
    }

    // No path found
    console.warn('No path found', { start, target });
    return [];
  }

  private getLowestFScoreNode(openSet: GridPosition[], fScore: Map<string, number>): GridPosition {
    return openSet.reduce((lowest, current) => {
      const lowestScore = fScore.get(this.gridPositionToKey(lowest)) || Infinity;
      const currentScore = fScore.get(this.gridPositionToKey(current)) || Infinity;
      return currentScore < lowestScore ? current : lowest;
    });
  }

  private getWalkableNeighbors(pos: GridPosition): GridPosition[] {
    const potentialNeighbors: GridPosition[] = [
      { x: pos.x - 1, y: pos.y },     // Left
      { x: pos.x + 1, y: pos.y },     // Right
      { x: pos.x, y: pos.y - 1 },     // Top
      { x: pos.x, y: pos.y + 1 },     // Bottom
      { x: pos.x - 1, y: pos.y - 1 }, // Top-Left
      { x: pos.x + 1, y: pos.y - 1 }, // Top-Right
      { x: pos.x - 1, y: pos.y + 1 }, // Bottom-Left
      { x: pos.x + 1, y: pos.y + 1 }  // Bottom-Right
    ];

    return potentialNeighbors.filter(neighbor => 
      neighbor.x >= 0 && neighbor.x < 20 && 
      neighbor.y >= 0 && neighbor.y < 20 && 
      this.gameMap.isTileWalkable(neighbor.x, neighbor.y)
    );
  }

  private heuristic(a: GridPosition, b: GridPosition): number {
    // Diagonal distance heuristic
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    return Math.max(dx, dy);
  }

  private reconstructPath(cameFrom: Map<string, GridPosition>, current: GridPosition): GridPosition[] {
    const path: GridPosition[] = [];
    let currentNode: GridPosition | undefined = current;

    while (currentNode) {
      path.unshift(currentNode);
      currentNode = cameFrom.get(this.gridPositionToKey(currentNode));
    }

    return path;
  }

  private gridPositionToKey(pos: GridPosition): string {
    return `${pos.x},${pos.y}`;
  }
}
