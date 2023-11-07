use tauri::{ Manager, AppHandle, RunEvent, App, WindowMenuEvent };

use crate::app_state::loaded_shortcuts::LoadedShortcuts;
use crate::app_state::{json_file::JSONFile, load_app_state_from_recovery_string, load_json_file};
use crate::character_data::CharacterData;
use crate::disk_interactions::{load_startup_data, open_character_sheet, save_character_sheet, save_as_character_sheet};
use crate::ipc::{ load_data, PressedKey };
use crate::windows;

pub fn menu_event_handler(event: WindowMenuEvent) {
    match event.menu_item_id() {
        "open" => {
            open_character_sheet(event.window().clone());
        }
        "save" => {
            let _ = save_character_sheet(event.window().app_handle().state::<JSONFile>());
        }
        "save as" => {
            save_as_character_sheet(event.window().clone());
        }
        "new" => {
            let app_handle = event.window().app_handle();
            let v = CharacterData::generate_empty();
            let p = "".into();
            load_json_file(&app_handle, v, p);
            let _ = load_data(&app_handle);
        }
        "undo" => {
            let app_handle = event.window().app_handle();
            app_handle.state::<JSONFile>().go_back();
            let _ = load_data(&app_handle);
        }
        "redo" => {
            let app_handle = event.window().app_handle();
            app_handle.state::<JSONFile>().go_forward();
            let _ = load_data(&app_handle);
        },
        "add_element" => {
            let app_handle = event.window().app_handle();
            let _ = match app_handle.get_window("add_element") {
                Some(w) => w.set_focus(),
                None => windows::add_element::builder(app_handle),
            };
        },
        "remove_element" => {
            let app_handle = event.window().app_handle();
            let _ = match app_handle.get_window("remove_element") {
                Some(w) => w.set_focus(),
                None => windows::remove_element::builder(app_handle),
            };
        },
        "readonly_switch" => {
            let app_handle = event.window().app_handle();
            crate::ipc::change_editor_context(&app_handle, "readOnly-switch".to_string());
        }
        "layout_switch" => {
            let app_handle = event.window().app_handle();
            crate::ipc::change_editor_context(&app_handle, "layoutEdit-switch".to_string());
        }
        "element_switch" => {
            let app_handle = event.window().app_handle();
            crate::ipc::change_editor_context(&app_handle, "elementEdit-switch".to_string());
        }
        e => println!("Got an unimplemented menu event with id: {:?}", e),
    }
}

pub fn run_event_handler(app_handle: &AppHandle, event: RunEvent) {
    match event {
        tauri::RunEvent::Ready => {
            let r_s = match load_startup_data(&app_handle) {
                Ok(s) => s,
                Err(_) => return,
            };
            load_app_state_from_recovery_string(app_handle, &r_s);
        }
        tauri::RunEvent::WindowEvent { label, event, .. } => windows::run_event_handler(app_handle, label, event),
        tauri::RunEvent::MainEventsCleared => {
            windows::after_events_cleared(app_handle);
        }
        _ => {}
    }
}

pub fn setup_app_event_listeners(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
    app.listen_global("error", log_tauri_error);
    let handle = app.handle();
    app.listen_global("keypress", move |e| { // keypress event
        let payload_contents = match e.payload() {
            Some(s) => s,
            None => {
                handle.trigger_global("error", Some("empty payload on the keypress event".to_string()));
                return;
            }
        };
        let payload_as_json = match serde_json::from_str(payload_contents) {
            Ok(p) => p,
            Err(e) => {
                handle.trigger_global("error", Some(e.to_string()));
                return;
            },
        };
        let pressed_key = PressedKey::from_json(payload_as_json);
        shortcut_handler(&handle, &pressed_key);
    }); // keypress event
    Ok(())
}

pub fn shortcut_handler(app_handle: &AppHandle, key: &PressedKey) {
    let state = app_handle.state::<LoadedShortcuts>();
    let action = match state.get_entry(key) {
        Some(a) => a,
        None => return,
    };

    match action.as_str() {
        "save" => {
            let _ = save_character_sheet(app_handle.state::<JSONFile>());
        },
        "undo" => {
            app_handle.state::<JSONFile>().go_back();
            let _ = load_data(&app_handle);
        },
        "redo" => {
            app_handle.state::<JSONFile>().go_forward();
            let _ = load_data(&app_handle);
        },
        "open-add" => {
            let h = app_handle.clone();
            let _ = match app_handle.get_window("add_element") {
                Some(w) => {
                    let _ = w.set_focus();
                    w.show()
                }
                None => windows::add_element::builder(h),
            };
        }
        "open-rem" => {
            let h = app_handle.clone();
            let _ = match app_handle.get_window("remove_element") {
                Some(w) => {
                    let _ = w.set_focus();
                    w.show()
                }
                None => windows::remove_element::builder(h),
            };
        }
        "mod1" => {
            crate::ipc::change_editor_context(app_handle, "readOnly-switch".to_string());
        }
        "mod2" => {
            crate::ipc::change_editor_context(app_handle, "layoutEdit-switch".to_string());
        }
        "mod3" => {
            crate::ipc::change_editor_context(app_handle, "elementEdit-switch".to_string());
        }
        _ => return,
    }
}

fn log_tauri_error(event: tauri::Event) {
    match event.payload() {
        Some(payload) => println!("{}", payload),
        None => println!("error happened, somewhere, somehow"),
    }
}