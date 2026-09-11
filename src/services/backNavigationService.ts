import { App as CapApp } from '@capacitor/app';
import toast from 'react-hot-toast';
import { hapticTap } from './haptics';

export interface BackHandler {
  id: string;
  priority: number; // Higher number = higher priority (e.g. 100 = full screen modal, 50 = drawer, 10 = subview)
  action: () => boolean | void; // Return false to allow next handler, return true/void to consume event
}

class BackNavigationService {
  private handlers: BackHandler[] = [];
  private lastHomeBackPressTime = 0;
  private isInitialized = false;

  /**
   * Register a custom back action (e.g., closing a modal, returning from a sub-tab).
   * Returns an unregister function.
   */
  public register(id: string, priority: number, action: () => boolean | void): () => void {
    // Remove if already exists with same ID
    this.handlers = this.handlers.filter(h => h.id !== id);
    this.handlers.push({ id, priority, action });
    // Sort descending by priority
    this.handlers.sort((a, b) => b.priority - a.priority);

    return () => {
      this.unregister(id);
    };
  }

  public unregister(id: string): void {
    this.handlers = this.handlers.filter(h => h.id !== id);
  }

  /**
   * Execute the topmost back handler or trigger default navigation
   */
  public handleBack(defaultGoBack?: () => void): boolean {
    hapticTap();

    // 1. Try to consume via registered top handlers (Modals, Drawers, Sheets, Sub-views)
    for (let i = 0; i < this.handlers.length; i++) {
      const handler = this.handlers[i];
      try {
        const consumed = handler.action();
        if (consumed !== false) {
          return true; // Successfully handled by topmost component
        }
      } catch (err) {
        console.error(`Error in back handler ${handler.id}:`, err);
      }
    }

    // 2. Fall back to app-level page navigation
    if (defaultGoBack) {
      defaultGoBack();
      return true;
    }

    return false;
  }

  /**
   * Handle back press when at root Home page (Double-tap to exit prevention)
   */
  public handleRootHomeBack(): void {
    const now = Date.now();
    if (now - this.lastHomeBackPressTime < 2200) {
      CapApp.exitApp();
    } else {
      this.lastHomeBackPressTime = now;
      toast('اسحب أو اضغط مرة أخرى للخروج من التطبيق', {
        icon: "icon:door",
        id: 'exit-app-toast',
        duration: 2000,
        style: {
          background: 'rgba(15, 23, 42, 0.95)',
          color: '#fff',
          fontWeight: 800,
          fontSize: '13px',
          borderRadius: '9999px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        },
      });
    }
  }

  /**
   * Initialize Global Hardware & Predictive Back listeners once
   */
  public init(defaultGoBackSupplier: () => () => void): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    CapApp.addListener('backButton', () => {
      const defaultGoBack = defaultGoBackSupplier();
      this.handleBack(defaultGoBack);
    });
  }
}

export const backNavigationService = new BackNavigationService();
