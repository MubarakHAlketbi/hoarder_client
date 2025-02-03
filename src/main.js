// @ts-nocheck
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
    activeTag: null,
    showHighlights: false
};

// Advanced Search State
let advancedSearchState = {
    dateFrom: '',
    dateTo: '',
    selectedTags: [],
    selectedLists: [],
    sortBy: 'createdAt',
    sortOrder: 'desc'
};

// Highlight state
let selectedText = '';
let selectedBookmarkId = null;

// Bulk Operations State
let selectedBookmarks = new Set();
let bulkOperationsActive = false;

// Drag and Drop State
let draggedBookmark = null;
let draggedOverBookmark = null;
let dragPosition = null;
let isLoading = false;
let api = null;

// Drag and Drop Functions
function handleDragStart(e) {
    if (!activeFilters.activeList) return;
    
    draggedBookmark = e.target.closest('.bookmark-card');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedBookmark.dataset.id);
    draggedBookmark.classList.add('dragging');
}

function handleDragOver(e) {
    if (!activeFilters.activeList || !draggedBookmark) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const card = e.target.closest('.bookmark-card');
    if (!card || card === draggedBookmark) return;
    
    const rect = card.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const position = e.clientY < midpoint ? 'before' : 'after';
    
    if (draggedOverBookmark === card && dragPosition === position) return;
    
    draggedOverBookmark = card;
    dragPosition = position;
    
    document.querySelectorAll('.bookmark-card').forEach(c => {
        c.classList.remove('drag-over-top', 'drag-over-bottom');
    });
    
    card.classList.add(position === 'before' ? 'drag-over-top' : 'drag-over-bottom');
}

function handleDragEnd() {
    if (!activeFilters.activeList) return;
    
    document.querySelectorAll('.bookmark-card').forEach(card => {
        card.classList.remove('dragging', 'drag-over-top', 'drag-over-bottom');
    });
    
    draggedBookmark = null;
    draggedOverBookmark = null;
    dragPosition = null;
}

async function handleDrop(e) {
    if (!activeFilters.activeList || !draggedBookmark || !draggedOverBookmark) return;
    
    e.preventDefault();
    
    const draggedId = draggedBookmark.dataset.id;
    const targetId = draggedOverBookmark.dataset.id;
    const position = dragPosition === 'before' ? 'before' : 'after';
    
    try {
        await api.reorderBookmarkInList(activeFilters.activeList, draggedId, targetId, position);
        await fetchBookmarks(true);
    } catch (err) {
        console.error('Error reordering bookmark:', err);
        showToast(err.message, 'error');
    }
    
    handleDragEnd();
}

// Bulk Operations Functions
function toggleBulkOperations() {
    bulkOperationsActive = !bulkOperationsActive;
    selectedBookmarks.clear();
    document.querySelectorAll('.bookmark-select').forEach(checkbox => {
        checkbox.checked = false;
    });
    renderBulkOperationsUI();
}

function toggleBookmarkSelection(id) {
    if (selectedBookmarks.has(id)) {
        selectedBookmarks.delete(id);
    } else {
        selectedBookmarks.add(id);
    }
    renderBulkOperationsUI();
}

function selectAllBookmarks() {
    const checkboxes = document.querySelectorAll('.bookmark-select');
    if (selectedBookmarks.size === checkboxes.length) {
        selectedBookmarks.clear();
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
    } else {
        checkboxes.forEach(checkbox => {
            selectedBookmarks.add(checkbox.dataset.id);
            checkbox.checked = true;
        });
    }
    renderBulkOperationsUI();
}

