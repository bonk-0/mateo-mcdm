//! Mateo desktop shell.
//!
//! The UI lives in `apps/web` and builds its own native menu through the Tauri menu API
//! (so labels follow the UI language). This crate only wires up what needs the OS:
//! files opened through the `.mateo` file association.

use std::path::Path;
use std::sync::Mutex;

use tauri::{Emitter, Manager};

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

/// Keeps only paths with the `.mateo` extension (case-insensitive).
fn mateo_paths<I: IntoIterator<Item = String>>(args: I) -> Vec<String> {
    args.into_iter()
        .filter(|arg| {
            Path::new(arg)
                .extension()
                .is_some_and(|ext| ext.eq_ignore_ascii_case("mateo"))
        })
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
fn deliver_open_files(app: &tauri::AppHandle, paths: Vec<String>) {
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let launch_files = mateo_paths(std::env::args().skip(1));

    let app = tauri::Builder::default()
        .manage(OpenFilesState(Mutex::new(OpenFiles {
            ui_ready: false,
            pending: launch_files,
        })))
        .invoke_handler(tauri::generate_handler![take_pending_open_files])
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
    use super::mateo_paths;

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
}
