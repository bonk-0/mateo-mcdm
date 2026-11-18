/**
 * Asks the browser not to clear the project storage when space runs low or the site has
 * not been visited for a while. Browsers decide on their own (Firefox asks the user,
 * Chromium and Safari go by how the site is used, and favour installed apps), so the
 * answer is only reported.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  const storage = (globalThis.navigator as Partial<Navigator> | undefined)?.storage;
  if (!storage?.persist) return false;
  try {
    return (await storage.persisted?.()) || (await storage.persist());
  } catch {
    return false;
  }
}
