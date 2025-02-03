import { store } from '../state/store.js';
import { escapeHtml, formatFileSize, sanitizeHtml } from '../utils/helpers.js';

export class BookmarkCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    static get observedAttributes() {
        return ['data-id', 'data-position'];
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }

    disconnectedCallback() {
        this.removeEventListeners();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            this.render();
        }
    }

    setupEventListeners() {
        this.shadowRoot.addEventListener('click', this.handleClick.bind(this));
        
        if (store.getState().filters.activeList) {
            this.setAttribute('draggable', 'true');
            this.addEventListener('dragstart', this.handleDragStart.bind(this));
            this.addEventListener('dragover', this.handleDragOver.bind(this));
            this.addEventListener('dragend', this.handleDragEnd.bind(this));
            this.addEventListener('drop', this.handleDrop.bind(this));
        }
    }

    removeEventListeners() {
        this.shadowRoot.removeEventListener('click', this.handleClick.bind(this));
        this.removeEventListener('dragstart', this.handleDragStart.bind(this));
        this.removeEventListener('dragover', this.handleDragOver.bind(this));
        this.removeEventListener('dragend', this.handleDragEnd.bind(this));
        this.removeEventListener('drop', this.handleDrop.bind(this));
    }

    handleClick(e) {
        const button = e.target.closest('button');
        if (!button) {
            if (!e.target.closest('a')) {
                this.classList.toggle('expanded');
            }
            return;
        }

        const id = this.getAttribute('data-id');
        if (!id) return;

        switch (button.className) {
            case 'favorite-btn':
                this.toggleFavorite();
                break;
            case 'archive-btn':
                this.toggleArchive();
                break;
            case 'delete-btn':
                this.deleteBookmark();
                break;
            case 'highlight-btn':
                this.toggleHighlights();
                break;
        }
    }

    async toggleFavorite() {
        const bookmark = this.getBookmarkData();
        if (!bookmark) return;
        
        const favourited = !bookmark.favourited;
        try {
            await store.dispatch('updateBookmark', {
                id: bookmark.id,
                data: { favourited }
            });
        } catch (err) {
            console.error('Error toggling favorite:', err);
        }
    }

    async toggleArchive() {
        const bookmark = this.getBookmarkData();
        if (!bookmark) return;
        
        const archived = !bookmark.archived;
        try {
            await store.dispatch('updateBookmark', {
                id: bookmark.id,
                data: { archived }
            });
        } catch (err) {
            console.error('Error toggling archive:', err);
        }
    }

    async deleteBookmark() {
        const bookmark = this.getBookmarkData();
        if (!bookmark || !confirm('Are you sure you want to delete this bookmark?')) {
            return;
        }

        try {
            await store.dispatch('deleteBookmark', bookmark.id);
        } catch (err) {
            console.error('Error deleting bookmark:', err);
        }
    }

    async toggleHighlights() {
        const state = store.getState();
        store.setFilters({
            showHighlights: !state.filters.showHighlights
        });
    }

    handleDragStart(e) {
        if (!store.getState().filters.activeList) return;
        
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', this.getAttribute('data-id'));
        this.classList.add('dragging');
    }

    handleDragOver(e) {
        if (!store.getState().filters.activeList) return;
        
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const rect = this.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        const position = e.clientY < midpoint ? 'before' : 'after';
        
        this.classList.remove('drag-over-top', 'drag-over-bottom');
        this.classList.add(position === 'before' ? 'drag-over-top' : 'drag-over-bottom');
    }

    handleDragEnd() {
        if (!store.getState().filters.activeList) return;
        
        this.classList.remove('dragging', 'drag-over-top', 'drag-over-bottom');
    }

    async handleDrop(e) {
        if (!store.getState().filters.activeList) return;
        
        e.preventDefault();
        
        const draggedId = e.dataTransfer.getData('text/plain');
        const targetId = this.getAttribute('data-id');
        const position = this.classList.contains('drag-over-top') ? 'before' : 'after';
        
        try {
            await store.dispatch('reorderBookmark', {
                draggedId,
                targetId,
                position
            });
        } catch (err) {
            console.error('Error reordering bookmark:', err);
        }
        
        this.handleDragEnd();
    }

    getBookmarkData() {
        const id = this.getAttribute('data-id');
        return store.getState().bookmarks.find(b => b.id === id);
    }

    render() {
        const bookmark = this.getBookmarkData();
        if (!bookmark) return;

        const state = store.getState();
        const showHighlights = state.filters.showHighlights;
        const bulkOperationsActive = state.bulkOperationsActive;

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    margin: 8px 0;
                }
                .bookmark-card {
                    background: var(--card-bg);
                    border-radius: var(--radius-lg);
                    box-shadow: var(--shadow-sm);
                    padding: var(--space-md);
                    transition: all var(--transition-normal);
                }
                /* Add more styles here */
            </style>
            
            <div class="bookmark-card" data-id="${bookmark.id}">
                <div class="bookmark-content">
                    <div class="bookmark-header">
                        ${bulkOperationsActive ? `
                            <label class="checkbox-container">
                                <input type="checkbox" class="bookmark-select" 
                                    data-id="${bookmark.id}"
                                    ${state.selectedBookmarks.has(bookmark.id) ? 'checked' : ''}>
                                <span class="checkmark"></span>
                            </label>
                        ` : ''}
                        <a href="${escapeHtml(bookmark.url)}" class="bookmark-title" target="_blank">
                            ${sanitizeHtml(bookmark.title || 'Untitled')}
                        </a>
                    </div>
                    <div class="bookmark-url">${escapeHtml(bookmark.url || '')}</div>
                    <div class="bookmark-actions">
                        <button type="button" class="icon-btn favorite-btn ${bookmark.favourited ? 'active' : ''}"
                            aria-label="${bookmark.favourited ? 'Remove from Favorites' : 'Add to Favorites'}">
                            ${bookmark.favourited ? '★' : '☆'}
                        </button>
                        <button type="button" class="icon-btn archive-btn ${bookmark.archived ? 'active' : ''}"
                            aria-label="${bookmark.archived ? 'Unarchive' : 'Archive'}">
                            ${bookmark.archived ? '📁' : '📂'}
                        </button>
                        <button type="button" class="icon-btn edit-btn" aria-label="Edit">✏️</button>
                        <button type="button" class="icon-btn delete-btn" aria-label="Delete">🗑️</button>
                        <button type="button" class="icon-btn highlight-btn ${showHighlights ? 'active' : ''}"
                            aria-label="Toggle Highlights">💡</button>
                    </div>
                    ${this.renderMetadata(bookmark)}
                    ${showHighlights ? this.renderHighlights(bookmark) : ''}
                </div>
            </div>
        `;
    }

    renderMetadata(bookmark) {
        return `
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
                        <span class="metadata-value">${sanitizeHtml(bookmark.description)}</span>
                    </div>
                ` : ''}
                ${this.renderLists(bookmark)}
                ${this.renderTags(bookmark)}
                ${this.renderAssets(bookmark)}
            </div>
        `;
    }

    renderLists(bookmark) {
        if (!bookmark.lists?.length) return '';
        return `
            <div class="metadata-item">
                <span class="metadata-label">Lists:</span>
                <div class="metadata-tags">
                    ${bookmark.lists.map(list => `
                        <span class="metadata-tag">${sanitizeHtml(list.name)}</span>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderTags(bookmark) {
        if (!bookmark.tags?.length) return '';
        return `
            <div class="metadata-item">
                <span class="metadata-label">Tags:</span>
                <div class="metadata-tags">
                    ${bookmark.tags.map(tag => `
                        <span class="metadata-tag">${sanitizeHtml(tag.name)}</span>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderAssets(bookmark) {
        if (!bookmark.assets?.length) return '';
        return `
            <div class="metadata-item">
                <span class="metadata-label">Assets:</span>
                <div class="metadata-assets">
                    ${bookmark.assets.map(asset => `
                        <div class="asset-item">
                            <span class="asset-name">${sanitizeHtml(asset.fileName)}</span>
                            <span class="asset-size">${formatFileSize(asset.size)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderHighlights(bookmark) {
        const highlights = store.getState().highlights
            .filter(h => h.bookmarkId === bookmark.id);

        if (!highlights.length) return '';

        return `
            <div class="bookmark-highlights">
                ${highlights.map(highlight => `
                    <div class="highlight-item" style="background: ${escapeHtml(highlight.color)}20">
                        <div class="highlight-text">${sanitizeHtml(highlight.text)}</div>
                        <div class="highlight-actions">
                            <button type="button" class="icon-btn small delete-highlight-btn"
                                data-id="${highlight.id}" aria-label="Delete Highlight">🗑️</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
}

customElements.define('bookmark-card', BookmarkCard);