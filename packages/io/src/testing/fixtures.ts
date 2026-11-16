import files from 'virtual:io-fixtures';

/** Names of the files in the fixture library. */
export const FIXTURE_NAMES: readonly string[] = Object.keys(files);

/** The bytes of a fixture file. */
export function fixtureBytes(name: string): Uint8Array {
  const hex = files[name];
  if (hex === undefined) throw new Error(`There is no fixture "${name}".`);
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}
