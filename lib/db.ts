/**
 * IndexedDB persistence: saved worlds plus generated image blobs.
 * Browser/device-local only. Never stores API keys.
 */
import { WorldDocSchema, type ImageMeta, type WorldDoc } from "./schema";

const DB_NAME = "worldforge-lite";
const DB_VERSION = 1;
const WORLDS_STORE = "worlds";
const IMAGES_STORE = "images";

export interface SavedWorldRow {
  id: string;
  savedAt: string;
  doc: WorldDoc;
}

export interface ImageRow {
  key: string;
  worldId: string;
  locationId: string;
  mime: string;
  blob: Blob;
  updatedAt: string;
}

export function imageKey(worldId: string, locationId: string): string {
  return `${worldId}/${locationId}`;
}

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageError";
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new StorageError("This browser does not support IndexedDB, so worlds cannot be saved locally."));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(WORLDS_STORE)) {
        db.createObjectStore(WORLDS_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(IMAGES_STORE)) {
        const store = db.createObjectStore(IMAGES_STORE, { keyPath: "key" });
        store.createIndex("worldId", "worldId", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(new StorageError("Could not open local storage."));
    req.onblocked = () => reject(new StorageError("Local storage is blocked by another open tab."));
  });
}

function tx<T>(store: string, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        let done = false;
        const finish = () => {
          if (!done) {
            done = true;
            db.close();
          }
        };
        try {
          const t = db.transaction(store, mode);
          t.oncomplete = finish;
          t.onerror = () => {
            finish();
            reject(mapDbError(t.error));
          };
          t.onabort = () => {
            finish();
            reject(mapDbError(t.error));
          };
          const req = run(t.objectStore(store));
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => {
            finish();
            reject(mapDbError(req.error));
          };
        } catch (err) {
          finish();
          reject(mapDbError(err));
        }
      }),
  );
}

function mapDbError(err: unknown): StorageError {
  const e = err as { name?: string; message?: string } | null;
  if (e?.name === "QuotaExceededError") {
    return new StorageError(
      "Browser storage is full (quota exceeded). Delete old worlds or export a backup, then free space and try again.",
    );
  }
  return new StorageError(e?.message ? `Local storage failed: ${e.message}` : "Local storage failed.");
}

/* ------------------------------ worlds ------------------------------ */

export async function listWorlds(): Promise<SavedWorldRow[]> {
  const rows = await tx<SavedWorldRow[]>(WORLDS_STORE, "readonly", (s) => s.getAll() as unknown as IDBRequest<SavedWorldRow[]>);
  return rows.sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
}

export async function getWorld(id: string): Promise<SavedWorldRow | null> {
  const row = await tx<SavedWorldRow | undefined>(WORLDS_STORE, "readonly", (s) => s.get(id) as IDBRequest<SavedWorldRow | undefined>);
  if (!row) return null;
  const parsed = WorldDocSchema.safeParse(row.doc);
  if (!parsed.success) {
    throw new StorageError(`Saved world "${id}" is corrupted (schema mismatch) and cannot be opened.`);
  }
  return { ...row, doc: parsed.data };
}

export async function putWorld(doc: WorldDoc): Promise<void> {
  const row: SavedWorldRow = {
    id: doc.world.id,
    savedAt: new Date().toISOString(),
    doc,
  };
  await tx(WORLDS_STORE, "readwrite", (s) => s.put(row));
}

export async function deleteWorld(id: string): Promise<void> {
  await tx(WORLDS_STORE, "readwrite", (s) => s.delete(id));
  await deleteWorldImages(id);
}

/* ------------------------------ images ------------------------------ */

export async function putImage(row: ImageRow): Promise<void> {
  await tx(IMAGES_STORE, "readwrite", (s) => s.put(row));
}

export async function getImage(worldId: string, locationId: string): Promise<ImageRow | null> {
  const row = await tx<ImageRow | undefined>(
    IMAGES_STORE,
    "readonly",
    (s) => s.get(imageKey(worldId, locationId)) as IDBRequest<ImageRow | undefined>,
  );
  return row ?? null;
}

export async function deleteWorldImages(worldId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    try {
      const t = db.transaction(IMAGES_STORE, "readwrite");
      t.oncomplete = () => {
        db.close();
        resolve();
      };
      t.onerror = () => {
        db.close();
        reject(mapDbError(t.error));
      };
      const store = t.objectStore(IMAGES_STORE);
      const idx = store.index("worldId");
      const range = IDBKeyRange.only(worldId);
      const cursorReq = idx.openCursor(range);
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (cursor) {
          store.delete(cursor.primaryKey);
          cursor.continue();
        }
      };
      cursorReq.onerror = () => {
        db.close();
        reject(mapDbError(cursorReq.error));
      };
    } catch (err) {
      db.close();
      reject(mapDbError(err));
    }
  });
}

export async function listWorldImageKeys(worldId: string): Promise<string[]> {
  const db = await openDb();
  return new Promise<string[]>((resolve, reject) => {
    try {
      const t = db.transaction(IMAGES_STORE, "readonly");
      const store = t.objectStore(IMAGES_STORE);
      const req = store.index("worldId").getAllKeys(IDBKeyRange.only(worldId)) as IDBRequest<string[]>;
      req.onsuccess = () => {
        db.close();
        resolve(req.result ?? []);
      };
      req.onerror = () => {
        db.close();
        reject(mapDbError(req.error));
      };
    } catch (err) {
      db.close();
      reject(mapDbError(err));
    }
  });
}

/* ------------------------- object URL cache ------------------------- */

const urlCache = new Map<string, string>();

export async function getImageUrl(worldId: string, locationId: string): Promise<string | null> {
  const key = imageKey(worldId, locationId);
  const cached = urlCache.get(key);
  if (cached) return cached;
  const row = await getImage(worldId, locationId);
  if (!row) return null;
  const url = URL.createObjectURL(row.blob);
  urlCache.set(key, url);
  return url;
}

export function dropImageUrl(worldId: string, locationId: string): void {
  const key = imageKey(worldId, locationId);
  const cached = urlCache.get(key);
  if (cached) {
    URL.revokeObjectURL(cached);
    urlCache.delete(key);
  }
}

export function dropWorldImageUrls(worldId: string): void {
  for (const key of [...urlCache.keys()]) {
    if (key.startsWith(`${worldId}/`)) {
      URL.revokeObjectURL(key);
      urlCache.delete(key);
    }
  }
}

export function base64ToBlob(base64: string, mime: string): Blob {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes.buffer], { type: mime });
}

export const DEFAULT_IMAGE_META: ImageMeta = { status: "none" };
