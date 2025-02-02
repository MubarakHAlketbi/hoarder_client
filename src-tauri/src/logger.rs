use chrono::Local;
use std::fs::{self, File, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::sync::Mutex;
use lazy_static::lazy_static;

lazy_static! {
    static ref LOGGER: Mutex<Logger> = Mutex::new(Logger::new());
}

pub struct Logger {
    log_file: Option<File>,
    log_path: PathBuf,
}

#[derive(Debug)]
pub enum LogLevel {
    INFO,
    ERROR,
    DEBUG,
}

impl Logger {
    fn new() -> Self {
        let log_dir = PathBuf::from("logs");
        fs::create_dir_all(&log_dir).expect("Failed to create logs directory");
        
        let timestamp = Local::now().format("%Y%m%d_%H%M%S");
        let log_path = log_dir.join(format!("hoarder_{}.log", timestamp));
        
        let log_file = OpenOptions::new()
            .create(true)
            .write(true)
            .append(true)
            .open(&log_path)
            .expect("Failed to create log file");

        Logger {
            log_file: Some(log_file),
            log_path,
        }
    }

    fn write_log(&mut self, level: LogLevel, message: &str) {
        if let Some(file) = &mut self.log_file {
            let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S%.3f");
            let log_line = format!("[{:?}] {} - {}\n", level, timestamp, message);
            
            // Write to file
            if let Err(e) = file.write_all(log_line.as_bytes()) {
                eprintln!("Failed to write to log file: {}", e);
            }
            if let Err(e) = file.flush() {
                eprintln!("Failed to flush log file: {}", e);
            }

            // Also print to console for development
            println!("{}", log_line.trim());
        }
    }
}

pub fn init() {
    // Initialize logger by taking a lock and immediately dropping it
    drop(LOGGER.lock().unwrap());
}

pub fn info(message: &str) {
    if let Ok(mut logger) = LOGGER.lock() {
        logger.write_log(LogLevel::INFO, message);
    }
}

pub fn error(message: &str) {
    if let Ok(mut logger) = LOGGER.lock() {
        logger.write_log(LogLevel::ERROR, message);
    }
}

pub fn debug(message: &str) {
    if let Ok(mut logger) = LOGGER.lock() {
        logger.write_log(LogLevel::DEBUG, message);
    }
}

pub fn get_log_path() -> Option<PathBuf> {
    LOGGER.lock().ok().map(|logger| logger.log_path.clone())
}