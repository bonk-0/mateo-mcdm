//! Mateo desktop shell.
//!
//! The UI lives in `apps/web` and builds its own native menu through the Tauri menu API
//! (so labels follow the UI language). This crate wires up what needs the OS:
//!
//! - files opened through the `.mateo` file association;
//! - the SQL plugin, through which the UI reads and writes project files (each project
//!   file is an SQLite database, see `docs/project-file.md`);
//! - the dialog plugin for the open and save dialogs;
//! - [`remove_project_file`], so that "New" and "Save As" can replace a file the user chose
//!   to overwrite in the save dialog.

use std::io;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use tauri::{Emitter, Manager, Runtime};

/// Event sent to the UI when the OS asks Mateo to open `.mateo` files while it runs.
const OPEN_FILES_EVENT: &str = "mateo://open-files";

/// `.mateo` files requested before the UI was ready to receive them.
#[derive(Default)]
struct OpenFiles {
    ui_ready: bool,
    pending: Vec<String>,
}

#[derive(Default)]
struct OpenFilesState(Mutex<OpenFiles>);

fn is_mateo_path(path: &Path) -> bool {
    path.extension()
        .is_some_and(|ext| ext.eq_ignore_ascii_case("mateo"))
}

/// Keeps only paths with the `.mateo` extension (case-insensitive).
fn mateo_paths<I: IntoIterator<Item = String>>(args: I) -> Vec<String> {
    args.into_iter()
        .filter(|arg| is_mateo_path(Path::new(arg)))
        .collect()
}

/// Called once by the UI after it starts listening for [`OPEN_FILES_EVENT`]. Returns the
/// files that arrived earlier (for example from the command line on Windows and Linux).
#[tauri::command]
fn take_pending_open_files(state: tauri::State<'_, OpenFilesState>) -> Vec<String> {
    let mut files = state.0.lock().expect("open files state poisoned");
    files.ui_ready = true;
    std::mem::take(&mut files.pending)
}

/// Delivers files to the UI now, or queues them until the UI asks.
#[cfg_attr(not(any(target_os = "macos", target_os = "ios")), allow(dead_code))]
fn deliver_open_files<R: Runtime>(app: &tauri::AppHandle<R>, paths: Vec<String>) {
    if paths.is_empty() {
        return;
    }
    let state = app.state::<OpenFilesState>();
    let mut files = state.0.lock().expect("open files state poisoned");
    if files.ui_ready {
        drop(files);
        let _ = app.emit(OPEN_FILES_EVENT, paths);
    } else {
        files.pending.extend(paths);
    }
}

/// SQLite keeps transient side files next to a database. A stale one left by an earlier
/// file at the same path would be applied to the new file, so they go with it.
const SQLITE_SIDE_FILES: [&str; 3] = ["-journal", "-wal", "-shm"];

fn remove_if_exists(path: &Path) -> io::Result<()> {
    match std::fs::remove_file(path) {
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(()),
        other => other,
    }
}

/// Deletes a project file and its SQLite side files, if they exist. Only absolute paths
/// to `.mateo` files that are not directories are accepted.
fn remove_project_file_at(path: &Path) -> Result<(), String> {
    if !path.is_absolute() || !is_mateo_path(path) {
        return Err(format!("not an absolute .mateo path: {}", path.display()));
    }
    if path.is_dir() {
        return Err(format!("is a directory: {}", path.display()));
    }
    remove_if_exists(path).map_err(|error| format!("{}: {error}", path.display()))?;
    for suffix in SQLITE_SIDE_FILES {
        let mut side = path.as_os_str().to_owned();
        side.push(suffix);
        let side = PathBuf::from(side);
        remove_if_exists(&side).map_err(|error| format!("{}: {error}", side.display()))?;
    }
    Ok(())
}

/// Replaces nothing by itself: the UI calls it after the user agreed, in the save dialog,
/// to overwrite an existing file with a new project or a "Save As" copy.
#[tauri::command]
fn remove_project_file(path: String) -> Result<(), String> {
    remove_project_file_at(Path::new(&path))
}

/// Everything the app registers on a builder: plugins, state and commands. Shared by
/// [`run`] and the `sql_bridge` example, which drives the same setup on the mock runtime.
pub fn configure<R: Runtime>(
    builder: tauri::Builder<R>,
    launch_files: Vec<String>,
) -> tauri::Builder<R> {
    builder
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .manage(OpenFilesState(Mutex::new(OpenFiles {
            ui_ready: false,
            pending: launch_files,
        })))
        .invoke_handler(tauri::generate_handler![
            take_pending_open_files,
            remove_project_file
        ])
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let launch_files = mateo_paths(std::env::args().skip(1));

    let app = configure(tauri::Builder::default(), launch_files)
        .build(tauri::generate_context!())
        .expect("error while building Mateo");

    app.run(|_app, _event| {
        // macOS delivers files opened from Finder as an event instead of arguments.
        #[cfg(any(target_os = "macos", target_os = "ios"))]
        if let tauri::RunEvent::Opened { urls } = &_event {
            let paths = urls
                .iter()
                .filter_map(|url| url.to_file_path().ok())
                .map(|path| path.to_string_lossy().into_owned());
            deliver_open_files(_app, mateo_paths(paths));
        }
    });
}

#[cfg(test)]
mod tests {
    use super::{mateo_paths, remove_project_file_at};
    use std::fs;

    #[test]
    fn keeps_only_mateo_files() {
        let args = [
            "--flag",
            "/a/Suppliers.mateo",
            "C:\\b\\Energy.MATEO",
            "/c/data.xlsx",
            "mateo",
        ]
        .map(String::from);
        assert_eq!(
            mateo_paths(args),
            vec![
                "/a/Suppliers.mateo".to_string(),
                "C:\\b\\Energy.MATEO".to_string()
            ]
        );
    }

    #[test]
    fn removes_a_project_file_with_its_side_files() {
        let dir = std::env::temp_dir().join(format!("mateo-remove-{}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        let file = dir.join("Old.mateo");
        let keep = dir.join("Old.mateo.bak");
        for path in [&file, &keep] {
            fs::write(path, b"x").unwrap();
        }
        for suffix in ["-journal", "-wal", "-shm"] {
            fs::write(dir.join(format!("Old.mateo{suffix}")), b"x").unwrap();
        }

        remove_project_file_at(&file).unwrap();
        let mut left: Vec<_> = fs::read_dir(&dir)
            .unwrap()
            .map(|entry| entry.unwrap().file_name().into_string().unwrap())
            .collect();
        left.sort();
        assert_eq!(left, vec!["Old.mateo.bak".to_string()]);

        // A missing file is not an error: there is nothing to replace.
        remove_project_file_at(&file).unwrap();
        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn refuses_anything_but_absolute_mateo_files() {
        let dir = std::env::temp_dir().join(format!("mateo-refuse-{}", std::process::id()));
        let folder = dir.join("Folder.mateo");
        fs::create_dir_all(&folder).unwrap();
        let other = dir.join("notes.txt");
        fs::write(&other, b"x").unwrap();

        assert!(remove_project_file_at(&other).is_err());
        assert!(remove_project_file_at(std::path::Path::new("relative.mateo")).is_err());
        assert!(remove_project_file_at(&folder).is_err());
        assert!(other.exists() && folder.exists());
        fs::remove_dir_all(&dir).unwrap();
    }
}