async function bulkDeleteBookmarks() {
    if (!selectedBookmarks.size || !confirm(`Are you sure you want to delete ${selectedBookmarks.size} bookmarks?`)) {
        return;
    }

    setLoading(true);
    try {
        await Promise.all([...selectedBookmarks].map(id => api.deleteBookmark(id)));
        currentBookmarks = currentBookmarks.filter(b => !selectedBookmarks.has(b.id));
        selectedBookmarks.clear();
        renderBookmarks();
        showToast(`${selectedBookmarks.size} bookmarks deleted successfully`);
        toggleBulkOperations();
    } catch (err) {
        console.error('Error deleting bookmarks:', err);
        showToast(err.message, 'error');
    } finally {
        setLoading(false);
    }
}

async function bulkArchiveBookmarks(archive = true) {
    if (!selectedBookmarks.size) return;

    setLoading(true);
    try {
        await Promise.all([...selectedBookmarks].map(id => api.updateBookmark(id, { archived: archive })));
        currentBookmarks.forEach(bookmark => {
            if (selectedBookmarks.has(bookmark.id)) {
                bookmark.archived = archive;
            }
        });
        renderBookmarks();
        showToast(`${selectedBookmarks.size} bookmarks ${archive ? 'archived' : 'unarchived'} successfully`);
        toggleBulkOperations();
    } catch (err) {
        console.error('Error updating bookmarks:', err);
        showToast(err.message, 'error');
    } finally {
        setLoading(false);
    }
}

function renderBulkOperationsUI() {
    const toolbar = document.querySelector('.toolbar-actions');
    if (!toolbar) return;

    if (bulkOperationsActive) {
        toolbar.innerHTML = `
            <button type="button" id="select-all-btn" class="icon-btn" data-tooltip="Select All">☐</button>
            <button type="button" id="bulk-archive-btn" class="icon-btn" data-tooltip="Archive Selected">📁</button>
            <button type="button" id="bulk-delete-btn" class="icon-btn" data-tooltip="Delete Selected">🗑️</button>
            <button type="button" id="cancel-bulk-btn" class="icon-btn" data-tooltip="Cancel">✕</button>
        `;

        document.querySelectorAll('.bookmark-select').forEach(checkbox => {
            checkbox.style.display = 'block';
        });
    } else {
        toolbar.innerHTML = `
            <button type="button" id="show-favorites" class="icon-btn" data-tooltip="Show Favorites">⭐</button>
            <button type="button" id="show-archived" class="icon-btn" data-tooltip="Show Archived">📁</button>
            <button type="button" id="bulk-ops-btn" class="icon-btn" data-tooltip="Bulk Operations">☐</button>
            <button type="button" id="export-btn" class="icon-btn" data-tooltip="Export">📥</button>
            <button type="button" id="settings-btn" class="icon-btn" data-tooltip="Settings">⚙️</button>
        `;

        document.querySelectorAll('.bookmark-select').forEach(checkbox => {
            checkbox.style.display = 'none';
        });
    }

    // Re-attach event listeners
    const selectAllBtn = document.getElementById('select-all-btn');
    const bulkArchiveBtn = document.getElementById('bulk-archive-btn');
    const bulkDeleteBtn = document.getElementById('bulk-delete-btn');
    const cancelBulkBtn = document.getElementById('cancel-bulk-btn');
    const bulkOpsBtn = document.getElementById('bulk-ops-btn');

    if (selectAllBtn) selectAllBtn.addEventListener('click', selectAllBookmarks);
    if (bulkArchiveBtn) bulkArchiveBtn.addEventListener('click', () => bulkArchiveBookmarks(true));
    if (bulkDeleteBtn) bulkDeleteBtn.addEventListener('click', bulkDeleteBookmarks);
    if (cancelBulkBtn) cancelBulkBtn.addEventListener('click', toggleBulkOperations);
    if (bulkOpsBtn) bulkOpsBtn.addEventListener('click', toggleBulkOperations);
}

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

// @ts-check

/** @typedef {import('./types').Bookmark} Bookmark */
/** @typedef {import('./types').List} List */
/** @typedef {import('./types').Tag} Tag */
/** @typedef {import('./types').Asset} Asset */

