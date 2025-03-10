import * as PIXI from 'pixi.js';
import { GridPosition, BuildTask, VillagerTask, Villager } from '../types';

// Comprehensive Villager State Enum
export enum VillagerState {
  IDLE = 'IDLE',
  MOVING = 'MOVING',
  BUILDING = 'BUILDING',
  GATHERING_WOOD = 'GATHERING_WOOD',
  GATHERING_STONE = 'GATHERING_STONE',
  CARRYING_RESOURCES = 'CARRYING_RESOURCES',
  RESTING = 'RESTING',
  SELECTED = 'SELECTED'
}

// Comprehensive Villager Event Enum
export enum VillagerEvent {
  // Movement Events
  START_MOVE = 'START_MOVE',
  MOVE_COMPLETE = 'MOVE_COMPLETE',
  MOVE_INTERRUPTED = 'MOVE_INTERRUPTED',

  // Task Events
  START_BUILD = 'START_BUILD',
  BUILD_PROGRESS = 'BUILD_PROGRESS',
  BUILD_COMPLETE = 'BUILD_COMPLETE',
  BUILD_INTERRUPTED = 'BUILD_INTERRUPTED',

  // Gathering Events
  START_GATHER_WOOD = 'START_GATHER_WOOD',
  START_GATHER_STONE = 'START_GATHER_STONE',
  GATHER_COMPLETE = 'GATHER_COMPLETE',
  INVENTORY_FULL = 'INVENTORY_FULL',

  // State Management Events
  SELECT = 'SELECT',
  DESELECT = 'DESELECT',
  FATIGUE = 'FATIGUE',
  REST_COMPLETE = 'REST_COMPLETE',

  // Resource Handling
  DEPOSIT_RESOURCES = 'DEPOSIT_RESOURCES'
}

// Villager State Machine Configuration
export interface VillagerStateMachineConfig {
  onStateChange?: (from: VillagerState, to: VillagerState) => void;
  maxHealth?: number;
  fatigueThreshold?: number;
}

// Context interface for state machine
export interface VillagerStateContext {
  villager: Villager;
}

export interface VillagerStateMachine {
  // Add the method to the interface
  getCurrentState(): VillagerState;
  handleEvent(event: VillagerEvent): void;
}




// State Machine for managing villager states
export class VillagerStateMachine {
  private currentState: VillagerState = VillagerState.IDLE;
  private stateTransitions: Map<VillagerState, VillagerState[]>;
  private eventHandlers: Map<VillagerEvent, ((context: VillagerStateContext) => void)[]>;
  private config: VillagerStateMachineConfig;

