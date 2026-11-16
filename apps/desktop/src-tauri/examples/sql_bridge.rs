//! Serves the app's real IPC commands without a window, for contract tests of the
//! project storage against the real Tauri SQL plugin (`apps/desktop/src/sqlPlugin.test.ts`).
//!
//! The app is set up exactly like the desktop app ([`mateo_desktop_lib::configure`] with
//! the real `tauri.conf.json` and capabilities) on Tauri's mock runtime. Each line on
//! stdin is one IPC call, `{"id": 1, "cmd": "plugin:sql|select", "args": {...}}`; each line
//! on stdout is its answer, `{"id": 1, "ok": true, "value": ...}` or `"ok": false` with the
//! error the webview would receive. Calls are answered one at a time, in order.
//!
//! ```sh
//! cargo run --example sql_bridge
//! ```

use std::io::{self, BufRead, Write};

use serde::Deserialize;
use serde_json::{json, Value};
use tauri::ipc::{CallbackFn, InvokeBody};
use tauri::test::{get_ipc_response, mock_builder, INVOKE_KEY};
use tauri::webview::InvokeRequest;

#[derive(Deserialize)]
struct Call {
    id: u64,
    cmd: String,
    #[serde(default)]
    args: Value,
}

fn main() {
    let app = mateo_desktop_lib::configure(mock_builder(), Vec::new())
        .build(tauri::generate_context!())
        .expect("could not build the app on the mock runtime");
    // The capabilities apply to the window labelled "main".
    let webview = tauri::WebviewWindowBuilder::new(&app, "main", Default::default())
        .build()
        .expect("could not create the mock window");
    // Requests come from the app's own origin, as in the real app (dev build).
    let origin: tauri::Url = "http://localhost:5173".parse().expect("valid origin");

    let stdout = io::stdout();
    for line in io::stdin().lock().lines() {
        let line = line.expect("could not read stdin");
        if line.trim().is_empty() {
            continue;
        }
        let call: Call = serde_json::from_str(&line).expect("invalid call");
        let request = InvokeRequest {
            cmd: call.cmd,
            callback: CallbackFn(0),
            error: CallbackFn(1),
            url: origin.clone(),
            body: InvokeBody::Json(call.args),
            headers: Default::default(),
            invoke_key: INVOKE_KEY.to_string(),
        };
        let answer = match get_ipc_response(&webview, request) {
            Ok(body) => json!({
                "id": call.id,
                "ok": true,
                "value": body.deserialize::<Value>().unwrap_or(Value::Null),
            }),
            Err(error) => json!({ "id": call.id, "ok": false, "error": error }),
        };
        let mut out = stdout.lock();
        writeln!(out, "{answer}").expect("could not write stdout");
        out.flush().expect("could not flush stdout");
    }
}
