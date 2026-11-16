import { IDBFactory as FakeIdbFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import {
  indexedDbFileStore,
  memoryFileStore,
  opfsFileStore,
  type FileStore,
  type IdbFactoryLike,
  type OpfsDirectoryLike,
} from './file-store';

/** A fresh, empty IndexedDB. The package's own types need DOM types this package lacks. */
const newFactory = (): IdbFactoryLike =>
  new (FakeIdbFactory as unknown as new () => IdbFactoryLike)();

/** An in-memory directory that behaves like the origin private file system. */
function fakeOpfs(): OpfsDirectoryLike & { files: Map<string, Uint8Array>; failWrites: boolean } {
  const files = new Map<string, Uint8Array>();
  const notFound = (): Error => Object.assign(new Error('not found'), { name: 'NotFoundError' });
  const directory = {
    files,
    failWrites: false,
    getFileHandle(name: string, options?: { create?: boolean }) {
      if (!files.has(name)) {
        if (!options?.create) return Promise.reject(notFound());
        files.set(name, new Uint8Array());
      }
      return Promise.resolve({
        getFile: () =>
          Promise.resolve({ arrayBuffer: () => Promise.resolve(files.get(name)!.slice().buffer) }),
        createWritable: () => {
          let pending: Uint8Array | undefined;
          return Promise.resolve({
            write: (data: Uint8Array) => {
              if (directory.failWrites) return Promise.reject(new Error('QuotaExceededError'));
              pending = data.slice();
              return Promise.resolve();
            },
            // Like the real thing, the file is replaced only when the stream is closed.
            close: () => {
              if (pending) files.set(name, pending);
              return Promise.resolve();
            },
          });
        },
      });
    },
    removeEntry(name: string) {
      if (!files.delete(name)) return Promise.reject(notFound());
      return Promise.resolve();
    },
    async *keys() {
      for (const name of files.keys()) yield await Promise.resolve(name);
    },
  };
  return directory;
}

const stores: [string, () => FileStore][] = [
  ['memory', () => memoryFileStore()],
  ['OPFS', () => opfsFileStore(fakeOpfs())],
  ['IndexedDB', () => indexedDbFileStore(newFactory())],
];

describe.each(stores)('%s file store', (_, create) => {
  it('reads, replaces, lists and removes files', async () => {
    const store = create();
    expect(await store.read('a.mateo')).toBeNull();
    expect(await store.list()).toEqual([]);
    await store.remove('a.mateo');

    const first = Uint8Array.of(1, 2, 3);
    await store.write('b.mateo', first);
    await store.write('a.mateo', Uint8Array.of(9));
    await store.write('a.mateo', new Uint8Array(100_000).fill(7));
    first[0] = 99;
    expect(await store.read('b.mateo')).toEqual(Uint8Array.of(1, 2, 3));
    expect((await store.read('a.mateo'))!.length).toBe(100_000);
    expect(await store.list()).toEqual(['a.mateo', 'b.mateo']);

    // What is read is a copy: changing it does not change the stored file.
    (await store.read('b.mateo'))![1] = 0;
    expect(await store.read('b.mateo')).toEqual(Uint8Array.of(1, 2, 3));

    await store.remove('a.mateo');
    expect(await store.read('a.mateo')).toBeNull();
    expect(await store.list()).toEqual(['b.mateo']);
  });
});

describe('OPFS file store', () => {
  it('keeps the old content when a write fails, and passes other errors on', async () => {
    const directory = fakeOpfs();
    const store = opfsFileStore(directory);
    await store.write('a.mateo', Uint8Array.of(1));
    directory.failWrites = true;
    await expect(store.write('a.mateo', Uint8Array.of(2))).rejects.toThrow('QuotaExceededError');
    expect(await store.read('a.mateo')).toEqual(Uint8Array.of(1));

    const broken = opfsFileStore({
      getFileHandle: () => Promise.reject(new Error('SecurityError')),
      removeEntry: () => Promise.reject(new Error('SecurityError')),
      keys: () => directory.keys(),
    });
    await expect(broken.read('a.mateo')).rejects.toThrow('SecurityError');
    await expect(broken.remove('a.mateo')).rejects.toThrow('SecurityError');
  });
});

describe('IndexedDB file store', () => {
  it('keeps files across instances of the same database', async () => {
    const factory = newFactory();
    await indexedDbFileStore(factory).write('a.mateo', Uint8Array.of(5));
    expect(await indexedDbFileStore(factory).read('a.mateo')).toEqual(Uint8Array.of(5));
    expect(await indexedDbFileStore(factory, 'another').read('a.mateo')).toBeNull();
  });

  it('reports a database that cannot be opened and can retry', async () => {
    let attempts = 0;
    const real = newFactory();
    const flaky: IdbFactoryLike = {
      open(name, version) {
        attempts += 1;
        if (attempts > 1) return real.open(name, version);
        const request = {
          result: undefined as never,
          error: 'blocked',
          onsuccess: null,
          onerror: null as null | ((e: unknown) => void),
          onupgradeneeded: null,
        };
        void Promise.resolve().then(() => request.onerror?.({}));
        return request;
      },
    };
    const store = indexedDbFileStore(flaky);
    await expect(store.read('a.mateo')).rejects.toThrow('blocked');
    expect(await store.read('a.mateo')).toBeNull();
  });
});
