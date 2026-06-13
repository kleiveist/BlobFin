#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::io::ErrorKind;
use std::path::Path;

#[tauri::command]
fn write_csv_file(path: String, contents: String) -> Result<(), String> {
    std::fs::write(path, contents).map_err(|error| format!("CSV export failed: {error}"))
}

#[tauri::command]
fn vault_create_dir_all(path: String) -> Result<(), String> {
    std::fs::create_dir_all(path).map_err(|error| format!("Vault directory could not be created: {error}"))
}

#[tauri::command]
fn vault_exists(path: String) -> Result<bool, String> {
    Ok(Path::new(&path).exists())
}

#[tauri::command]
fn vault_read_text_file(path: String) -> Result<Option<String>, String> {
    match std::fs::read_to_string(&path) {
        Ok(contents) => Ok(Some(contents)),
        Err(error) if error.kind() == ErrorKind::NotFound => Ok(None),
        Err(error) => Err(format!("Vault file could not be read: {error}")),
    }
}

#[tauri::command]
fn vault_write_text_file(path: String, contents: String) -> Result<(), String> {
    if let Some(parent) = Path::new(&path).parent() {
        std::fs::create_dir_all(parent)
            .map_err(|error| format!("Vault parent directory could not be created: {error}"))?;
    }
    std::fs::write(path, contents).map_err(|error| format!("Vault file could not be written: {error}"))
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            write_csv_file,
            vault_create_dir_all,
            vault_exists,
            vault_read_text_file,
            vault_write_text_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running BlobFin desktop application");
}
