export class CleanupManager {
  private cleanupTimer?: NodeJS.Timeout;
  private cleanupFunction: () => void;
  private intervalMs: number;
  private name: string;

  constructor(cleanupFunction: () => void, intervalMs: number = 5000, name: string = 'Cleanup') {
    this.cleanupFunction = cleanupFunction;
    this.intervalMs = intervalMs;
    this.name = name;
  }

  start(): void {
    if (this.cleanupTimer) {
      console.warn(`${this.name} timer already running`);
      return;
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanupFunction();
    }, this.intervalMs);
    
    console.log(`Started ${this.name} timer (interval: ${this.intervalMs}ms)`);
  }

  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
      console.log(`Stopped ${this.name} timer`);
    }
  }

  restart(): void {
    this.stop();
    this.start();
  }

  updateInterval(intervalMs: number): void {
    this.intervalMs = intervalMs;
    if (this.cleanupTimer) {
      this.restart();
    }
  }

  isRunning(): boolean {
    return this.cleanupTimer !== undefined;
  }
}