import { beforeEach, describe, expect, it, vi } from 'vitest';

const tauri = vi.hoisted(() => ({
  save: vi.fn<(options: unknown) => Promise<string | null>>(),
  open: vi.fn<(options: unknown) => Promise<string | null>>(),
  invoke: vi.fn<(cmd: string, args: unknown) => Promise<unknown>>(),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({ save: tauri.save, open: tauri.open }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: tauri.invoke }));
vi.mock('@tauri-apps/plugin-sql', () => ({ default: { load: vi.fn() } }));

const { createDesktopPlatform } = await import('./desktop');

const labels = () => ({
  newTitle: 'New',
  openTitle: 'Open',
  saveAsTitle: 'Save As',
  filterName: 'Mateo project',
});

describe('desktop project platform', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tauri.invoke.mockResolvedValue(undefined);
  });

  it('asks for .mateo files in the native dialogs', async () => {
    const platform = createDesktopPlatform(labels);
    tauri.save.mockResolvedValueOnce('/home/me/Suppliers.mateo');
    tauri.open.mockResolvedValueOnce('/home/me/Energy.mateo');

    expect(await platform.chooseNewLocation('Untitled project')).toBe('/home/me/Suppliers.mateo');
    expect(tauri.save).toHaveBeenCalledWith({
      title: 'New',
      defaultPath: 'Untitled project.mateo',
      filters: [{ name: 'Mateo project', extensions: ['mateo'] }],
    });
    expect(await platform.chooseOpenLocation()).toBe('/home/me/Energy.mateo');
    expect(tauri.open).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Open', multiple: false, directory: false }),
    );
  });

  it('deletes only the exact file the user agreed to replace, once', async () => {
    const platform = createDesktopPlatform(labels);
    tauri.save.mockResolvedValueOnce('/home/me/Old.mateo');
    await platform.chooseSaveAsLocation('/home/me/Current.mateo');
    expect(tauri.save).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Save As', defaultPath: '/home/me/Current.mateo' }),
    );

    await platform.removeReplacedFile('/home/me/Other.mateo');
    expect(tauri.invoke).not.toHaveBeenCalled();
    await platform.removeReplacedFile('/home/me/Old.mateo');
    expect(tauri.invoke).toHaveBeenCalledWith('remove_project_file', {
      path: '/home/me/Old.mateo',
    });
    await platform.removeReplacedFile('/home/me/Old.mateo');
    expect(tauri.invoke).toHaveBeenCalledTimes(1);
  });

  it('adds a missing extension without deleting a file the dialog never asked about', async () => {
    const platform = createDesktopPlatform(labels);
    // GTK returns the name as typed.
    tauri.save.mockResolvedValueOnce('/home/me/Suppliers');
    expect(await platform.chooseNewLocation('Untitled project')).toBe('/home/me/Suppliers.mateo');
    await platform.removeReplacedFile('/home/me/Suppliers.mateo');
    expect(tauri.invoke).not.toHaveBeenCalled();
  });

  it('returns null when a dialog is cancelled', async () => {
    const platform = createDesktopPlatform(labels);
    tauri.save.mockResolvedValueOnce(null);
    tauri.open.mockResolvedValueOnce(null);
    expect(await platform.chooseNewLocation('x')).toBeNull();
    expect(await platform.chooseOpenLocation()).toBeNull();
  });
});