/**
 * Format a file size in bytes to a human readable string
 * @param {number} bytes - The size in bytes
 * @returns {string} The formatted size string
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Escape HTML special characters in a string
 * @param {any} str - The string to escape
 * @returns {string} The escaped string
 */
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Create an HTML attribute string
 * @param {string} name - The attribute name
 * @param {any} value - The attribute value
 * @returns {string} The formatted attribute string
 */
function attr(name, value) {
    if (value === null || value === undefined || value === false) return '';
    if (value === true) return ' ' + escapeHtml(name);
    return ' ' + escapeHtml(name) + '="' + escapeHtml(value) + '"';
}

/**
 * Join class names, filtering out falsy values
 * @param {...(string|boolean|null|undefined)[]} args - The class names to join
 * @returns {string} The joined class names
 */
function classNames(...args) {
    return args
        .flat()
        .filter(x => x)
        .join(' ');
}

// Highlight Functions
async function createHighlight(bookmarkId, text, color = '#ffeb3b') {
    try {
        const highlight = await api.createHighlight({
            bookmarkId,
            text,
            color
        });
        currentHighlights.push(highlight);
        renderBookmarks();
        showToast('Highlight created successfully');
    } catch (err) {
        console.error('Error creating highlight:', err);
        showToast(err.message, 'error');
    }
}

async function fetchHighlights(bookmarkId) {
    try {
        const response = await api.getBookmarkHighlights(bookmarkId);
        return Array.isArray(response?.highlights) ? response.highlights : [];
    } catch (err) {
        console.error('Error fetching highlights:', err);
        showToast(err.message, 'error');
        return [];
    }
}

async function updateHighlight(id, data) {
    try {
        const highlight = await api.updateHighlight(id, data);
        const index = currentHighlights.findIndex(h => h.id === id);
        if (index !== -1) {
            currentHighlights[index] = highlight;
        }
        renderBookmarks();
        showToast('Highlight updated successfully');
    } catch (err) {
        console.error('Error updating highlight:', err);
        showToast(err.message, 'error');
    }
}

async function deleteHighlight(id) {
    if (!confirm('Are you sure you want to delete this highlight?')) return;

    try {
        await api.deleteHighlight(id);
        currentHighlights = currentHighlights.filter(h => h.id !== id);
        renderBookmarks();
        showToast('Highlight deleted successfully');
    } catch (err) {
        console.error('Error deleting highlight:', err);
        showToast(err.message, 'error');
    }
}

function handleTextSelection(e) {
    const selection = window.getSelection();
    const text = selection.toString().trim();
    
    if (text) {
        selectedText = text;
        const bookmarkCard = e.target.closest('.bookmark-card');
        if (bookmarkCard) {
            selectedBookmarkId = bookmarkCard.dataset.id;
            showHighlightControls(selection);
        }
    } else {
        hideHighlightControls();
    }
}

function showHighlightControls(selection) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    const controls = document.createElement('div');
    controls.id = 'highlight-controls';
    controls.style.position = 'fixed';
    controls.style.left = `${rect.left + window.scrollX}px`;
    controls.style.top = `${rect.top + window.scrollY - 40}px`;
    controls.innerHTML = `
        <div class="highlight-colors">
            <button class="color-btn" data-color="#ffeb3b" style="background: #ffeb3b"></button>
            <button class="color-btn" data-color="#a5d6a7" style="background: #a5d6a7"></button>
            <button class="color-btn" data-color="#90caf9" style="background: #90caf9"></button>
        </div>
    `;
    
    document.body.appendChild(controls);
    
    controls.addEventListener('click', (e) => {
        const colorBtn = e.target.closest('.color-btn');
        if (colorBtn && selectedBookmarkId) {
            createHighlight(selectedBookmarkId, selectedText, colorBtn.dataset.color);
            hideHighlightControls();
        }
    });
}

function hideHighlightControls() {
    const controls = document.getElementById('highlight-controls');
    if (controls) {
        controls.remove();
    }
    selectedText = '';
    selectedBookmarkId = null;
}

