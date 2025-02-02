let isInitialized = false;
let initializationError = null;

// Initialize Tauri API
async function initializeTauri() {
    if (isInitialized) {
        if (initializationError) {
            throw initializationError;
        }
        return window.__TAURI__.core;
    }

    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            const error = new Error('Tauri initialization timeout');
            initializationError = error;
            reject(error);
        }, 5000);

        const checkTauri = () => {
            if (window.__TAURI__?.core?.invoke) {
                clearTimeout(timeout);
                isInitialized = true;
                resolve(window.__TAURI__.core);
            } else {
                const error = new Error('Tauri API not found');
                initializationError = error;
                reject(error);
            }
        };

        // Check if Tauri is already available
        if (window.__TAURI__?.core?.invoke) {
            checkTauri();
            return;
        }

        // Wait for the tauri://ready event
        const readyHandler = () => {
            checkTauri();
            window.removeEventListener('tauri://ready', readyHandler);
        };
        window.addEventListener('tauri://ready', readyHandler);
    });
}

// Helper function to safely invoke Tauri commands
async function invoke(cmd, args = undefined) {
    const api = await initializeTauri();
    if (!api?.invoke) {
        throw new Error('Tauri API not properly initialized');
    }
    return api.invoke(cmd, args);
}

// Logging
async function log(message, data = null) {
    const logMessage = data ? `${message}: ${JSON.stringify(data, null, 2)}` : message;
    console.log(`🔵 [HOARDER] ${logMessage}`);
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
        
        // Handle IP addresses and missing protocols
        let validUrl = url;
        if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
            validUrl = `https://${validUrl}`;
        }
        
        // Validate the URL
        const parsedUrl = new URL(validUrl);
        const isValid = parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
        
        // Check if it's an IP address
        const isIpAddress = /^(\d{1,3}\.){3}\d{1,3}(:\d+)?$/.test(url);
        
        log('URL validation result', {
            originalUrl: url,
            validatedUrl: validUrl,
            isValid,
            isIpAddress
        });
        
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

    try {
        const result = await invoke('set_base_url', { url });
        log('Server URL validation result:', { result });
        
        // Success case - Rust returns () which becomes null in JS
        if (result === null || result === undefined) {
            log('Server URL validated successfully');
            return true;
        }
        
        // Unexpected response
        throw new Error('Invalid response from server');
    } catch (err) {
        log('Server URL validation failed:', { error: err });
        
        // Parse the error message from Rust
        const errorStr = err.toString();
        if (errorStr.includes('UrlError')) {
            throw new Error('Invalid URL format. Please check the URL and try again.');
        } else if (errorStr.includes('StorageError')) {
            throw new Error('Failed to save URL. Please try again.');
        } else if (errorStr.includes('Tauri')) {
            throw new Error('Failed to connect to the application. Please restart and try again.');
        } else {
            throw new Error('Failed to validate server URL. Please check your connection and try again.');
        }
    }
}

async function validateApiKey(apiKey) {
    log('Step 2: Validating API key', { apiKey: '***' });
    updateSetupStatus('Validating API key...');
    
    if (!validateApiKey(apiKey)) {
        throw new Error('Invalid API key format');
    }

    try {
        const result = await invoke('store_api_key', { apiKey });
        log('API key validation result:', { result });
        
        // Success case - Rust returns () which becomes null in JS
        if (result === null || result === undefined) {
            log('API key validated successfully');
            return true;
        }
        
        // Unexpected response
        throw new Error('Invalid response from server');
    } catch (err) {
        log('API key validation failed:', { error: err });
        
        // Parse the error message from Rust
        const errorStr = err.toString();
        if (errorStr.includes('StorageError')) {
            throw new Error('Failed to save API key. Please try again.');
        } else if (errorStr.includes('ApiError')) {
            throw new Error('Invalid API key. Please check your credentials.');
        } else if (errorStr.includes('HttpError')) {
            throw new Error('Failed to connect to server. Please check your network connection.');
        } else if (errorStr.includes('Tauri')) {
            throw new Error('Failed to connect to the application. Please restart and try again.');
        } else {
            throw new Error('Failed to validate API key. Please try again.');
        }
    }
}

async function testConnection() {
    log('Step 3: Testing connection');
    updateSetupStatus('Testing connection...');
    
    try {
        const response = await invoke('fetch_bookmarks', { limit: 1 });
        log('Connection test result:', { response });
        
        if (response && typeof response === 'object') {
            log('Connection test successful');
            return true;
        }
        
        // Unexpected response
        throw new Error('Invalid response from server');
    } catch (err) {
        log('Connection test failed:', { error: err });
        
        // Parse the error message from Rust
        const errorStr = err.toString();
        if (errorStr.includes('NotFound')) {
            throw new Error('API key not found. Please try configuring again.');
        } else if (errorStr.includes('ApiError')) {
            throw new Error('Server rejected the request. Please check your credentials.');
        } else if (errorStr.includes('HttpError')) {
            throw new Error('Failed to connect to server. Please check your network connection.');
        } else if (errorStr.includes('Tauri')) {
            throw new Error('Failed to connect to the application. Please restart and try again.');
        } else {
            throw new Error('Connection test failed. Please try again.');
        }
    }
}

