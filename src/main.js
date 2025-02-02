import { HoarderAPI } from './api.js';

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
let currentHighlights = [];
let currentLists = [];
let currentTags = [];
let nextCursor = null;
let activeFilters = {
    favourited: false,
    archived: false,
    searchQuery: '',
    activeList: null,
    activeTag: null
};
let isLoading = false;
let api = null;

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
const listsContainer = document.getElementById('lists-container');
const tagsContainer = document.getElementById('tags-container');
const listModal = document.getElementById('list-modal');
const listForm = document.getElementById('list-form');
const listNameInput = document.getElementById('list-name');
const bookmarkModal = document.getElementById('bookmark-modal');
const bookmarkForm = document.getElementById('bookmark-form');
const assetModal = document.getElementById('asset-modal');
const assetForm = document.getElementById('asset-form');

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

// Modal Functions
function showCreateListModal() {
    listModal.classList.remove('hidden');
    listNameInput.value = '';
    listNameInput.focus();
}

function closeListModal() {
    listModal.classList.add('hidden');
    listForm.reset();
}

function closeBookmarkModal() {
    bookmarkModal.classList.add('hidden');
    bookmarkForm.reset();
}

function closeAssetModal() {
    assetModal.classList.add('hidden');
    assetForm.reset();
}

// API Functions
async function fetchBookmarks(reset = false) {
    if (isLoading) return;
    
    if (reset) {
        currentBookmarks = [];
        nextCursor = null;
        bookmarksList.innerHTML = '';
    }

    setLoading(true);
    try {
        let response;
        if (activeFilters.searchQuery) {
            response = await api.searchBookmarks(activeFilters.searchQuery, {
                cursor: nextCursor,
                limit: 20
            });
            currentBookmarks = [...currentBookmarks, ...response.bookmarks];
            nextCursor = response.nextCursor;
        } else if (activeFilters.activeList) {
            response = await api.getListBookmarks(activeFilters.activeList, {
                cursor: nextCursor,
                limit: 20
            });
            currentBookmarks = [...currentBookmarks, ...response.items];
            nextCursor = response.meta.nextCursor;
        } else if (activeFilters.activeTag) {
            response = await api.getTagBookmarks(activeFilters.activeTag, {
                cursor: nextCursor,
                limit: 20
            });
            currentBookmarks = [...currentBookmarks, ...response.items];
            nextCursor = response.meta.nextCursor;
        } else {
            response = await api.getBookmarks({
                favourited: activeFilters.favourited || undefined,
                archived: activeFilters.archived || undefined,
                page: nextCursor ? parseInt(nextCursor) : 1,
                limit: 20
            });
            currentBookmarks = [...currentBookmarks, ...response.items];
            nextCursor = response.meta.currentPage < response.meta.totalPages 
                ? (response.meta.currentPage + 1).toString()
                : null;
        }
        
        renderBookmarks();
        loadMoreBtn.classList.toggle('hidden', !nextCursor);
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        setLoading(false);
    }
}

