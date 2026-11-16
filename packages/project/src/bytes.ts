import { ProjectError } from './errors';

const HEX = '0123456789abcdef';

/** Lower-case hexadecimal text of binary data. */
export function bytesToHex(bytes: Uint8Array): string {
  const parts: string[] = [];
  // Chunked so that a file of several megabytes does not build one huge array of pairs.
  for (let start = 0; start < bytes.length; start += 8192) {
    let chunk = '';
    const end = Math.min(start + 8192, bytes.length);
    for (let index = start; index < end; index += 1) {
      const byte = bytes[index] as number;
      chunk += (HEX[byte >> 4] as string) + (HEX[byte & 15] as string);
    }
    parts.push(chunk);
  }
  return parts.join('');
}

function nibble(code: number): number {
  if (code >= 48 && code <= 57) return code - 48;
  if (code >= 97 && code <= 102) return code - 87;
  if (code >= 65 && code <= 70) return code - 55;
  return -1;
}

export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new ProjectError('CORRUPT_FILE', 'Binary data in the project file is truncated.');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    const high = nibble(hex.charCodeAt(index * 2));
    const low = nibble(hex.charCodeAt(index * 2 + 1));
    if (high < 0 || low < 0) {
      throw new ProjectError('CORRUPT_FILE', 'Binary data in the project file is not valid.');
    }
    bytes[index] = (high << 4) | low;
  }
  return bytes;
}

/** UTF-8 bytes of a string. Lone surrogates become U+FFFD, as in `TextEncoder`. */
export function utf8Bytes(text: string): Uint8Array {
  const out = new Uint8Array(text.length * 3);
  let size = 0;
  for (let index = 0; index < text.length; index += 1) {
    let code = text.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = index + 1 < text.length ? text.charCodeAt(index + 1) : 0;
      if (next >= 0xdc00 && next <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
        index += 1;
      } else {
        code = 0xfffd;
      }
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      code = 0xfffd;
    }
    if (code < 0x80) {
      out[size++] = code;
    } else if (code < 0x800) {
      out[size++] = 0xc0 | (code >> 6);
      out[size++] = 0x80 | (code & 63);
    } else if (code < 0x10000) {
      out[size++] = 0xe0 | (code >> 12);
      out[size++] = 0x80 | ((code >> 6) & 63);
      out[size++] = 0x80 | (code & 63);
    } else {
      out[size++] = 0xf0 | (code >> 18);
      out[size++] = 0x80 | ((code >> 12) & 63);
      out[size++] = 0x80 | ((code >> 6) & 63);
      out[size++] = 0x80 | (code & 63);
    }
  }
  return out.slice(0, size);
}
