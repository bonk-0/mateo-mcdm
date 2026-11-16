/**
 * Text encoding of CSV/TSV files: UTF-8 by default, UTF-16 when a byte order mark says so,
 * and Windows-1254 (Turkish) for files that are not valid UTF-8.
 */
import type { TextEncodingId } from './types';

/** The part of the WHATWG `TextDecoder` this package uses. Present in browsers, workers and Node. */
interface TextDecoderLike {
  decode(input: Uint8Array): string;
}
type TextDecoderConstructor = new (
  label: string,
  options?: { fatal?: boolean; ignoreBOM?: boolean },
) => TextDecoderLike;

function decoder(label: string, fatal: boolean): TextDecoderLike {
  const ctor = (globalThis as unknown as { TextDecoder: TextDecoderConstructor }).TextDecoder;
  return new ctor(label, { fatal, ignoreBOM: false });
}

export type EncodingStatus =
  /** A byte order mark names the encoding. */
  | 'bom'
  /** The bytes are valid UTF-8 (this includes plain ASCII). */
  | 'valid-utf-8'
  /** Not valid UTF-8; letters only Windows-1254 has (ş, ğ, ı, İ, Ş, Ğ) were found. */
  | 'turkish-letters'
  /** Not valid UTF-8 and nothing confirms Windows-1254. */
  | 'fallback'
  /** Chosen by the caller. */
  | 'override';

export interface DecodedText {
  readonly text: string;
  readonly encoding: TextEncodingId;
  readonly status: EncodingStatus;
  /** Number of U+FFFD replacement characters in the decoded text. */
  readonly replacements: number;
}

/** Bytes that are letters in Windows-1254 but not in Windows-1252: Ğ İ Ş ğ ı ş. */
const TURKISH_ONLY_BYTES = new Set([0xd0, 0xdd, 0xde, 0xf0, 0xfd, 0xfe]);

function bomOf(bytes: Uint8Array): { encoding: TextEncodingId; length: number } | undefined {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return { encoding: 'utf-8', length: 3 };
  }
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return { encoding: 'utf-16le', length: 2 };
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return { encoding: 'utf-16be', length: 2 };
  return undefined;
}

function countReplacements(text: string): number {
  let count = 0;
  for (const char of text) if (char === '\ufffd') count += 1;
  return count;
}

function decodeWith(bytes: Uint8Array, encoding: TextEncodingId): string {
  const bom = bomOf(bytes);
  const body = bom?.encoding === encoding ? bytes.subarray(bom.length) : bytes;
  return decoder(encoding, false).decode(body);
}

/** Decodes the bytes of a text file, detecting the encoding unless `override` is given. */
export function decodeText(bytes: Uint8Array, override?: TextEncodingId): DecodedText {
  const result = (encoding: TextEncodingId, status: EncodingStatus): DecodedText => {
    const text = decodeWith(bytes, encoding);
    return { text, encoding, status, replacements: countReplacements(text) };
  };
  if (override !== undefined) return result(override, 'override');
  const bom = bomOf(bytes);
  if (bom !== undefined) return result(bom.encoding, 'bom');
  try {
    const text = decoder('utf-8', true).decode(bytes);
    return { text, encoding: 'utf-8', status: 'valid-utf-8', replacements: 0 };
  } catch {
    // Not UTF-8: fall through to the Turkish single-byte encoding.
  }
  const turkish = bytes.some((byte) => TURKISH_ONLY_BYTES.has(byte));
  return result('windows-1254', turkish ? 'turkish-letters' : 'fallback');
}
