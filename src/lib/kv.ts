// Almacenamiento clave-valor síncrono: localStorage o memoria (modo demo / sin almacenamiento).

export interface KV {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export class MemoryKV implements KV {
  private map = new Map<string, string>();
  get(k: string) { return this.map.get(k) ?? null; }
  set(k: string, v: string) { this.map.set(k, v); }
  remove(k: string) { this.map.delete(k); }
}

export function browserKV(): KV {
  try {
    const t = '__dokapp_test__';
    localStorage.setItem(t, '1');
    localStorage.removeItem(t);
    return {
      get: (k) => localStorage.getItem(k),
      set: (k, v) => localStorage.setItem(k, v),
      remove: (k) => localStorage.removeItem(k),
    };
  } catch {
    return new MemoryKV();
  }
}