async function fetchLists() {
    try {
        const response = await api.getLists();
        currentLists = response.lists;
        renderLists();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function fetchTags() {
    try {
        const response = await api.getTags();
        currentTags = response.tags;
        renderTags();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Bookmark Actions
async function toggleFavorite(id, favourited) {
    try {
        await api.updateBookmark(id, { favourited });
        const bookmark = currentBookmarks.find(b => b.id === id);
        if (bookmark) {
            bookmark.favourited = favourited;
            renderBookmarks();
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function toggleArchived(id, archived) {
    try {
        await api.updateBookmark(id, { archived });
        const bookmark = currentBookmarks.find(b => b.id === id);
        if (bookmark) {
            bookmark.archived = archived;
            renderBookmarks();
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function deleteBookmark(id) {
    if (!confirm('Are you sure you want to delete this bookmark?')) return;

    try {
        await api.deleteBookmark(id);
        currentBookmarks = currentBookmarks.filter(b => b.id !== id);
        renderBookmarks();
        showToast('Bookmark deleted successfully');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function exportBookmarks() {
    try {
        await api.exportBookmarks();
        showToast('Export started');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Asset Actions
async function uploadAsset(file) {
    try {
        const response = await api.uploadAsset(file);
        return response;
    } catch (err) {
        showToast(err.message, 'error');
        throw err;
    }
}

// Rendering Functions
function renderBookmarks() {
    const bookmarksHtml = currentBookmarks.map(bookmark => `
        <div class="bookmark-card" data-id="${bookmark.id}">
            <a href="${bookmark.url}" class="bookmark-title" target="_blank">${bookmark.title}</a>
            <div class="bookmark-url">${bookmark.url}</div>
            <div class="bookmark-actions">
                <button onclick="toggleFavorite('${bookmark.id}', ${!bookmark.favourited})"
                    class="icon-btn ${bookmark.favourited ? 'active' : ''}">
                    ${bookmark.favourited ? '★' : '☆'}
                </button>
                <button onclick="toggleArchived('${bookmark.id}', ${!bookmark.archived})"
                    class="icon-btn ${bookmark.archived ? 'active' : ''}">
                    ${bookmark.archived ? '📁' : '📂'}
                </button>
                <button onclick="editBookmark('${bookmark.id}')"
                    class="icon-btn">✏️</button>
                <button onclick="deleteBookmark('${bookmark.id}')"
                    class="icon-btn">🗑️</button>
            </div>
        </div>
    `).join('');

    bookmarksList.innerHTML = bookmarksHtml || '<div class="no-bookmarks">No bookmarks found</div>';
}

function renderLists() {
    const listsHtml = currentLists.map(list => `
        <div class="list-item ${activeFilters.activeList === list.id ? 'active' : ''}"
            onclick="filterByList('${list.id}')">
            <span class="list-name">${list.name}</span>
            <button onclick="event.stopPropagation(); deleteList('${list.id}')"
                class="icon-btn small">🗑️</button>
        </div>
    `).join('');

    listsContainer.innerHTML = listsHtml || '<div class="no-lists">No lists found</div>';
}

function renderTags() {
    const tagsHtml = currentTags.map(tag => `
        <div class="tag-item ${activeFilters.activeTag === tag.id ? 'active' : ''}"
            onclick="filterByTag('${tag.id}')">
            <span class="tag-name">${tag.name}</span>
            <button onclick="event.stopPropagation(); deleteTag('${tag.id}')"
                class="icon-btn small">🗑️</button>
        </div>
    `).join('');

    tagsContainer.innerHTML = tagsHtml || '<div class="no-tags">No tags found</div>';
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
        api = new HoarderAPI(serverUrl, apiKey);
        
        const response = await api.checkHealth();
        if (response.status !== 'ok') {
            throw new Error('Failed to connect to server');
        }
        
        setConfig(serverUrl, apiKey);
        
        setupSection.classList.add('hidden');
        mainContent.classList.remove('hidden');
        
        await Promise.all([
            fetchBookmarks(true),
            fetchLists(),
            fetchTags()
        ]);
    } catch (err) {
        updateSetupStatus(err.message, 'error');
    } finally {
        setLoading(false);
    }
});

listForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = listNameInput.value.trim();
    if (!name) return;

    try {
        await api.createList({ name });
        await fetchLists();
        closeListModal();
        showToast('List created successfully');
    } catch (err) {
        showToast(err.message, 'error');
    }
});

assetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const fileInput = document.getElementById('asset-file');
    const file = fileInput.files[0];
    if (!file) return;

    try {
        await uploadAsset(file);
        closeAssetModal();
        showToast('Asset uploaded successfully');
    } catch (err) {
        // Error already handled in uploadAsset
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

// List and Tag Filters
function filterByList(listId) {
    if (activeFilters.activeList === listId) {
        activeFilters.activeList = null;
    } else {
        activeFilters.activeList = listId;
        activeFilters.activeTag = null;
        activeFilters.searchQuery = '';
        searchInput.value = '';
    }
    fetchBookmarks(true);
    renderLists();
    renderTags();
}

function filterByTag(tagId) {
    if (activeFilters.activeTag === tagId) {
        activeFilters.activeTag = null;
    } else {
        activeFilters.activeTag = tagId;
        activeFilters.activeList = null;
        activeFilters.searchQuery = '';
        searchInput.value = '';
    }
    fetchBookmarks(true);
    renderLists();
    renderTags();
}

// Initialize
const config = getConfig();
if (config) {
    serverUrlInput.value = config.serverUrl;
    apiKeyInput.value = config.apiKey;
    setupForm.dispatchEvent(new Event('submit'));
}

// Make functions available globally for onclick handlers
window.toggleFavorite = toggleFavorite;
window.toggleArchived = toggleArchived;
window.deleteBookmark = deleteBookmark;
window.exportBookmarks = exportBookmarks;
window.showCreateListModal = showCreateListModal;
window.closeListModal = closeListModal;
window.closeBookmarkModal = closeBookmarkModal;
window.closeAssetModal = closeAssetModal;
window.filterByList = filterByList;
window.filterByTag = filterByTag;
