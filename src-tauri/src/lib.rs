mod logger;

use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;
use url::Url;
use reqwest::header::{HeaderMap, HeaderValue};

// Models
#[derive(Debug, Serialize, Deserialize)]
struct Bookmark {
    bookmark_id: String,
    url: String,
    title: String,
    favourited: bool,
    archived: bool,
    created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct BookmarksResponse {
    bookmarks: Vec<Bookmark>,
    next_cursor: Option<String>,
}

// State
#[derive(Default)]
struct AppState {
    api_key: Mutex<Option<String>>,
    base_url: Mutex<String>,
}

#[derive(Debug, thiserror::Error)]
enum Error {
    #[error("Failed to store API key")]
    StorageError,
    #[error("No API key found")]
    NotFound,
    #[error("HTTP request failed: {0}")]
    HttpError(String),
    #[error("API error: {0}")]
    ApiError(String),
    #[error("Invalid URL: {0}")]
    UrlError(String),
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

type Result<T> = std::result::Result<T, Error>;

fn normalize_url(input_url: &str) -> Result<String> {
    logger::info(&format!("Normalizing URL: {}", input_url));
    let url = Url::parse(input_url)
        .map_err(|e| {
            logger::error(&format!("URL parsing error: {}", e));
            Error::UrlError(format!("Invalid URL: {}", e))
        })?;
    
    let mut base = url.origin().ascii_serialization();
    if base.ends_with('/') {
        base.pop();
    }
    
    logger::info(&format!("Normalized URL: {}", base));
    Ok(base)
}

// API Client
struct ApiClient {
    client: reqwest::Client,
    base_url: String,
}

impl ApiClient {
    fn new(base_url: &str) -> Self {
        logger::info(&format!("Creating API client with base URL: {}", base_url));
        Self {
            client: reqwest::Client::new(),
            base_url: base_url.to_string(),
        }
    }

    fn get_api_url(&self, path: &str) -> String {
        let url = format!("{}/v1{}", self.base_url, path);
        logger::debug(&format!("Generated API URL: {}", url));
        url
    }

    async fn request<T: for<'de> Deserialize<'de>>(
        &self,
        method: reqwest::Method,
        path: &str,
        api_key: &str,
        query: Option<Vec<(String, String)>>,
    ) -> Result<T> {
        let mut headers = HeaderMap::new();
        headers.insert(
            "X-API-Key",
            HeaderValue::from_str(api_key)
                .map_err(|e| Error::HttpError(e.to_string()))?,
        );

        let url = self.get_api_url(path);
        logger::info(&format!("Making request to: {} {}", method, url));
        
        let mut request = self.client.request(method, &url).headers(headers);

        if let Some(q) = query {
            request = request.query(&q);
            logger::debug(&format!("With query params: {:?}", q));
        }

        let response = request
            .send()
            .await
            .map_err(|e| {
                logger::error(&format!("Request failed: {}", e));
                Error::HttpError(e.to_string())
            })?;

        logger::info(&format!("Response status: {}", response.status()));

        if !response.status().is_success() {
            let error = response
                .text()
                .await
                .map_err(|e| Error::HttpError(e.to_string()))?;
            logger::error(&format!("Request error: {}", error));
            return Err(Error::ApiError(error));
        }

        let result = response
            .json::<T>()
            .await
            .map_err(|e| Error::HttpError(e.to_string()))?;
        logger::info("Request successful");
        Ok(result)
    }
}

// Commands
#[tauri::command(rename_all = "snake_case")]
async fn set_base_url(url: String, state: State<'_, AppState>) -> Result<()> {
    logger::info(&format!("Setting base URL: {}", url));
    let normalized_url = normalize_url(&url)?;
    logger::info(&format!("Storing normalized URL: {}", normalized_url));
    *state.base_url.lock().map_err(|_| Error::StorageError)? = normalized_url;
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
async fn store_api_key(api_key: String, state: State<'_, AppState>) -> Result<()> {
    let base_url = state.base_url.lock().map_err(|_| Error::StorageError)?.clone();
    logger::info(&format!("Validating API key with base URL: {}", base_url));
    
    let client = ApiClient::new(&base_url);
    let method = reqwest::Method::GET;
    let path = "/bookmarks";
    let query = vec![("limit".to_string(), "1".to_string())];
    
    // Test the API key by making a request
    let _: BookmarksResponse = client
        .request(method, path, &api_key, Some(query))
        .await?;

    *state.api_key.lock().map_err(|_| Error::StorageError)? = Some(api_key);
    logger::info("API key validated and stored successfully");
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
fn get_api_key(state: State<AppState>) -> Result<String> {
    state
        .api_key
        .lock()
        .map_err(|_| Error::StorageError)?
        .clone()
        .ok_or(Error::NotFound)
}

#[tauri::command(rename_all = "snake_case")]
async fn fetch_bookmarks(
    state: State<'_, AppState>,
    favourited: Option<bool>,
    archived: Option<bool>,
    cursor: Option<String>,
    limit: Option<u32>,
) -> Result<BookmarksResponse> {
    let api_key = get_api_key(state.clone())?;
    let base_url = state.base_url.lock().map_err(|_| Error::StorageError)?.clone();

    logger::info(&format!("Fetching bookmarks with base URL: {}", base_url));
    
    let client = ApiClient::new(&base_url);
    let method = reqwest::Method::GET;
    let path = "/bookmarks";

    let mut query_params = Vec::new();
    if let Some(f) = favourited {
        query_params.push(("favourited".to_string(), f.to_string()));
    }
    if let Some(a) = archived {
        query_params.push(("archived".to_string(), a.to_string()));
    }
    if let Some(c) = cursor {
        query_params.push(("cursor".to_string(), c));
    }
    if let Some(l) = limit {
        query_params.push(("limit".to_string(), l.to_string()));
    }

    client
        .request(
            method,
            path,
            &api_key,
            Some(query_params),
        )
        .await
}

#[tauri::command(rename_all = "snake_case")]
fn get_log_path() -> Option<String> {
    logger::get_log_path().map(|p| p.to_string_lossy().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    logger::init();
    logger::info("Starting Hoarder Client");
    
    tauri::Builder::default()
        .manage(AppState {
            base_url: Mutex::new(String::new()),
            api_key: Mutex::new(None),
        })
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![
            set_base_url,
            store_api_key,
            get_api_key,
            fetch_bookmarks,
            get_log_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
