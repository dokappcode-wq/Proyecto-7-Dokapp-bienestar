// Almacén de fotos local: IndexedDB en el navegador, memoria en modo demo.

export interface PhotoStore {
  put(id: string, blob: Blob): Promise<void>;
  get(id: string): Promise<Blob | null>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
}

export class MemoryPhotoStore implements PhotoStore {
  private map = new Map<string, Blob>();
  async put(id: string, blob: Blob) { this.map.set(id, blob); }
  async get(id: string) { return this.map.get(id) ?? null; }
  async delete(id: string) { this.map.delete(id); }
  async clear() { this.map.clear(); }
}

export class IdbPhotoStore implements PhotoStore {
  private db: Promise<IDBDatabase>;
  constructor(name = 'dokapp-photos') {
    this.db = new Promise((resolve, reject) => {
      const req = indexedDB.open(name, 1);
      req.onupgradeneeded = () => req.result.createObjectStore('photos');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  private async tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await this.db;
    return new Promise((resolve, reject) => {
      const req = fn(db.transaction('photos', mode).objectStore('photos'));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async put(id: string, blob: Blob) { await this.tx('readwrite', (s) => s.put(blob, id)); }
  async get(id: string) { return ((await this.tx('readonly', (s) => s.get(id))) as Blob | undefined) ?? null; }
  async delete(id: string) { await this.tx('readwrite', (s) => s.delete(id)); }
  async clear() { await this.tx('readwrite', (s) => s.clear()); }
}

export function createPhotoStore(): PhotoStore {
  try {
    if (typeof indexedDB !== 'undefined') return new IdbPhotoStore();
  } catch {
    /* navegación privada sin IndexedDB */
  }
  return new MemoryPhotoStore();
}
