/** Hands bytes to the user as a file download, the way the Data Center returns source files. */
export function saveBytes(name: string, bytes: Uint8Array, mediaType: string): void {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: mediaType }));
  const link = globalThis.document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export const XLSX_MEDIA_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export const CSV_MEDIA_TYPE = 'text/csv;charset=utf-8';
export const ZIP_MEDIA_TYPE = 'application/zip';