// Advanced Search Functions
function showSearchModal() {
    const modal = document.getElementById('search-modal');
    const form = document.getElementById('search-form');
    const query = document.getElementById('search-query');
    const dateFrom = document.getElementById('date-from');
    const dateTo = document.getElementById('date-to');
    const tagsContainer = document.getElementById('search-tags');
    const listsContainer = document.getElementById('search-lists');
    const sortBy = document.getElementById('sort-by');
    const sortOrder = document.getElementById('sort-order');

    // Set current values
    query.value = activeFilters.searchQuery;
    dateFrom.value = advancedSearchState.dateFrom;
    dateTo.value = advancedSearchState.dateTo;
    sortBy.value = advancedSearchState.sortBy;
    sortOrder.value = advancedSearchState.sortOrder;

    // Render tags
    tagsContainer.innerHTML = currentTags.map(tag => `
        <div class="selector-item ${advancedSearchState.selectedTags.includes(tag.id) ? 'selected' : ''}"
            data-id="${tag.id}">${tag.name}</div>
    `).join('');

    // Render lists
    listsContainer.innerHTML = currentLists.map(list => `
        <div class="selector-item ${advancedSearchState.selectedLists.includes(list.id) ? 'selected' : ''}"
            data-id="${list.id}">${list.name}</div>
    `).join('');

    modal.classList.remove('hidden');
}

function hideSearchModal() {
    const modal = document.getElementById('search-modal');
    modal.classList.add('hidden');
}

function handleTagSelection(e) {
    const tagItem = e.target.closest('.selector-item');
    if (!tagItem) return;

    const tagId = tagItem.dataset.id;
    tagItem.classList.toggle('selected');

    if (tagItem.classList.contains('selected')) {
        advancedSearchState.selectedTags.push(tagId);
    } else {
        advancedSearchState.selectedTags = advancedSearchState.selectedTags.filter(id => id !== tagId);
    }
}

function handleListSelection(e) {
    const listItem = e.target.closest('.selector-item');
    if (!listItem) return;

    const listId = listItem.dataset.id;
    listItem.classList.toggle('selected');

    if (listItem.classList.contains('selected')) {
        advancedSearchState.selectedLists.push(listId);
    } else {
        advancedSearchState.selectedLists = advancedSearchState.selectedLists.filter(id => id !== listId);
    }
}

