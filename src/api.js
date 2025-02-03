export class HoarderAPI {
    constructor(baseUrl, apiKey) {
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
    }

    async request(path, options = {}) {
        const url = new URL(path, this.baseUrl);
        
        // Add query parameters if provided
        if (options.params) {
            Object.entries(options.params).forEach(([key, value]) => {
                if (value !== undefined) {
                    url.searchParams.append(key, value);
                }
            });
        }

        const headers = {
            'Authorization': `Bearer ${this.apiKey}`,
            ...options.headers
        };

        // Don't set Content-Type for FormData
        if (!(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }

        try {
            const response = await fetch(url, {
                method: options.method || 'GET',
                headers,
                body: options.body instanceof FormData 
                    ? options.body 
                    : options.body ? JSON.stringify(options.body) : undefined
            });

            if (!response.ok) {
                const error = await this.parseResponse(response);
                throw new Error(error.error || 'Request failed');
            }

            // Handle no-content responses
            if (response.status === 204) {
                return null;
            }

            return this.parseResponse(response);
        } catch (err) {
            throw new Error(err.message || 'Network error');
        }
    }

    async parseResponse(response) {
        const contentType = response.headers.get('Content-Type') || '';
        
        // Handle empty responses
        if (response.status === 204 || response.headers.get('Content-Length') === '0') {
            return null;
        }

        // Parse JSON responses
        if (contentType.includes('application/json')) {
            try {
                return await response.json();
            } catch (err) {
                throw new Error('Invalid JSON response');
            }
        }

        // Handle text responses
        if (contentType.includes('text/')) {
            return { text: await response.text() };
        }

        // Return raw response for other types
        return response;
    }

    // Bookmarks
    async getBookmarks(params = {}) {
        const { page, limit, favourited, archived } = params;
        const queryParams = {
            limit,
            page,
            ...(favourited !== undefined && { favourited: favourited.toString() }),
            ...(archived !== undefined && { archived: archived.toString() })
        };
        return this.request('/api/v1/bookmarks', { params: queryParams });
    }

    async createBookmark(data) {
        return this.request('/api/v1/bookmarks', {
            method: 'POST',
            body: data
        });
    }

    async getBookmark(id) {
        return this.request(`/api/v1/bookmarks/${id}`);
    }

    async updateBookmark(id, data) {
        return this.request(`/api/v1/bookmarks/${id}`, {
            method: 'PATCH',
            body: data
        });
    }

    async deleteBookmark(id) {
        return this.request(`/api/v1/bookmarks/${id}`, {
            method: 'DELETE'
        });
    }

    async searchBookmarks(query, params = {}) {
        const {
            limit,
            cursor,
            dateFrom,
            dateTo,
            tags,
            lists,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = params;

        const queryParams = {
            q: query,
            ...(limit && { limit }),
            ...(cursor && { cursor }),
            ...(dateFrom && { dateFrom: new Date(dateFrom).toISOString() }),
            ...(dateTo && { dateTo: new Date(dateTo).toISOString() }),
            ...(tags?.length && { tags: tags.join(',') }),
            ...(lists?.length && { lists: lists.join(',') }),
            sortBy,
            sortOrder
        };
        return this.request('/api/v1/bookmarks/search', { params: queryParams });
    }

    async exportBookmarks() {
        return this.request('/api/v1/bookmarks/export');
    }

    // Lists
    async getLists() {
        return this.request('/api/v1/lists');
    }

    async createList(data) {
        return this.request('/api/v1/lists', {
            method: 'POST',
            body: data
        });
    }

    async getList(id) {
        return this.request(`/api/v1/lists/${id}`);
    }

    async updateList(id, data) {
        return this.request(`/api/v1/lists/${id}`, {
            method: 'PATCH',
            body: data
        });
    }

    async deleteList(id) {
        return this.request(`/api/v1/lists/${id}`, {
            method: 'DELETE'
        });
    }

    async getListBookmarks(id, params = {}) {
        const { limit, cursor } = params;
        const queryParams = {
            ...(limit && { limit }),
            ...(cursor && { cursor })
        };
        return this.request(`/api/v1/lists/${id}/bookmarks`, { params: queryParams });
    }

    async reorderBookmarkInList(listId, bookmarkId, targetId, position) {
        return this.request(`/api/v1/lists/${listId}/bookmarks/${bookmarkId}/reorder`, {
            method: 'PUT',
            body: {
                targetId,
                position
            }
        });
    }

    async addBookmarkToList(listId, bookmarkId) {
        return this.request(`/api/v1/lists/${listId}/bookmarks/${bookmarkId}`, {
            method: 'PUT'
        });
    }

    async removeBookmarkFromList(listId, bookmarkId) {
        return this.request(`/api/v1/lists/${listId}/bookmarks/${bookmarkId}`, {
            method: 'DELETE'
        });
    }

    // Tags
    async getTags() {
        return this.request('/api/v1/tags');
    }

    async getTag(id) {
        return this.request(`/api/v1/tags/${id}`);
    }

    async updateTag(id, data) {
        return this.request(`/api/v1/tags/${id}`, {
            method: 'PATCH',
            body: data
        });
    }

    async deleteTag(id) {
        return this.request(`/api/v1/tags/${id}`, {
            method: 'DELETE'
        });
    }

    async getTagBookmarks(id, params = {}) {
        const { limit, cursor } = params;
        const queryParams = {
            ...(limit && { limit }),
            ...(cursor && { cursor })
        };
        return this.request(`/api/v1/tags/${id}/bookmarks`, { params: queryParams });
    }

    // Assets
    async uploadAsset(file) {
        const formData = new FormData();
        formData.append('file', file);
        return this.request('/api/assets', {
            method: 'POST',
            body: formData
        });
    }

    async getAsset(id) {
        return this.request(`/api/assets/${id}`);
    }

    // Bookmark Assets
    async getBookmarkAssets(bookmarkId) {
        return this.request(`/api/v1/bookmarks/${bookmarkId}/assets`);
    }

    async attachAssetToBookmark(bookmarkId, assetId) {
        return this.request(`/api/v1/bookmarks/${bookmarkId}/assets`, {
            method: 'POST',
            body: { assetId }
        });
    }

    async replaceBookmarkAsset(bookmarkId, oldAssetId, newAssetId) {
        return this.request(`/api/v1/bookmarks/${bookmarkId}/assets/${oldAssetId}`, {
            method: 'PUT',
            body: { assetId: newAssetId }
        });
    }

    async detachAssetFromBookmark(bookmarkId, assetId) {
        return this.request(`/api/v1/bookmarks/${bookmarkId}/assets/${assetId}`, {
            method: 'DELETE'
        });
    }

    // Highlights
    async getHighlights(params = {}) {
        const { limit, cursor } = params;
        const queryParams = {
            ...(limit && { limit }),
            ...(cursor && { cursor })
        };
        return this.request('/api/v1/highlights', { params: queryParams });
    }

    async createHighlight(data) {
        return this.request('/api/v1/highlights', {
            method: 'POST',
            body: data
        });
    }

    async getHighlight(id) {
        return this.request(`/api/v1/highlights/${id}`);
    }

    async updateHighlight(id, data) {
        return this.request(`/api/v1/highlights/${id}`, {
            method: 'PATCH',
            body: data
        });
    }

    async deleteHighlight(id) {
        return this.request(`/api/v1/highlights/${id}`, {
            method: 'DELETE'
        });
    }

    async getBookmarkHighlights(bookmarkId, params = {}) {
        const { limit, cursor } = params;
        const queryParams = {
            ...(limit && { limit }),
            ...(cursor && { cursor })
        };
        return this.request(`/api/v1/bookmarks/${bookmarkId}/highlights`, { params: queryParams });
    }

    // Health Check
    async checkHealth() {
        return this.request('/api/health');
    }
}