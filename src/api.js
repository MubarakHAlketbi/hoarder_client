import { createHoarderClient } from '@hoarderapp/sdk';

export class HoarderAPI {
    constructor(baseUrl, apiKey) {
        this.client = createHoarderClient({
            baseUrl,
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });
    }

    // Bookmarks
    async getBookmarks(params = {}) {
        const { page, limit, favourited, archived } = params;
        return this.client.GET('/v1/bookmarks', {
            params: {
                page,
                limit,
                favourited: favourited?.toString(),
                archived: archived?.toString()
            }
        });
    }

    async createBookmark(data) {
        return this.client.POST('/v1/bookmarks', { data });
    }

    async getBookmark(id) {
        return this.client.GET(`/v1/bookmarks/${id}`);
    }

    async updateBookmark(id, data) {
        return this.client.PATCH(`/v1/bookmarks/${id}`, { data });
    }

    async deleteBookmark(id) {
        return this.client.DELETE(`/v1/bookmarks/${id}`);
    }

    async searchBookmarks(query, params = {}) {
        const { limit, cursor } = params;
        return this.client.GET('/v1/bookmarks/search', { 
            params: { 
                q: query,
                limit,
                cursor
            }
        });
    }

    async exportBookmarks() {
        return this.client.GET('/v1/bookmarks/export');
    }

    // Highlights
    async getHighlights(params = {}) {
        return this.client.GET('/v1/highlights', { params });
    }

    async createHighlight(data) {
        return this.client.POST('/v1/highlights', { data });
    }

    async getHighlight(id) {
        return this.client.GET(`/v1/highlights/${id}`);
    }

    async updateHighlight(id, data) {
        return this.client.PATCH(`/v1/highlights/${id}`, { data });
    }

    async deleteHighlight(id) {
        return this.client.DELETE(`/v1/highlights/${id}`);
    }

    // Lists
    async getLists() {
        return this.client.GET('/v1/lists');
    }

    async createList(data) {
        return this.client.POST('/v1/lists', { data });
    }

    async getList(id) {
        return this.client.GET(`/v1/lists/${id}`);
    }

    async updateList(id, data) {
        return this.client.PATCH(`/v1/lists/${id}`, { data });
    }

    async deleteList(id) {
        return this.client.DELETE(`/v1/lists/${id}`);
    }

    async getListBookmarks(id, params = {}) {
        const { limit, cursor } = params;
        return this.client.GET(`/v1/lists/${id}/bookmarks`, {
            params: { limit, cursor }
        });
    }

    async addBookmarkToList(listId, bookmarkId) {
        return this.client.PUT(`/v1/lists/${listId}/bookmarks/${bookmarkId}`);
    }

    async removeBookmarkFromList(listId, bookmarkId) {
        return this.client.DELETE(`/v1/lists/${listId}/bookmarks/${bookmarkId}`);
    }

    // Tags
    async getTags() {
        return this.client.GET('/v1/tags');
    }

    async getTag(id) {
        return this.client.GET(`/v1/tags/${id}`);
    }

    async updateTag(id, data) {
        return this.client.PATCH(`/v1/tags/${id}`, { data });
    }

    async deleteTag(id) {
        return this.client.DELETE(`/v1/tags/${id}`);
    }

    async getTagBookmarks(id, params = {}) {
        const { limit, cursor } = params;
        return this.client.GET(`/v1/tags/${id}/bookmarks`, {
            params: { limit, cursor }
        });
    }

    // Assets
    async uploadAsset(file) {
        const formData = new FormData();
        formData.append('file', file);
        return this.client.POST('/api/v1/assets', {
            data: formData,
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    }

    async getAsset(id) {
        return this.client.GET(`/api/v1/assets/${id}`);
    }

    // Bookmark Assets
    async getBookmarkAssets(bookmarkId) {
        return this.client.GET(`/v1/bookmarks/${bookmarkId}/assets`);
    }

    async attachAssetToBookmark(bookmarkId, assetId) {
        return this.client.POST(`/v1/bookmarks/${bookmarkId}/assets`, {
            data: { assetId }
        });
    }

    async replaceBookmarkAsset(bookmarkId, oldAssetId, newAssetId) {
        return this.client.PUT(`/v1/bookmarks/${bookmarkId}/assets/${oldAssetId}`, {
            data: { assetId: newAssetId }
        });
    }

    async detachAssetFromBookmark(bookmarkId, assetId) {
        return this.client.DELETE(`/v1/bookmarks/${bookmarkId}/assets/${assetId}`);
    }

    // Health Check
    async checkHealth() {
        return this.client.GET('/api/health');
    }
}