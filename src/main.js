import { createHoarderClient } from '@hoarderapp/sdk';

// Configuration Management
const CONFIG_KEY = 'hoarder_config';

function getConfig() {
    const config = localStorage.getItem(CONFIG_KEY);
    return config ? JSON.parse(config) : null;
}

function setConfig(serverUrl, apiKey) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ serverUrl, apiKey }));
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
let hoarderClient = null;

// DOM Elements
const setupSection = document.getElementById('setup-section');
const setupForm = document.getElementById('setup-form');
const serverUrlInput = document.getElementById('server-url');
const apiKeyInput = document.getElementById('api-key');
const setupMessage = document.getElementById('setup-message');
const mainContent = document.getElementById('main-content');
const searchInput = document.getElementById('search');
const searchBtn = document.getElementById('search-btn');
const showFavoritesBtn = document.getElementById('show-favorites');
const showArchivedBtn = document.getElementById('show-archived');
const bookmarksList = document.getElementById('bookmarks-list');
const loadMoreBtn = document.getElementById('load-more');
const loadingOverlay = document.getElementById('loading-overlay');
const toast = document.getElementById('toast');

// Validation Functions
function validateUrl(url) {
    try {
        const parsedUrl = new URL(url);
        return parsedUrl.protocol === 'https:';
    } catch {
        return false;
    }
}

function validateApiKey(apiKey) {
    return /^ak1_[a-zA-Z0-9]+_[a-zA-Z0-9]+$/.test(apiKey);
}

// UI Functions
function setLoading(loading) {
    isLoading = loading;
    loadingOverlay.classList.toggle('hidden', !loading);
    
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.disabled = loading;
    });
}

function showToast(message, type = '') {
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

function updateSetupStatus(message, type = '') {
    setupMessage.textContent = message;
    setupMessage.className = type;
}

// Bookmark Functions
async function fetchBookmarks(reset = false) {
    if (isLoading) return;
    
    if (reset) {
        currentBookmarks = [];
        nextCursor = null;
        bookmarksList.innerHTML = '';
    }

    setLoading(true);
    try {
        const params = {
            favourited: activeFilters.favourited || undefined,
            archived: activeFilters.archived || undefined,
            cursor: nextCursor,
            limit: 20
        };

        const { data, error } = await hoarderClient.GET('/v1/bookmarks', { params });
        if (error) throw new Error(error.message || 'Failed to fetch bookmarks');
        
        currentBookmarks = [...currentBookmarks, ...data.bookmarks];
        nextCursor = data.nextCursor;
        
        renderBookmarks();
        loadMoreBtn.classList.toggle('hidden', !nextCursor);
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        setLoading(false);
    }
}

function renderBookmarks() {
    const bookmarksHtml = currentBookmarks.map(bookmark => `
        <div class="bookmark-card" data-id="${bookmark.bookmarkId}">
            <a href="${bookmark.url}" class="bookmark-title" target="_blank">${bookmark.title}</a>
            <div class="bookmark-url">${bookmark.url}</div>
            <div class="bookmark-actions">
                <button onclick="toggleFavorite('${bookmark.bookmarkId}', ${!bookmark.favourited})"
                    class="icon-btn ${bookmark.favourited ? 'active' : ''}">
                    ${bookmark.favourited ? '★' : '☆'}
                </button>
                <button onclick="toggleArchived('${bookmark.bookmarkId}', ${!bookmark.archived})"
                    class="icon-btn ${bookmark.archived ? 'active' : ''}">
                    ${bookmark.archived ? '📁' : '📂'}
                </button>
                <button onclick="editBookmark('${bookmark.bookmarkId}')"
                    class="icon-btn">✏️</button>
                <button onclick="deleteBookmark('${bookmark.bookmarkId}')"
                    class="icon-btn">🗑️</button>
            </div>
        </div>
    `).join('');

    bookmarksList.innerHTML = bookmarksHtml || '<div class="no-bookmarks">No bookmarks found</div>';
}

// Event Handlers
setupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const serverUrl = serverUrlInput.value.trim();
    const apiKey = apiKeyInput.value.trim();

    if (!validateUrl(serverUrl)) {
        updateSetupStatus('Please enter a valid HTTPS URL', 'error');
        return;
    }

    if (!validateApiKey(apiKey)) {
        updateSetupStatus('Invalid API key format', 'error');
        return;
    }

    setLoading(true);
    try {
        // Create Hoarder client
        hoarderClient = createHoarderClient({
            baseUrl: serverUrl,
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        // Test connection
        const { error } = await hoarderClient.GET('/v1/bookmarks', { params: { limit: 1 } });
        if (error) throw new Error(error.message || 'Failed to connect to server');
        
        // Save configuration
        setConfig(serverUrl, apiKey);
        
        // Switch to main view
        setupSection.classList.add('hidden');
        mainContent.classList.remove('hidden');
        
        // Load initial data
        await fetchBookmarks(true);
    } catch (err) {
        updateSetupStatus(err.message, 'error');
    } finally {
        setLoading(false);
    }
});

searchBtn.addEventListener('click', () => {
    activeFilters.searchQuery = searchInput.value;
    fetchBookmarks(true);
});

showFavoritesBtn.addEventListener('click', () => {
    activeFilters.favourited = !activeFilters.favourited;
    showFavoritesBtn.classList.toggle('active');
    fetchBookmarks(true);
});

showArchivedBtn.addEventListener('click', () => {
    activeFilters.archived = !activeFilters.archived;
    showArchivedBtn.classList.toggle('active');
    fetchBookmarks(true);
});

loadMoreBtn.addEventListener('click', () => {
    if (!nextCursor) return;
    fetchBookmarks();
});

// Initialize
const config = getConfig();
if (config) {
    serverUrlInput.value = config.serverUrl;
    apiKeyInput.value = config.apiKey;
    setupForm.dispatchEvent(new Event('submit'));
}
