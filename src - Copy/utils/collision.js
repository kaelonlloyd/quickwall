import { 
  VILLAGER_COLLISION_SIZE, 
  ENEMY_COLLISION_SIZE 
} from '../constants/gameConstants';

/**
 * Calculates distance between two points
 * @param {number} x1 - First point x
 * @param {number} y1 - First point y
 * @param {number} x2 - Second point x
 * @param {number} y2 - Second point y
 * @returns {number} Distance between points
 */
export const distance = (x1, y1, x2, y2) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Checks if villager would collide with walls or enemies
 * @param {number} x - Villager x position
 * @param {number} y - Villager y position
 * @param {Array} walls - Array of wall objects
 * @param {Array} enemies - Array of enemy objects
 * @returns {boolean} True if collision detected
 */
export const checkVillagerCollision = (x, y, walls, enemies) => {
  // Check for wall collisions
  const wallCollision = walls.some(wall => {
    return distance(x, y, wall.x, wall.y) < (0.5 + VILLAGER_COLLISION_SIZE); // Half tile + villager radius
  });
  
  // Check for enemy collisions
  const enemyCollision = enemies.some(enemy => {
    return distance(x, y, enemy.x, enemy.y) < (ENEMY_COLLISION_SIZE + VILLAGER_COLLISION_SIZE);
  });
  
  return wallCollision || enemyCollision;
};

/**
 * Checks if enemy would collide with a wall
 * @param {number} x - Enemy x position
 * @param {number} y - Enemy y position
 * @param {Array} walls - Array of wall objects
 * @returns {boolean} True if collision detected
 */
export const checkEnemyWallCollision = (x, y, walls) => {
  return walls.some(wall => {
    return distance(x, y, wall.x, wall.y) < (0.5 + ENEMY_COLLISION_SIZE); // Half tile + enemy radius
  });
};

/**
 * Checks if enemy would collide with another enemy
 * @param {number} x - Enemy x position
 * @param {number} y - Enemy y position
 * @param {string|number} enemyId - ID of the current enemy
 * @param {Array} enemies - Array of enemy objects
 * @returns {boolean} True if collision detected
 */
export const checkEnemyEnemyCollision = (x, y, enemyId, enemies) => {
  return enemies.some(otherEnemy => {
    if (otherEnemy.id === enemyId) return false; // Don't check against self
    
    return distance(x, y, otherEnemy.x, otherEnemy.y) < (ENEMY_COLLISION_SIZE * 2); // Twice enemy radius
  });
};

/**
 * Checks if villager is under attack by enemies
 * @param {Object} villager - Villager object with x,y coordinates
 * @param {Array} enemies - Array of enemy objects
 * @returns {boolean} True if villager is under attack
 */
export const isVillagerUnderAttack = (villager, enemies) => {
  return enemies.some(enemy => {
    return distance(villager.x, villager.y, enemy.x, enemy.y) < (VILLAGER_COLLISION_SIZE + ENEMY_COLLISION_SIZE);
  });
};
