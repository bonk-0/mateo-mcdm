import { describe, expect, it } from 'vitest';
import desktopPackage from '../package.json';
import config from '../src-tauri/tauri.conf.json';

/** Guards the parts of the Tauri configuration that P1.7 promises. */
describe('Tauri configuration', () => {
  it('loads the web app in development and from its build output', () => {
    expect(config.build.devUrl).toBe('http://localhost:5173');
    expect(config.build.frontendDist).toBe('../../web/dist');
    expect(config.build.beforeBuildCommand).toContain('@mateo/web build');
  });

  it('associates .mateo files with Mateo', () => {
    expect(config.bundle.fileAssociations).toEqual([
      expect.objectContaining({ ext: ['mateo'], name: 'Mateo Project', role: 'Editor' }),
    ]);
  });

  it('takes its version from the desktop package', () => {
    expect(config.version).toBe('../package.json');
    expect(desktopPackage.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('restricts content to the app itself', () => {
    const csp = config.app.security.csp;
    expect(csp).toContain("default-src 'self'");
    // JavaScript eval stays forbidden; compiling the bundled WebAssembly (the HiGHS solver,
    // P2.2) is allowed, and only from the app's own scripts.
    expect(csp).not.toContain("'unsafe-eval'");
    expect(csp).toContain("script-src 'self' 'wasm-unsafe-eval';");
  });
});
