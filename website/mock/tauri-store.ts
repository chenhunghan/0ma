interface StoreOptions {
  autoSave?: boolean;
  defaults?: Record<string, unknown>;
}

class MockStore {
  private data: Map<string, unknown>;

  constructor(defaults?: Record<string, unknown>) {
    this.data = new Map(Object.entries(defaults ?? {}));
    // Pre-seed with demo data
    if (!this.data.has("selected-instance-name")) {
      this.data.set("selected-instance-name", "dev-env");
    }
    // Check URL param for tab override (used by Key Flows iframe demos)
    const autoTab = typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("autoTab")
      : null;
    if (!this.data.has("app-tabs")) {
      this.data.set("app-tabs", { activeTab: autoTab ?? "lima" });
    }
    if (!this.data.has("terminal-font-size")) {
      this.data.set("terminal-font-size", 11);
    }
  }

  async get<T>(key: string): Promise<T | undefined> {
    return this.data.get(key) as T | undefined;
  }

  async set(key: string, value: unknown): Promise<void> {
    this.data.set(key, value);
  }

  async delete(key: string): Promise<boolean> {
    return this.data.delete(key);
  }

  async save(): Promise<void> {
    // no-op in browser
  }

  async keys(): Promise<string[]> {
    return Array.from(this.data.keys());
  }

  async values(): Promise<unknown[]> {
    return Array.from(this.data.values());
  }

  async entries(): Promise<[string, unknown][]> {
    return Array.from(this.data.entries());
  }

  async length(): Promise<number> {
    return this.data.size;
  }

  async has(key: string): Promise<boolean> {
    return this.data.has(key);
  }

  async clear(): Promise<void> {
    this.data.clear();
  }

  async reset(): Promise<void> {
    this.data.clear();
  }

  async reload(): Promise<void> {
    // no-op
  }

  // Event methods (no-op)
  async onKeyValueChange(
    _key: string,
    _cb: (val: unknown) => void,
  ): Promise<() => void> {
    return () => {};
  }

  async onChange(_cb: (key: string, val: unknown) => void): Promise<() => void> {
    return () => {};
  }

  close(): void {
    // no-op
  }
}

export type Store = MockStore;

export async function load(
  _path: string,
  options?: StoreOptions,
): Promise<MockStore> {
  return new MockStore(options?.defaults);
}

export async function getStore(_path: string): Promise<MockStore | null> {
  return new MockStore();
}
