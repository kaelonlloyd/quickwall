// src/components/RenderingToggle.ts
import { CoordinateTransformer, RenderingMode } from '../utils/CoordinateTransformer';

/**
 * UI Component to manage rendering mode toggling
 */
export class RenderingToggle {
  private transformer: CoordinateTransformer;
  private toggleButton: HTMLButtonElement;
  private onToggle: (mode: RenderingMode) => void;

  constructor(transformer: CoordinateTransformer, onToggle: (mode: RenderingMode) => void) {
    this.transformer = transformer;
    this.onToggle = onToggle;
    this.toggleButton = this.createToggleButton();
    
    // Add keyboard shortcut for quick toggle (T key)
    document.addEventListener('keydown', (e) => {
      if (e.key === 't' || e.key === 'T') {
        this.toggleRenderingMode();
      }
    });
  }

  /**
   * Create the toggle button in the UI
   */
  private createToggleButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.id = 'rendering-toggle';
    button.className = 'game-button';
    
    // Initial text based on current mode
    this.updateButtonText(button);
    
    // Styling
    button.style.position = 'fixed';
    button.style.top = '10px';
    button.style.right = '10px';
    button.style.padding = '8px 16px';
    button.style.backgroundColor = '#4CAF50';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '4px';
    button.style.fontSize = '14px';
    button.style.fontWeight = 'bold';
    button.style.cursor = 'pointer';
    button.style.zIndex = '1000';
    
    // Add hover effect
    button.addEventListener('mouseover', () => {
      button.style.backgroundColor = '#45a049';
    });
    
    button.addEventListener('mouseout', () => {
      button.style.backgroundColor = '#4CAF50';
    });
    
    // Add click handler
    button.addEventListener('click', () => {
      this.toggleRenderingMode();
    });
    
    // Add to document
    document.body.appendChild(button);
    
    return button;
  }

  /**
   * Toggle between rendering modes
   */
  private toggleRenderingMode(): void {
    // Get current mode
    const currentMode = this.transformer.getRenderingMode();
    
    // Toggle to the other mode
    const newMode = currentMode === RenderingMode.ISOMETRIC 
      ? RenderingMode.ORTHOGONAL 
      : RenderingMode.ISOMETRIC;
    
    // Update the transformer
    this.transformer.setRenderingMode(newMode);
    
    // Update button text
    this.updateButtonText(this.toggleButton);
    
    // Call the callback to update the game
    this.onToggle(newMode);
  }

  /**
   * Update the button text based on current mode
   */
  private updateButtonText(button: HTMLButtonElement): void {
    const currentMode = this.transformer.getRenderingMode();
    
    if (currentMode === RenderingMode.ISOMETRIC) {
      button.textContent = 'Switch to Orthogonal View (T)';
    } else {
      button.textContent = 'Switch to Isometric View (T)';
    }
  }
  
  /**
   * Add a shortcut hint to the instructions
   */
  public addShortcutToInstructions(): void {
    const instructions = document.querySelector('.instructions');
    
    if (instructions) {
      const shortcutHint = document.createElement('p');
      shortcutHint.textContent = 'Press T: Toggle between isometric and orthogonal view';
      instructions.appendChild(shortcutHint);
    }
  }
}
