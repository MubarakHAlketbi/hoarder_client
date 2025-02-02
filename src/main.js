import { HoarderAPI } from './api.js';

// Configuration Management
const CONFIG_KEY = 'hoarder_config';
const THEME_KEY = 'theme';

function getConfig() {
    const config = localStorage.getItem(CONFIG_KEY);
    return config ? JSON.parse(config) : null;
}

function setConfig(serverUrl, apiKey) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ serverUrl, apiKey }));
    updateServerDisplay();
}

function getTheme() {
    return localStorage.getItem(THEME_KEY) || 'dark';
}

function setTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.setAttribute('data-theme', theme);
}

// State Management
let currentBookmarks = [];
let currentHighlights = [];
let currentLists = [];
let currentTags = [];
let nextCursor = null;
let currentPage = 1;
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
const exportBtn = document.getElementById('export-btn');
const settingsBtn = document.getElementById('settings-btn');
const bookmarksList = document.getElementById('bookmarks-list');
const loadMoreBtn = document.getElementById('load-more');
const loadingOverlay = document.getElementById('loading-overlay');
const toast = document.getElementById('toast');
const listsContainer = document.getElementById('lists-container');
const tagsContainer = document.getElementById('tags-container');
const newListBtn = document.getElementById('new-list-btn');
const settingsPage = document.getElementById('settings-page');
const backBtn = document.getElementById('back-btn');
const themeToggle = document.getElementById('theme-toggle');
const currentServer = document.getElementById('current-server');
const changeServerBtn = document.getElementById('change-server-btn');
const changeApiKeyBtn = document.getElementById('change-api-key-btn');
const exportDataBtn = document.getElementById('export-data-btn');

// Modals
const listModal = document.getElementById('list-modal');
const listForm = document.getElementById('list-form');
const listNameInput = document.getElementById('list-name');
const cancelListBtn = document.getElementById('cancel-list-btn');

const bookmarkModal = document.getElementById('bookmark-modal');
const bookmarkForm = document.getElementById('bookmark-form');
const cancelBookmarkBtn = document.getElementById('cancel-bookmark-btn');

const assetModal = document.getElementById('asset-modal');
const assetForm = document.getElementById('asset-form');
const cancelAssetBtn = document.getElementById('cancel-asset-btn');

// Settings Functions
function showSettings() {
    mainContent.classList.add('hidden');
    settingsPage.classList.remove('hidden');
}

function hideSettings() {
    settingsPage.classList.add('hidden');
    mainContent.classList.remove('hidden');
}

function updateServerDisplay() {
    const config = getConfig();
    if (config?.serverUrl) {
        currentServer.textContent = config.serverUrl;
    }
}

