use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION};
use anyhow::Result as AnyhowResult;

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

#[derive(Debug, Serialize, Deserialize)]
struct Tag {
    tag_id: String,
    name: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct List {
    list_id: String,
    name: String,
}

// State
#[derive(Default)]
struct ApiKey(Mutex<Option<String>>);

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

// API Client
struct ApiClient {
    client: reqwest::Client,
    base_url: String,
}

impl ApiClient {
    fn new() -> Self {
        Self {
            client: reqwest::Client::new(),
            base_url: "https://api.hoarder.app/v1".to_string(),
        }
    }

    async fn request<T: for<'de> Deserialize<'de>>(
        &self,
        method: reqwest::Method,
        path: &str,
        api_key: &str,
        query: Option<&[(&str, &str)]>,
        body: Option<&serde_json::Value>,
    ) -> Result<T> {
        let mut headers = HeaderMap::new();
        headers.insert(
            AUTHORIZATION,
            HeaderValue::from_str(&format!("Bearer {}", api_key))
                .map_err(|e| Error::HttpError(e.to_string()))?,
        );

        let url = format!("{}{}", self.base_url, path);
        let mut request = self.client.request(method, &url).headers(headers);

        if let Some(q) = query {
            request = request.query(q);
        }

        if let Some(b) = body {
            request = request.json(b);
        }

        let response = request
            .send()
            .await
            .map_err(|e| Error::HttpError(e.to_string()))?;

        if !response.status().is_success() {
            let error = response
                .text()
                .await
                .map_err(|e| Error::HttpError(e.to_string()))?;
            return Err(Error::ApiError(error));
        }

        response
            .json()
            .await
            .map_err(|e| Error::HttpError(e.to_string()))
    }
}

// Commands
#[tauri::command(rename_all = "snake_case")]
async fn store_api_key(api_key: String, state: State<'_, ApiKey>) -> Result<()> {
    // Validate API key by making a test request
    let client = ApiClient::new();
    let method = reqwest::Method::GET;
    let path = "/bookmarks";
    let query = Some(&[("limit", "1")][..]);
    let _: BookmarksResponse = client
        .request(method, path, &api_key, query, None)
        .await
        .map_err(|_| Error::ApiError("Invalid API key".to_string()))?;

    *state.0.lock().map_err(|_| Error::StorageError)? = Some(api_key);
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
fn get_api_key(state: State<ApiKey>) -> Result<String> {
    state
        .0
        .lock()
        .map_err(|_| Error::StorageError)?
        .clone()
        .ok_or(Error::NotFound)
}

#[tauri::command(rename_all = "snake_case")]
async fn fetch_bookmarks(
    state: State<'_, ApiKey>,
    favourited: Option<bool>,
    archived: Option<bool>,
    cursor: Option<String>,
    limit: Option<u32>,
) -> Result<BookmarksResponse> {
    let api_key = get_api_key(state)?;
    let client = ApiClient::new();
    let method = reqwest::Method::GET;
    let path = "/bookmarks";

    let mut query_params = Vec::new();
    if let Some(f) = favourited {
        query_params.push(("favourited", if f { "true" } else { "false" }));
    }
    if let Some(a) = archived {
        query_params.push(("archived", if a { "true" } else { "false" }));
    }
    if let Some(c) = cursor.as_deref() {
        query_params.push(("cursor", c));
    }
    if let Some(l) = limit {
        query_params.push(("limit", &l.to_string()));
    }

    client
        .request(
            method,
            path,
            &api_key,
            Some(&query_params),
            None,
        )
        .await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(ApiKey::default())
        .invoke_handler(tauri::generate_handler![
            store_api_key,
            get_api_key,
            fetch_bookmarks
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
