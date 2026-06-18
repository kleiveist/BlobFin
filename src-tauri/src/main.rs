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
fn vault_list_project_canvas_files(path: String) -> Result<Vec<String>, String> {
    let project_root = Path::new(&path);
    let project_dirs = match std::fs::read_dir(project_root) {
        Ok(entries) => entries,
        Err(error) if error.kind() == ErrorKind::NotFound => return Ok(Vec::new()),
        Err(error) => return Err(format!("Vault project directory could not be read: {error}")),
    };
    let mut canvas_files = Vec::new();

    for project_dir in project_dirs {
        let project_dir =
            project_dir.map_err(|error| format!("Vault project directory entry could not be read: {error}"))?;
        let project_file_type = project_dir
            .file_type()
            .map_err(|error| format!("Vault project directory entry type could not be read: {error}"))?;
        if !project_file_type.is_dir() {
            continue;
        }
        let project_id = project_dir.file_name().to_string_lossy().into_owned();
        let files = std::fs::read_dir(project_dir.path())
            .map_err(|error| format!("Vault project canvas directory could not be read: {error}"))?;
        for file in files {
            let file = file.map_err(|error| format!("Vault project canvas entry could not be read: {error}"))?;
            let file_type = file
                .file_type()
                .map_err(|error| format!("Vault project canvas entry type could not be read: {error}"))?;
            if !file_type.is_file() || file.path().extension().and_then(|value| value.to_str()) != Some("canvas") {
                continue;
            }
            canvas_files.push(format!("{}/{}", project_id, file.file_name().to_string_lossy()));
        }
    }

    canvas_files.sort();
    Ok(canvas_files)
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
            vault_list_project_canvas_files,
            vault_read_text_file,
            vault_write_text_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running BlobFin desktop application");
}