function toggleTheme() {
    const newTheme = getTheme() === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    themeToggle.checked = newTheme === 'dark';
}

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
function showListModal() {
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

// Helper Functions
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getBookmarksFromResponse(response) {
    if (!response) return [];
    
    if (Array.isArray(response.bookmarks)) {
        return response.bookmarks;
    }
    
    if (Array.isArray(response.items)) {
        return response.items;
    }
    
    if (Array.isArray(response)) {
        return response;
    }
    
    console.warn('Unexpected response format:', response);
    return [];
}

function getNextCursorFromResponse(response) {
    if (!response) return null;
    
    if (response.nextCursor !== undefined) {
        return response.nextCursor;
    }
    
    if (response.meta?.nextCursor !== undefined) {
        return response.meta.nextCursor;
    }
    
    if (response.meta?.currentPage !== undefined && response.meta?.totalPages !== undefined) {
        return response.meta.currentPage < response.meta.totalPages 
            ? response.meta.currentPage + 1
            : null;
    }
    
    console.warn('Could not determine next cursor from response:', response);
    return null;
}

// API Functions
async function fetchBookmarks(reset = false) {
    if (isLoading) return;
    
    if (reset) {
        currentBookmarks = [];
        nextCursor = null;
        currentPage = 1;
        bookmarksList.innerHTML = '<div class="loading-skeleton"></div>';
    }

    setLoading(true);
    try {
        let response;
        const params = { limit: 20 };

        if (activeFilters.searchQuery) {
            if (nextCursor) {
                params.cursor = nextCursor;
            }
            response = await api.searchBookmarks(activeFilters.searchQuery, params);
        } else if (activeFilters.activeList) {
            if (nextCursor) {
                params.cursor = nextCursor;
            }
            response = await api.getListBookmarks(activeFilters.activeList, params);
        } else if (activeFilters.activeTag) {
            if (nextCursor) {
                params.cursor = nextCursor;
            }
            response = await api.getTagBookmarks(activeFilters.activeTag, params);
        } else {
            params.page = currentPage;
            if (activeFilters.favourited) {
                params.favourited = true;
            }
            if (activeFilters.archived) {
                params.archived = true;
            }
            response = await api.getBookmarks(params);
        }

        const newBookmarks = getBookmarksFromResponse(response);
        currentBookmarks = [...currentBookmarks, ...newBookmarks];
        nextCursor = getNextCursorFromResponse(response);
        if (nextCursor && !activeFilters.searchQuery && !activeFilters.activeList && !activeFilters.activeTag) {
            currentPage = nextCursor;
        }
        
        renderBookmarks();
        loadMoreBtn.classList.toggle('hidden', !nextCursor);
    } catch (err) {
        console.error('Error fetching bookmarks:', err);
        showToast(err.message, 'error');
    } finally {
        setLoading(false);
    }
}

async function fetchLists() {
    listsContainer.innerHTML = '<div class="loading-skeleton"></div>';
    try {
        const response = await api.getLists();
        currentLists = Array.isArray(response?.lists) ? response.lists : [];
        renderLists();
    } catch (err) {
        console.error('Error fetching lists:', err);
        showToast(err.message, 'error');
    }
}

async function fetchTags() {
    tagsContainer.innerHTML = '<div class="loading-skeleton"></div>';
    try {
        const response = await api.getTags();
        currentTags = Array.isArray(response?.tags) ? response.tags : [];
        renderTags();
    } catch (err) {
        console.error('Error fetching tags:', err);
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
        console.error('Error toggling favorite:', err);
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
        console.error('Error toggling archived:', err);
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
        console.error('Error deleting bookmark:', err);
        showToast(err.message, 'error');
    }
}

async function exportBookmarks() {
    try {
        await api.exportBookmarks();
        showToast('Export started');
    } catch (err) {
        console.error('Error exporting bookmarks:', err);
        showToast(err.message, 'error');
    }
}

// Asset Actions
async function uploadAsset(file) {
    try {
        const response = await api.uploadAsset(file);
        return response;
    } catch (err) {
        console.error('Error uploading asset:', err);
        showToast(err.message, 'error');
        throw err;
    }
}

// Rendering Functions
function renderBookmarks() {
    const bookmarksHtml = currentBookmarks.map(bookmark => {
        if (!bookmark?.id) {
            console.warn('Invalid bookmark:', bookmark);
            return '';
        }
        return `
            <div class="bookmark-card" data-id="${bookmark.id}">
                <div class="bookmark-content">
                    <a href="${bookmark.url || '#'}" class="bookmark-title" target="_blank">
                        ${bookmark.title || 'Untitled'}
                    </a>
                    <div class="bookmark-url">${bookmark.url || ''}</div>
                    <div class="bookmark-actions">
                        <button type="button" class="icon-btn favorite-btn ${bookmark.favourited ? 'active' : ''}"
                            data-id="${bookmark.id}" data-favourited="${bookmark.favourited || false}"
                            data-tooltip="${bookmark.favourited ? 'Remove from Favorites' : 'Add to Favorites'}">
                            ${bookmark.favourited ? '★' : '☆'}
                        </button>
                        <button type="button" class="icon-btn archive-btn ${bookmark.archived ? 'active' : ''}"
                            data-id="${bookmark.id}" data-archived="${bookmark.archived || false}"
                            data-tooltip="${bookmark.archived ? 'Unarchive' : 'Archive'}">
                            ${bookmark.archived ? '📁' : '📂'}
                        </button>
                        <button type="button" class="icon-btn edit-btn" data-id="${bookmark.id}"
                            data-tooltip="Edit">✏️</button>
                        <button type="button" class="icon-btn delete-btn" data-id="${bookmark.id}"
                            data-tooltip="Delete">🗑️</button>
                    </div>
                    <div class="bookmark-metadata">
                        <div class="metadata-item">
                            <span class="metadata-label">Created:</span>
                            <span class="metadata-value">${new Date(bookmark.createdAt).toLocaleString()}</span>
                        </div>
                        <div class="metadata-item">
                            <span class="metadata-label">Last Updated:</span>
                            <span class="metadata-value">${new Date(bookmark.updatedAt).toLocaleString()}</span>
                        </div>
                        ${bookmark.description ? `
                            <div class="metadata-item">
                                <span class="metadata-label">Description:</span>
                                <span class="metadata-value">${bookmark.description}</span>
                            </div>
                        ` : ''}
                        ${bookmark.lists?.length ? `
                            <div class="metadata-item">
                                <span class="metadata-label">Lists:</span>
                                <div class="metadata-tags">
                                    ${bookmark.lists.map(list => `
                                        <span class="metadata-tag">${list.name}</span>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                        ${bookmark.tags?.length ? `
                            <div class="metadata-item">
                                <span class="metadata-label">Tags:</span>
                                <div class="metadata-tags">
                                    ${bookmark.tags.map(tag => `
                                        <span class="metadata-tag">${tag.name}</span>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                        ${bookmark.assets?.length ? `
                            <div class="metadata-item">
                                <span class="metadata-label">Assets:</span>
                                <div class="metadata-assets">
                                    ${bookmark.assets.map(asset => `
                                        <div class="asset-item">
                                            <span class="asset-name">${asset.fileName}</span>
                                            <span class="asset-size">${formatFileSize(asset.size)}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="bookmark-expand"></div>
            </div>
        `;
    }).join('');

    bookmarksList.innerHTML = bookmarksHtml || '<div class="no-bookmarks">No bookmarks found</div>';
}

function renderLists() {
    const listsHtml = currentLists.map(list => {
        if (!list?.id) {
            console.warn('Invalid list:', list);
            return '';
        }
        return `
            <div class="list-item ${activeFilters.activeList === list.id ? 'active' : ''}"
                data-id="${list.id}">
                <span class="list-name">${list.name || 'Untitled List'}</span>
                <button type="button" class="icon-btn small delete-list-btn" data-id="${list.id}">🗑️</button>
            </div>
        `;
    }).join('');

    listsContainer.innerHTML = listsHtml || '<div class="no-lists">No lists found</div>';
}

function renderTags() {
    const tagsHtml = currentTags.map(tag => {
        if (!tag?.id) {
            console.warn('Invalid tag:', tag);
            return '';
        }
        return `
            <div class="tag-item ${activeFilters.activeTag === tag.id ? 'active' : ''}"
                data-id="${tag.id}">
                <span class="tag-name">${tag.name || 'Untitled Tag'}</span>
                <button type="button" class="icon-btn small delete-tag-btn" data-id="${tag.id}">🗑️</button>
            </div>
        `;
    }).join('');

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
        if (!response?.status === 'ok') {
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
        console.error('Error during setup:', err);
        updateSetupStatus(err.message, 'error');
    } finally {
        setLoading(false);
    }
});

// Use event delegation for dynamic content
bookmarksList.addEventListener('click', (e) => {
    const button = e.target.closest('button');
    const card = e.target.closest('.bookmark-card');
    
    // Handle button clicks
    if (button) {
        const id = button.dataset.id;
        if (!id) return;

        if (button.classList.contains('favorite-btn')) {
            const favourited = button.dataset.favourited !== 'true';
            toggleFavorite(id, favourited);
        } else if (button.classList.contains('archive-btn')) {
            const archived = button.dataset.archived !== 'true';
            toggleArchived(id, archived);
        } else if (button.classList.contains('delete-btn')) {
            deleteBookmark(id);
        }
        return;
    }

    // Handle card expansion
    if (card && !e.target.closest('a') && !e.target.closest('button')) {
        card.classList.toggle('expanded');
    }
});

listsContainer.addEventListener('click', (e) => {
    const listItem = e.target.closest('.list-item');
    const deleteBtn = e.target.closest('.delete-list-btn');
    
    if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        if (id) {
            deleteList(id);
        }
    } else if (listItem) {
        const id = listItem.dataset.id;
        if (id) {
            filterByList(id);
        }
    }
});

tagsContainer.addEventListener('click', (e) => {
    const tagItem = e.target.closest('.tag-item');
    const deleteBtn = e.target.closest('.delete-tag-btn');
    
    if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        if (id) {
            deleteTag(id);
        }
    } else if (tagItem) {
        const id = tagItem.dataset.id;
        if (id) {
            filterByTag(id);
        }
    }
});

// Form Handlers
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
        console.error('Error creating list:', err);
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

// Button Event Listeners
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

exportBtn.addEventListener('click', exportBookmarks);

loadMoreBtn.addEventListener('click', () => {
    if (!nextCursor) return;
    fetchBookmarks();
});

newListBtn.addEventListener('click', showListModal);

// Settings Event Listeners
settingsBtn.addEventListener('click', showSettings);
backBtn.addEventListener('click', hideSettings);
themeToggle.addEventListener('change', toggleTheme);

changeServerBtn.addEventListener('click', () => {
    setupSection.classList.remove('hidden');
    mainContent.classList.add('hidden');
    settingsPage.classList.add('hidden');
});

changeApiKeyBtn.addEventListener('click', () => {
    setupSection.classList.remove('hidden');
    mainContent.classList.add('hidden');
    settingsPage.classList.add('hidden');
});

exportDataBtn.addEventListener('click', exportBookmarks);

// Modal Cancel Buttons
cancelListBtn.addEventListener('click', closeListModal);
cancelBookmarkBtn.addEventListener('click', closeBookmarkModal);
cancelAssetBtn.addEventListener('click', closeAssetModal);

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
    setupForm.requestSubmit();
}

// Initialize theme
setTheme(getTheme());
themeToggle.checked = getTheme() === 'dark';