async function handleAdvancedSearch(e) {
    e.preventDefault();
    
    const query = document.getElementById('search-query').value;
    const dateFrom = document.getElementById('date-from').value;
    const dateTo = document.getElementById('date-to').value;
    const sortBy = document.getElementById('sort-by').value;
    const sortOrder = document.getElementById('sort-order').value;

    activeFilters.searchQuery = query;
    advancedSearchState = {
        ...advancedSearchState,
        dateFrom,
        dateTo,
        sortBy,
        sortOrder
    };

    hideSearchModal();
    await fetchBookmarks(true);
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
            // Add advanced search parameters
            if (advancedSearchState.dateFrom) {
                params.dateFrom = advancedSearchState.dateFrom;
            }
            if (advancedSearchState.dateTo) {
                params.dateTo = advancedSearchState.dateTo;
            }
            if (advancedSearchState.selectedTags.length) {
                params.tags = advancedSearchState.selectedTags;
            }
            if (advancedSearchState.selectedLists.length) {
                params.lists = advancedSearchState.selectedLists;
            }
            params.sortBy = advancedSearchState.sortBy;
            params.sortOrder = advancedSearchState.sortOrder;
            
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
        
        // Auto-select first list if available and no list is currently selected
        if (currentLists.length > 0 && !activeFilters.activeList) {
            filterByList(currentLists[0].id);
        }
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
/**
 * @param {any} bookmark
 * @returns {Promise<string>}
 */
async function renderBookmark(bookmark) {
    if (!bookmark?.id) {
        console.warn('Invalid bookmark:', bookmark);
        return '';
    }

    const title = bookmark.title || 'Untitled';
    const url = bookmark.url || '#';
    const favourited = bookmark.favourited || false;
    const archived = bookmark.archived || false;
    const position = bookmark.position || 0;

    let html = '<div class="bookmark-card" data-id="' + bookmark.id + '" draggable="' +
        (activeFilters.activeList ? 'true' : 'false') + '" data-position="' + position + '">' +
        '<div class="bookmark-content">' +
        '<div class="bookmark-header">' +
        '<label class="checkbox-container">' +
        '<input type="checkbox" class="bookmark-select" data-id="' + bookmark.id + '">' +
        '<span class="checkmark"></span>' +
        '</label>' +
        '<a href="' + url + '" class="bookmark-title" target="_blank">' + title + '</a>' +
        '</div>' +
        '<div class="bookmark-url">' + (url === '#' ? '' : url) + '</div>' +
        '<div class="bookmark-actions">' +
        '<button type="button" class="icon-btn favorite-btn ' + (favourited ? 'active' : '') + '" ' +
        'data-id="' + bookmark.id + '" data-favourited="' + favourited + '" ' +
        'data-tooltip="' + (favourited ? 'Remove from Favorites' : 'Add to Favorites') + '">' +
        (favourited ? '★' : '☆') + '</button>' +
        '<button type="button" class="icon-btn archive-btn ' + (archived ? 'active' : '') + '" ' +
        'data-id="' + bookmark.id + '" data-archived="' + archived + '" ' +
        'data-tooltip="' + (archived ? 'Unarchive' : 'Archive') + '">' +
        (archived ? '📁' : '📂') + '</button>' +
        '<button type="button" class="icon-btn edit-btn" data-id="' + bookmark.id + '" ' +
        'data-tooltip="Edit">✏️</button>' +
        '<button type="button" class="icon-btn delete-btn" data-id="' + bookmark.id + '" ' +
        'data-tooltip="Delete">🗑️</button>' +
        '<button type="button" class="icon-btn highlight-btn ' + (activeFilters.showHighlights ? 'active' : '') + '" ' +
        'data-id="' + bookmark.id + '" data-tooltip="Toggle Highlights">💡</button>' +
        '</div>';

    if (activeFilters.showHighlights) {
        html += '<div class="bookmark-highlights">' + highlightsHtml + '</div>';
    }

    html += '<div class="bookmark-metadata">' +
        '<div class="metadata-item">' +
        '<span class="metadata-label">Created:</span>' +
        '<span class="metadata-value">' + new Date(bookmark.createdAt).toLocaleString() + '</span>' +
        '</div>' +
        '<div class="metadata-item">' +
        '<span class="metadata-label">Last Updated:</span>' +
        '<span class="metadata-value">' + new Date(bookmark.updatedAt).toLocaleString() + '</span>' +
        '</div>';

    if (bookmark.description) {
        html += '<div class="metadata-item">' +
            '<span class="metadata-label">Description:</span>' +
            '<span class="metadata-value">' + bookmark.description + '</span>' +
            '</div>';
    }

    if (bookmark.lists?.length) {
        html += '<div class="metadata-item">' +
            '<span class="metadata-label">Lists:</span>' +
            '<div class="metadata-tags">' +
            bookmark.lists.map(list => '<span class="metadata-tag">' + list.name + '</span>').join('') +
            '</div></div>';
    }

    if (bookmark.tags?.length) {
        html += '<div class="metadata-item">' +
            '<span class="metadata-label">Tags:</span>' +
            '<div class="metadata-tags">' +
            bookmark.tags.map(tag => '<span class="metadata-tag">' + tag.name + '</span>').join('') +
            '</div></div>';
    }

    if (bookmark.assets?.length) {
        html += '<div class="metadata-item">' +
            '<span class="metadata-label">Assets:</span>' +
            '<div class="metadata-assets">' +
            bookmark.assets.map(asset =>
                '<div class="asset-item">' +
                '<span class="asset-name">' + asset.fileName + '</span>' +
                '<span class="asset-size">' + formatFileSize(asset.size) + '</span>' +
                '</div>'
            ).join('') +
            '</div></div>';
    }

    html += '</div></div><div class="bookmark-expand"></div></div>';
    return html;
}

/**
 * @returns {Promise<void>}
 */
async function renderBookmarks() {
    try {
        // Remove existing event listeners
        bookmarksList.removeEventListener('mouseup', handleTextSelection);
        
        // Generate HTML
        const bookmarksHtml = await Promise.all(currentBookmarks.map(renderBookmark));
        bookmarksList.innerHTML = bookmarksHtml.join('') || '<div class="no-bookmarks">No bookmarks found</div>';
        
        // Add text selection handler for highlights
        bookmarksList.addEventListener('mouseup', handleTextSelection);
        
        // Add drag and drop handlers when in list view
        if (activeFilters.activeList) {
            const cards = bookmarksList.querySelectorAll('.bookmark-card');
            cards.forEach(card => {
                card.addEventListener('dragstart', handleDragStart);
                card.addEventListener('dragover', handleDragOver);
                card.addEventListener('dragend', handleDragEnd);
                card.addEventListener('drop', handleDrop);
            });
        }
    } catch (err) {
        console.error('Error rendering bookmarks:', err);
        showToast('Error rendering bookmarks', 'error');
    }
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
                <button type="button" class="icon-btn small delete-list-btn"
                    data-id="${list.id}"
                    data-tooltip="Delete List">🗑️</button>
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
                <button type="button" class="icon-btn small delete-tag-btn"
                    data-id="${tag.id}"
                    data-tooltip="Delete Tag">🗑️</button>
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
        } else if (button.classList.contains('highlight-btn')) {
            activeFilters.showHighlights = !activeFilters.showHighlights;
            button.classList.toggle('active');
            renderBookmarks();
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
    if (activeFilters.searchQuery) {
        activeFilters.searchQuery = '';
        searchInput.value = '';
        advancedSearchState = {
            dateFrom: '',
            dateTo: '',
            selectedTags: [],
            selectedLists: [],
            sortBy: 'createdAt',
            sortOrder: 'desc'
        };
        fetchBookmarks(true);
    } else {
        showSearchModal();
    }
});

