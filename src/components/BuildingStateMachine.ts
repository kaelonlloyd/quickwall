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
  buildTime: number;
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
        buildTime: 10
      },
      'tower': {
        type: 'tower',
        size: { width: 2, height: 2 },
        orientation: 'vertical',
        baseHealth: 200,
        buildTime: 20
      }
      // Easy to add more building types
    };
  }
}
