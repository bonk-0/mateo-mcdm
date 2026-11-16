/** The fixture library (`fixtures/files`), served by the Vite plugin in `vitest.config.ts`. */
declare module 'virtual:io-fixtures' {
  const files: Readonly<Record<string, string>>;
  export default files;
}