// Advanced Search Event Listeners
document.getElementById('search-form').addEventListener('submit', handleAdvancedSearch);
document.getElementById('cancel-search-btn').addEventListener('click', hideSearchModal);
document.getElementById('search-tags').addEventListener('click', handleTagSelection);
document.getElementById('search-lists').addEventListener('click', handleListSelection);

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

// List and Tag Actions
async function deleteList(id) {
    if (!confirm('Are you sure you want to delete this list? This action cannot be undone.')) return;

    try {
        await api.lists.delete({ listId: id });
        if (activeFilters.activeList === id) {
            activeFilters.activeList = null;
        }
        await fetchLists();
        showToast('List deleted successfully');
    } catch (err) {
        console.error('Error deleting list:', err);
        showToast(err.message, 'error');
    }
}

async function deleteTag(id) {
    if (!confirm('Are you sure you want to delete this tag? This action cannot be undone.')) return;

    try {
        await api.tags.delete({ tagId: id });
        if (activeFilters.activeTag === id) {
            activeFilters.activeTag = null;
        }
        await fetchTags();
        showToast('Tag deleted successfully');
    } catch (err) {
        console.error('Error deleting tag:', err);
        showToast(err.message, 'error');
    }
}

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

// Initialize Intersection Observer for infinite scroll
const loadMoreObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && !isLoading && nextCursor) {
            fetchBookmarks();
        }
    });
}, {
    rootMargin: '100px',
    threshold: 0.1
});

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

// Start observing the load-more button
loadMoreObserver.observe(loadMoreBtn);
