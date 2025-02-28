import { GridPosition } from '../types';

// Comprehensive Building State Enum
export enum BuildingState {
  FOUNDATION = 'FOUNDATION',
  UNDER_CONSTRUCTION = 'UNDER_CONSTRUCTION',
  COMPLETE = 'COMPLETE',
  DAMAGED = 'DAMAGED',
  DESTROYED = 'DESTROYED'
}

// Comprehensive Building Event Enum
export enum BuildingEvent {
  START_CONSTRUCTION = 'START_CONSTRUCTION',
  PROGRESS_CONSTRUCTION = 'PROGRESS_CONSTRUCTION',
  COMPLETE_CONSTRUCTION = 'COMPLETE_CONSTRUCTION',
  TAKE_DAMAGE = 'TAKE_DAMAGE',
  REPAIR = 'REPAIR',
  DEMOLISH = 'DEMOLISH'
}

// Building Configuration Interface
export interface BuildingConfig {
  type: string;
  size: {
    width: number;
    height: number;
  };
  orientation: 'horizontal' | 'vertical';
  baseHealth: number;
  targetBuildDuration: number; // Target build time in seconds (t in the formula)
}

// Building State Machine Configuration
export interface BuildingStateMachineConfig {
  onStateChange?: (from: BuildingState, to: BuildingState) => void;
}

// Building State Context
export interface BuildingStateContext {
  x: number;
  y: number;
  config: BuildingConfig;
  assignedVillagers: any[]; // Replace 'any' with appropriate type
}

// Base Building State Machine
export class BuildingStateMachine {
  private currentState: BuildingState = BuildingState.FOUNDATION;
  private buildProgress: number = 0;
  private maxHealth: number;
  private currentHealth: number;
  private config: BuildingConfig;
  private stateTransitions: Map<BuildingState, BuildingState[]>;

  constructor(
    private context: BuildingStateContext,
    config: BuildingStateMachineConfig = {}
  ) {
    this.config = context.config;
    this.maxHealth = this.config.baseHealth;
    this.currentHealth = 0;

    // Define valid state transitions
    this.stateTransitions = new Map([
      [BuildingState.FOUNDATION, [BuildingState.UNDER_CONSTRUCTION]],
      [BuildingState.UNDER_CONSTRUCTION, [
        BuildingState.COMPLETE, 
        BuildingState.DAMAGED
      ]],
      [BuildingState.COMPLETE, [
        BuildingState.DAMAGED, 
        BuildingState.DESTROYED
      ]],
      [BuildingState.DAMAGED, [
        BuildingState.COMPLETE, 
        BuildingState.DESTROYED
      ]],
      [BuildingState.DESTROYED, []]
    ]);
  }

  public calculateProgressIncrement(activeBuilders: number, delta: number): number {
    const t = this.config.targetBuildDuration; // Target duration in seconds
    const n = Math.max(1, activeBuilders); // Ensure at least 1 builder
    
    // Apply the formula (3t)/(n/2) to calculate total build duration
    const totalBuildDuration = (3 * t) / (n / 2);
    
    // Calculate progress per frame (delta is in frames, typically ~1/60 of a second)
    // 100% progress over totalBuildDuration seconds
    return (100 / (totalBuildDuration * 60)) * delta;
  }

  public getConfig(): BuildingConfig {
    return this.config;
  }

  // Validate and perform state transition
  private transitionTo(newState: BuildingState): boolean {
    const validTransitions = this.stateTransitions.get(this.currentState) || [];
    
    if (validTransitions.includes(newState)) {
      const oldState = this.currentState;
      this.currentState = newState;
      
      // Call state change callback if provided
      return true;
    } else {
      console.error(`Invalid state transition from ${this.currentState} to ${newState}`);
      return false;
    }
  }

  // Handle building events
  public handleEvent(event: BuildingEvent, payload?: any): boolean {
    switch(event) {
      case BuildingEvent.START_CONSTRUCTION:
        return this.startConstruction();
      
      case BuildingEvent.PROGRESS_CONSTRUCTION:
        return this.progressConstruction(payload?.progress);
      
      case BuildingEvent.COMPLETE_CONSTRUCTION:
        return this.completeConstruction();
      
      case BuildingEvent.TAKE_DAMAGE:
        return this.takeDamage(payload?.damageAmount);
      
      case BuildingEvent.REPAIR:
        return this.repair();
      
      case BuildingEvent.DEMOLISH:
        return this.demolish();
      
      default:
        console.warn(`Unhandled event: ${event}`);
        return false;
    }
  }

  // Construction methods
  private startConstruction(): boolean {
    if (this.currentState === BuildingState.FOUNDATION) {
      return this.transitionTo(BuildingState.UNDER_CONSTRUCTION);
    }
    return false;
  }

  private progressConstruction(progress: number): boolean {
    if (this.currentState === BuildingState.UNDER_CONSTRUCTION) {
      this.buildProgress += progress;
      
      if (this.buildProgress >= 100) {
        return this.completeConstruction();
      }
      return true;
    }
    return false;
  }

  private completeConstruction(): boolean {
    if (this.currentState === BuildingState.UNDER_CONSTRUCTION) {
      this.currentHealth = this.maxHealth;
      return this.transitionTo(BuildingState.COMPLETE);
    }
    return false;
  }

  // Damage and repair methods
  private takeDamage(damageAmount: number): boolean {
    if (this.currentState === BuildingState.COMPLETE || 
        this.currentState === BuildingState.DAMAGED) {
      this.currentHealth -= damageAmount;
      
      if (this.currentHealth <= 0) {
        return this.demolish();
      } else if (this.currentHealth < this.maxHealth * 0.3) {
        return this.transitionTo(BuildingState.DAMAGED);
      }
      return true;
    }
    return false;
  }

  private repair(): boolean {
    if (this.currentState === BuildingState.DAMAGED) {
      this.currentHealth = this.maxHealth;
      return this.transitionTo(BuildingState.COMPLETE);
    }
    return false;
  }

  private demolish(): boolean {
    return this.transitionTo(BuildingState.DESTROYED);
  }

  // Getter methods
  public getCurrentState(): BuildingState {
    return this.currentState;
  }

  public getConstructionProgress(): number {
    return this.buildProgress;
  }

  public getHealthPercentage(): number {
    return (this.currentHealth / this.maxHealth) * 100;
  }

  // Specific building type configurations
  public static getBuildingConfigs(): Record<string, BuildingConfig> {
    return {
      'wall': {
        type: 'wall',
        size: { width: 1, height: 1 },
        orientation: 'horizontal',
        baseHealth: 100,
        targetBuildDuration: 7 // 7 seconds target duration for walls
      },
      'tower': {
        type: 'tower',
        size: { width: 2, height: 2 },
        orientation: 'vertical',
        baseHealth: 200,
        targetBuildDuration: 15 // 15 seconds target duration for towers
      },
      'house': {
        type: 'house',
        size: { width: 2, height: 2 },
        orientation: 'horizontal',
        baseHealth: 150,
        targetBuildDuration: 20 // 20 seconds target duration for houses
      },
      'farm': {
        type: 'farm',
        size: { width: 3, height: 3 },
        orientation: 'horizontal',
        baseHealth: 100,
        targetBuildDuration: 25 // 25 seconds target duration for farms
      }
      // Easy to add more building types with different target durations
    };
  }
}