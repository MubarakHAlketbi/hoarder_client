// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use hoarder_client_lib::run;

fn main() {
    run();
}
