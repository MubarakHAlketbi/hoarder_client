const { invoke } = window.__TAURI__.tauri;

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
const apiKeyInput = document.getElementById('api-key');
const apiKeySubmit = document.getElementById('api-key-submit');
const apiKeyMessage = document.getElementById('api-key-message');
const searchInput = document.getElementById('search');
const searchBtn = document.getElementById('search-btn');
const showFavoritesBtn = document.getElementById('show-favorites');
const showArchivedBtn = document.getElementById('show-archived');
const bookmarksList = document.getElementById('bookmarks-list');
const loadMoreBtn = document.getElementById('load-more');
const newBookmarkBtn = document.getElementById('new-bookmark-btn');
const toast = document.getElementById('toast');

// API Key Management
async function checkStoredApiKey() {
    try {
        const storedKey = await invoke('get_api_key');
        if (storedKey) {
            apiKeyMessage.textContent = 'API key is already stored';
            apiKeyMessage.className = 'success';
            apiKeyInput.value = storedKey;
            initializeApp();
        }
    } catch (error) {
        if (error !== 'No API key found') {
            showToast('Error checking API key', 'error');
        }
    }
}

apiKeySubmit.addEventListener('click', async () => {
    if (isLoading) return;
    
    const apiKey = apiKeyInput.value;
    const apiKeyPattern = /^ak1_[a-zA-Z0-9]+_[a-zA-Z0-9]+$/;

    if (!apiKeyPattern.test(apiKey)) {
        apiKeyMessage.textContent = 'Invalid API key format';
        apiKeyMessage.className = 'error';
        return;
    }

    setLoading(true);
    try {
        await invoke('store_api_key', { apiKey });
        apiKeyMessage.textContent = 'API key stored successfully';
        apiKeyMessage.className = 'success';
        initializeApp();
    } catch (error) {
        console.error('Error storing API key:', error);
        apiKeyMessage.textContent = 'Failed to store API key';
        apiKeyMessage.className = 'error';
    } finally {
        setLoading(false);
    }
});

// Bookmark Management
async function fetchBookmarks(reset = false) {
    if (isLoading) return;
    
    if (reset) {
        currentBookmarks = [];
        nextCursor = null;
        bookmarksList.innerHTML = '';
    }

    setLoading(true);
    try {
        const response = await invoke('fetch_bookmarks', {
            favourited: activeFilters.favourited,
            archived: activeFilters.archived,
            cursor: nextCursor,
            limit: 20
        });
        
        currentBookmarks = [...currentBookmarks, ...response.bookmarks];
        nextCursor = response.next_cursor;
        
        renderBookmarks();
        loadMoreBtn.classList.toggle('hidden', !nextCursor);
    } catch (error) {
        showToast('Failed to fetch bookmarks', 'error');
        console.error('Error fetching bookmarks:', error);
    } finally {
        setLoading(false);
    }
}

function renderBookmarks() {
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
}

// Event Listeners
searchBtn.addEventListener('click', () => {
    if (isLoading) return;
    activeFilters.searchQuery = searchInput.value;
    fetchBookmarks(true);
});

showFavoritesBtn.addEventListener('click', () => {
    if (isLoading) return;
    activeFilters.favourited = !activeFilters.favourited;
    showFavoritesBtn.classList.toggle('active');
    fetchBookmarks(true);
});

showArchivedBtn.addEventListener('click', () => {
    if (isLoading) return;
    activeFilters.archived = !activeFilters.archived;
    showArchivedBtn.classList.toggle('active');
    fetchBookmarks(true);
});

loadMoreBtn.addEventListener('click', () => {
    if (!isLoading && nextCursor) {
        fetchBookmarks();
    }
});

// Utility Functions
function setLoading(loading) {
    isLoading = loading;
    document.body.classList.toggle('loading', loading);
    
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.disabled = loading;
    });
}

function showToast(message, type = 'info') {
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// Initialize App
async function initializeApp() {
    await fetchBookmarks(true);
}

// Start the app
checkStoredApiKey();
