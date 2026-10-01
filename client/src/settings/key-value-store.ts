/** Port for somewhere small to keep the player's choices between visits. */
export interface KeyValueStore {
  /** The stored text, or "" when nothing is kept under the key. */
  read(key: string): string;
  write(key: string, value: string): void;
}

/**
 * The browser's storage. Private browsing and locked-down browsers can refuse it outright, in
 * which case choices simply last until the page is closed.
 */
export class BrowserStore implements KeyValueStore {
  private readonly fallback = new MemoryStore();

  constructor(private readonly storage: () => Storage) {}

  read(key: string): string {
    try {
      return this.storage().getItem(key) ?? this.fallback.read(key);
    } catch {
      return this.fallback.read(key);
    }
  }

  write(key: string, value: string): void {
    this.fallback.write(key, value);
    try {
      this.storage().setItem(key, value);
    } catch {
      return;
    }
  }
}

export class MemoryStore implements KeyValueStore {
  private readonly values = new Map<string, string>();

  read(key: string): string {
    return this.values.get(key) ?? "";
  }

  write(key: string, value: string): void {
    this.values.set(key, value);
  }
}