function updateSetupStatus(message, type = '') {
    setupMessage.textContent = message;
    setupMessage.className = type;
    log('Setup status updated', { message, type });
}

// Server Configuration
async function configureServer() {
    if (isLoading) {
        log('Connection attempt blocked - already loading');
        return;
    }

    const serverUrl = serverUrlInput.value.trim();
    const apiKey = apiKeyInput.value.trim();

    log('Starting connection attempt', {
        serverUrl: serverUrl,
        apiKey: '***' // Mask API key in logs
    });
    
    if (!serverUrl || !apiKey) {
        const errorMsg = 'Please enter both server URL and API key';
        error('Connection attempt failed - missing credentials', { errorMsg });
        updateSetupStatus(errorMsg, 'error');
        return;
    }

    setLoading(true);
    try {
        log('Step 1: Validating server URL');
        await validateServerUrl(serverUrl);
        
        log('Step 2: Validating API key');
        await validateApiKey(apiKey);
        
        log('Step 3: Testing connection');
        const connectionResult = await testConnection();
        log('Connection test successful', { result: connectionResult });

        // Success
        const successMsg = 'Successfully connected to server';
        log('Connection completed successfully', { message: successMsg });
        updateSetupStatus(successMsg, 'success');
        
        setTimeout(() => {
            setupSection.classList.add('hidden');
            document.getElementById('main-content').classList.remove('hidden');
            initializeApp();
        }, 1000);
    } catch (err) {
        // Parse API error messages
        let errorMsg = err.toString();
        if (err.message.includes('NetworkError')) {
            errorMsg = 'Failed to connect to server. Please check your network connection.';
        } else if (err.message.includes('Invalid API key')) {
            errorMsg = 'Invalid API key. Please check your credentials.';
        } else if (err.message.includes('Invalid URL')) {
            errorMsg = 'Invalid server URL. Please check the format and try again.';
        }

        error('Connection attempt failed', {
            error: err.toString(),
            message: errorMsg
        });
        updateSetupStatus(errorMsg, 'error');
    } finally {
        setLoading(false);
        log('Connection attempt completed');
    }
}

// Event Listeners
log('Setting up event listeners');
log('Configure button element:', configureBtn);

if (!configureBtn) {
    error('Configure button element not found!');
    error('Available elements:', {
        setupSection: !!setupSection,
        serverUrlInput: !!serverUrlInput,
        apiKeyInput: !!apiKeyInput,
        configureBtn: !!configureBtn
    });
} else {
    log('Adding click event listener to configure button');
    try {
        configureBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            log('Configure button clicked - event details:', {
                type: e.type,
                timeStamp: e.timeStamp,
                target: e.target
            });
            await configureServer();
        });
        log('Event listener successfully added to configure button');
    } catch (err) {
        error('Failed to add event listener to configure button', {
            error: err.toString(),
            stack: err.stack
        });
    }
}

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
        const errorMessage = err.message?.includes('Tauri')
            ? 'Failed to connect to the application. Please restart and try again.'
            : `Failed to fetch bookmarks: ${err.message}`;
        error('Bookmark fetch error', { error: errorMessage });
        showToast(errorMessage, 'error');
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
    try {
        log('Initializing app');
        await fetchBookmarks(true);
        log('App initialized successfully');
    } catch (err) {
        error('Failed to initialize app', { error: err.message });
        showToast('Failed to load bookmarks. Please try refreshing the page.', 'error');
    }
}

// Start the app
log('Starting app');

// Add loading overlay
const loadingOverlay = document.createElement('div');
loadingOverlay.className = 'loading-overlay';
loadingOverlay.innerHTML = `
    <div class="loading-content">
        <h2>Loading Application...</h2>
        <p>Please wait while the application initializes...</p>
    </div>
`;
document.body.appendChild(loadingOverlay);

// Initialize application
(async () => {
    try {
        // Initialize Tauri
        await initializeTauri();
        
        // Remove loading overlay
        loadingOverlay.remove();
        
        // Initialize UI
        document.getElementById('main-content').classList.add('hidden');
        log('Application initialized successfully');
    } catch (err) {
        error('Failed to initialize application', { error: err.message });
        loadingOverlay.innerHTML = `
            <div class="error-content">
                <h1>Application Error</h1>
                <p>Failed to initialize the application. Please try:</p>
                <ol>
                    <li>Restarting the application</li>
                    <li>Ensuring you have the latest version</li>
                    <li>Contact support if the issue persists</li>
                </ol>
                <p class="error-details">${err.message}</p>
            </div>
        `;
    }
})();

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
