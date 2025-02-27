import { BuildingCost, Resources } from '../types';

export class ResourceManager {
  private resources: Resources;
  private woodElement: HTMLElement;
  private stoneElement: HTMLElement;

  constructor(initialResources: Resources) {
    this.resources = { ...initialResources };
    this.woodElement = document.getElementById('wood-count') as HTMLElement;
    this.stoneElement = document.getElementById('stone-count') as HTMLElement;
    this.updateDisplay();
  }

  public getResources(): Resources {
    return { ...this.resources };
  }

  public hasEnoughResources(cost: BuildingCost): boolean {
    return this.resources.wood >= cost.wood && this.resources.stone >= cost.stone;
  }

  public deductResources(cost: BuildingCost): boolean {
    if (!this.hasEnoughResources(cost)) {
      return false;
    }

    this.resources.wood -= cost.wood;
    this.resources.stone -= cost.stone;
    this.updateDisplay();
    return true;
  }

  public addResources(wood: number = 0, stone: number = 0): void {
    this.resources.wood += wood;
    this.resources.stone += stone;
    this.updateDisplay();
  }

  private updateDisplay(): void {
    if (this.woodElement) {
      this.woodElement.textContent = this.resources.wood.toString();
    }
    
    if (this.stoneElement) {
      this.stoneElement.textContent = this.resources.stone.toString();
    }
  }
}