 constructor(
  private context: VillagerStateContext, 
  config: VillagerStateMachineConfig = {}
) { {
    this.config = {
      maxHealth: 100,
      fatigueThreshold: 30,
      ...config
    };

    // Define valid state transitions
    this.stateTransitions =
    
    
    
    new Map([
      [VillagerState.IDLE, [
        VillagerState.MOVING, 
        VillagerState.BUILDING, 
        VillagerState.GATHERING_WOOD,
        VillagerState.GATHERING_STONE,
        VillagerState.RESTING,
        VillagerState.SELECTED
      ]],
      [VillagerState.MOVING, [
        VillagerState.IDLE, 
        VillagerState.BUILDING, 
        VillagerState.GATHERING_WOOD,
        VillagerState.GATHERING_STONE,
        VillagerState.CARRYING_RESOURCES
      ]],
      [VillagerState.BUILDING, [
        VillagerState.IDLE, 
        VillagerState.MOVING,
        VillagerState.CARRYING_RESOURCES
      ]],
      [VillagerState.GATHERING_WOOD, [
        VillagerState.IDLE, 
        VillagerState.CARRYING_RESOURCES,
        VillagerState.MOVING
      ]],
      [VillagerState.GATHERING_STONE, [
        VillagerState.IDLE, 
        VillagerState.CARRYING_RESOURCES,
        VillagerState.MOVING
      ]],
      [VillagerState.CARRYING_RESOURCES, [
        VillagerState.IDLE, 
        VillagerState.MOVING
      ]],
      [VillagerState.RESTING, [
        VillagerState.IDLE
      ]],
      [VillagerState.SELECTED, [
        VillagerState.IDLE,
        VillagerState.MOVING
      ]]
    ]);

    // Initialize event handlers
    this.eventHandlers = new Map();
    this.setupDefaultEventHandlers();
  }
}

private setupDefaultEventHandlers(): void {
  // Movement event handlers
  this.addEventListener(VillagerEvent.START_MOVE, (ctx) => {
    console.log("Villager starting to move");
    this.transitionTo(VillagerState.MOVING);
    ctx.villager.moving = true;
  });

  this.addEventListener(VillagerEvent.MOVE_COMPLETE, (ctx) => {
    console.log("Villager completed movement");
    this.transitionTo(VillagerState.IDLE);
    ctx.villager.moving = false;
  });

  this.addEventListener(VillagerEvent.MOVE_INTERRUPTED, (ctx) => {
    console.log("Villager movement interrupted");
    this.transitionTo(VillagerState.IDLE);
    ctx.villager.moving = false;
  });

  // Building event handlers
  this.addEventListener(VillagerEvent.START_BUILD, (ctx) => {
    if (ctx.villager.currentBuildTask) {
      console.log("Villager starting to build");
      this.transitionTo(VillagerState.BUILDING);
    }
  });

  this.addEventListener(VillagerEvent.BUILD_PROGRESS, (ctx) => {
    // Stay in building state, no state change needed
    // This event can be used to trigger animations or other effects
  });

  this.addEventListener(VillagerEvent.BUILD_COMPLETE, (ctx) => {
    console.log("Villager completed building");
    this.transitionTo(VillagerState.IDLE);
    ctx.villager.currentBuildTask = null;
  });

  this.addEventListener(VillagerEvent.BUILD_INTERRUPTED, (ctx) => {
    console.log("Villager build task interrupted");
    this.transitionTo(VillagerState.IDLE);
    ctx.villager.currentBuildTask = null;
  });

  // Gathering event handlers
  this.addEventListener(VillagerEvent.START_GATHER_WOOD, (ctx) => {
    console.log("Villager starting to gather wood");
    this.transitionTo(VillagerState.GATHERING_WOOD);
  });

  this.addEventListener(VillagerEvent.START_GATHER_STONE, (ctx) => {
    console.log("Villager starting to gather stone");
    this.transitionTo(VillagerState.GATHERING_STONE);
  });

  this.addEventListener(VillagerEvent.GATHER_COMPLETE, (ctx) => {
    console.log("Villager completed gathering");
    this.transitionTo(VillagerState.CARRYING_RESOURCES);
  });

  this.addEventListener(VillagerEvent.INVENTORY_FULL, (ctx) => {
    console.log("Villager inventory full");
    this.transitionTo(VillagerState.CARRYING_RESOURCES);
  });

  // Selection event handlers
  this.addEventListener(VillagerEvent.SELECT, (ctx) => {
    console.log("Villager selected");
    // If currently in a task state like building, keep that state
    if (this.currentState !== VillagerState.BUILDING && 
        this.currentState !== VillagerState.GATHERING_WOOD &&
        this.currentState !== VillagerState.GATHERING_STONE) {
      this.transitionTo(VillagerState.SELECTED);
    }
  });

  this.addEventListener(VillagerEvent.DESELECT, (ctx) => {
    console.log("Villager deselected");
    // If currently in a task state, stay in that state
    if (this.currentState === VillagerState.SELECTED) {
      this.transitionTo(VillagerState.IDLE);
    }
  });

  // Resource handling
  this.addEventListener(VillagerEvent.DEPOSIT_RESOURCES, (ctx) => {
    console.log("Villager depositing resources");
    this.transitionTo(VillagerState.IDLE);
  });

  // Rest/fatigue handling
  this.addEventListener(VillagerEvent.FATIGUE, (ctx) => {
    console.log("Villager fatigued");
    this.transitionTo(VillagerState.RESTING);
  });

  this.addEventListener(VillagerEvent.REST_COMPLETE, (ctx) => {
    console.log("Villager rest complete");
    this.transitionTo(VillagerState.IDLE);
  });
}

  // Add an event listener
  public addEventListener(
    event: VillagerEvent, 
    handler: (context: VillagerStateContext) => void
  ): void {
    // Get existing handlers for this event
    const existingHandlers = this.eventHandlers.get(event) || [];
    
    // Add the new handler
    existingHandlers.push(handler);
    
    // Update the event handlers map
    this.eventHandlers.set(event, existingHandlers);
  }

  // Handle an event (renamed from previous implementation)
  public handleEvent(event: VillagerEvent): void {
    const handlers = this.eventHandlers.get(event);
    
    if (handlers && handlers.length > 0) {
      // Create a copy of handlers to prevent modification during iteration
      const handlersCopy = [...handlers];
      
      // Call each handler
      handlersCopy.forEach(handler => {
        handler(this.context);
      });
    } else {
      console.warn(`No handler found for event: ${event}`);
    }
  }

  // Validate and perform state transition
  private transitionTo(newState: VillagerState): boolean {
    const validTransitions = this.stateTransitions.get(this.currentState) || [];
    
    if (validTransitions.includes(newState)) {
      const oldState = this.currentState;
      this.currentState = newState;
      
      // Call state change callback if provided
      if (this.config.onStateChange) {
        this.config.onStateChange(oldState, newState);
      }
      
      return true;
    } else {
      console.error(`Invalid state transition from ${this.currentState} to ${newState}`);
      return false;
    }
  }

  // Get current state
  public getCurrentState(): VillagerState {
    return this.currentState;
  }

  // Debug method to print all possible transitions
  public getValidTransitions(): VillagerState[] {
    return this.stateTransitions.get(this.currentState) || [];
  }
}