const { invoke } = window.__TAURI__.tauri;

// Logging
async function log(message, data = null) {
    const logMessage = data ? `${message}: ${JSON.stringify(data, null, 2)}` : message;
    console.log(`🔵 [HOARDER] ${logMessage}`);
    
    // Get log file path for debugging
    try {
        const logPath = await invoke('get_log_path');
        if (logPath) {
            console.log(`🔵 [HOARDER] Log file: ${logPath}`);
        }
    } catch (err) {
        console.error('Failed to get log path:', err);
    }
}

function error(message, data = null) {
    const errorMessage = data ? `${message}: ${JSON.stringify(data, null, 2)}` : message;
    console.error(`🔴 [HOARDER ERROR] ${errorMessage}`);
}

// State Management
let currentBookmarks = [];
let nextCursor = null;
let activeFilters = {
    favourited: false,
    archived: false,
    searchQuery: ''
};
let isLoading = false;

// DOM Elements
const setupSection = document.getElementById('setup-section');
const serverUrlInput = document.getElementById('server-url');
const apiKeyInput = document.getElementById('api-key');
const configureBtn = document.getElementById('configure-btn');
const setupMessage = document.getElementById('setup-message');
const searchInput = document.getElementById('search');
const searchBtn = document.getElementById('search-btn');
const showFavoritesBtn = document.getElementById('show-favorites');
const showArchivedBtn = document.getElementById('show-archived');
const bookmarksList = document.getElementById('bookmarks-list');
const loadMoreBtn = document.getElementById('load-more');
const newBookmarkBtn = document.getElementById('new-bookmark-btn');
const toast = document.getElementById('toast');

// URL Validation
function validateUrl(url) {
    try {
        log('Validating URL', url);
        const parsedUrl = new URL(url);
        const isValid = parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
        log('URL validation result', { url, isValid });
        return isValid;
    } catch (err) {
        error('URL validation error', { url, error: err.message });
        return false;
    }
}

// API Key Validation
function validateApiKey(apiKey) {
    const apiKeyPattern = /^ak1_[a-zA-Z0-9]+_[a-zA-Z0-9]+$/;
    const isValid = apiKeyPattern.test(apiKey);
    log('API key validation result', { isValid });
    return isValid;
}

// Configuration Steps
async function validateServerUrl(url) {
    log('Step 1: Validating server URL', { url });
    updateSetupStatus('Validating server URL...');
    
    if (!validateUrl(url)) {
        throw new Error('Please enter a valid URL (e.g., https://hoarder.sato942.com)');
    }

    await invoke('set_base_url', { url });
    log('Server URL validated');
    return true;
}

async function validateApiKey(apiKey) {
    log('Step 2: Validating API key', { apiKey: '***' });
    updateSetupStatus('Validating API key...');
    
    if (!validateApiKey(apiKey)) {
        throw new Error('Invalid API key format');
    }

    await invoke('store_api_key', { apiKey });
    log('API key validated');
    return true;
}

async function testConnection() {
    log('Step 3: Testing connection');
    updateSetupStatus('Testing connection...');
    
    const response = await invoke('fetch_bookmarks', { limit: 1 });
    log('Connection test successful', { response });
    return true;
}

function updateSetupStatus(message, type = '') {
    setupMessage.textContent = message;
    setupMessage.className = type;
    log('Setup status updated', { message, type });
}

// Server Configuration
async function configureServer() {
    if (isLoading) return;

    const serverUrl = serverUrlInput.value.trim();
    const apiKey = apiKeyInput.value.trim();

    log('Starting configuration', { serverUrl });
    
    if (!serverUrl || !apiKey) {
        updateSetupStatus('Please enter both server URL and API key', 'error');
        return;
    }

    setLoading(true);
    try {
        // Step 1: Validate Server URL
        await validateServerUrl(serverUrl);
        
        // Step 2: Validate API Key
        await validateApiKey(apiKey);
        
        // Step 3: Test Connection
        await testConnection();

        // Success
        updateSetupStatus('Configuration successful', 'success');
        log('Configuration completed successfully');
        
        setTimeout(() => {
            setupSection.classList.add('hidden');
            document.getElementById('main-content').classList.remove('hidden');
            initializeApp();
        }, 1000);
    } catch (err) {
        error('Configuration error', { error: err.toString() });
        updateSetupStatus(err.toString(), 'error');
    } finally {
        setLoading(false);
    }
}

