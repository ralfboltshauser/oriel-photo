import type { OrielDesktopBridge } from '@oriel/domain';

declare global {
  interface Window {
    oriel?: OrielDesktopBridge;
  }
}

export {};
