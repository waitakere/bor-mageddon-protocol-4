/**
 * Global Event Bus for Phaser ↔ React bridge communication.
 * Syncs game state (HP, Score, Level, Wave) to React HUD components.
 */

type EventCallback = (...args: any[]) => void;

class GameEventBus {
  private static instance: GameEventBus;
  private listeners: Map<string, EventCallback[]> = new Map();

  private constructor() {}

  static getInstance(): GameEventBus {
    if (!GameEventBus.instance) {
      GameEventBus.instance = new GameEventBus();
    }
    return GameEventBus.instance;
  }

  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: EventCallback): void {
    const cbs = this.listeners.get(event);
    if (cbs) {
      this.listeners.set(event, cbs.filter(cb => cb !== callback));
    }
  }

  emit(event: string, ...args: any[]): void {
    const cbs = this.listeners.get(event);
    if (cbs) {
      cbs.forEach(cb => cb(...args));
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

export const eventBus = GameEventBus.getInstance();

// Event type constants
export const GameEvents = {
  SCORE_UPDATE: 'score:update',
  HEALTH_UPDATE: 'health:update',
  LEVEL_UPDATE: 'level:update',
  WAVE_UPDATE: 'wave:update',
  GAME_OVER: 'game:over',
  GAME_PAUSED: 'game:paused',
  GAME_RESUMED: 'game:resumed',
  ENEMY_KILLED: 'enemy:killed',
  PLAYER_HIT: 'player:hit',
} as const;