// Event Listeners
configureBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    log('Configure button clicked');
    await configureServer();
});

// Bookmark Management
async function fetchBookmarks(reset = false) {
    if (isLoading) return;
    
    if (reset) {
        currentBookmarks = [];
        nextCursor = null;
        bookmarksList.innerHTML = '';
    }

    log('Fetching bookmarks', { reset, filters: activeFilters, cursor: nextCursor });
    setLoading(true);
    try {
        const response = await invoke('fetch_bookmarks', {
            favourited: activeFilters.favourited,
            archived: activeFilters.archived,
            cursor: nextCursor,
            limit: 20
        });
        log('Bookmarks fetched', { 
            count: response.bookmarks.length,
            nextCursor: response.next_cursor 
        });
        
        currentBookmarks = [...currentBookmarks, ...response.bookmarks];
        nextCursor = response.next_cursor;
        
        renderBookmarks();
        loadMoreBtn.classList.toggle('hidden', !nextCursor);
    } catch (err) {
        error('Bookmark fetch error', { error: err.toString() });
        showToast(err.toString(), 'error');
    } finally {
        setLoading(false);
    }
}

function renderBookmarks() {
    log('Rendering bookmarks', { count: currentBookmarks.length });
    const bookmarksHtml = currentBookmarks.map(bookmark => `
        <div class="bookmark-card" data-id="${bookmark.bookmark_id}">
            <a href="${bookmark.url}" class="bookmark-title" target="_blank">${bookmark.title}</a>
            <div class="bookmark-url">${bookmark.url}</div>
            <div class="bookmark-actions">
                <button onclick="toggleFavorite('${bookmark.bookmark_id}', ${!bookmark.favourited})"
                    class="icon-btn ${bookmark.favourited ? 'active' : ''}">
                    ${bookmark.favourited ? '★' : '☆'}
                </button>
                <button onclick="toggleArchived('${bookmark.bookmark_id}', ${!bookmark.archived})"
                    class="icon-btn ${bookmark.archived ? 'active' : ''}">
                    ${bookmark.archived ? '📁' : '📂'}
                </button>
                <button onclick="editBookmark('${bookmark.bookmark_id}')"
                    class="icon-btn">✏️</button>
                <button onclick="deleteBookmark('${bookmark.bookmark_id}')"
                    class="icon-btn">🗑️</button>
            </div>
        </div>
    `).join('');

    bookmarksList.innerHTML = bookmarksHtml || '<div class="no-bookmarks">No bookmarks found</div>';
    log('Bookmarks rendered');
}

// Event Listeners
searchBtn.addEventListener('click', () => {
    activeFilters.searchQuery = searchInput.value;
    log('Search clicked', { query: activeFilters.searchQuery });
    fetchBookmarks(true);
});

showFavoritesBtn.addEventListener('click', () => {
    activeFilters.favourited = !activeFilters.favourited;
    showFavoritesBtn.classList.toggle('active');
    log('Favorites filter toggled', { favourited: activeFilters.favourited });
    fetchBookmarks(true);
});

showArchivedBtn.addEventListener('click', () => {
    activeFilters.archived = !activeFilters.archived;
    showArchivedBtn.classList.toggle('active');
    log('Archived filter toggled', { archived: activeFilters.archived });
    fetchBookmarks(true);
});

loadMoreBtn.addEventListener('click', () => {
    if (!nextCursor) return;
    log('Loading more bookmarks', { nextCursor });
    fetchBookmarks();
});

// Utility Functions
function setLoading(loading) {
    isLoading = loading;
    document.body.classList.toggle('loading', loading);
    log('Loading state changed', { loading });
    
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.disabled = loading;
    });
}

function showToast(message, type = 'info') {
    log('Showing toast', { message, type });
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// Initialize App
async function initializeApp() {
    log('Initializing app');
    await fetchBookmarks(true);
}

// Start the app
log('Starting app');
document.getElementById('main-content').classList.add('hidden');

// Debug helper
window.addEventListener('error', (event) => {
    error('Uncaught error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.toString()
    });
});
