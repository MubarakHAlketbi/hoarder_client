import { CONSTANTS } from '../utils/helpers.js';
import { HoarderAPI } from './api.js';

class ApiClient {
    constructor(serverUrl, apiKey) {
        this.api = new HoarderAPI(serverUrl, apiKey);
        this.pendingRequests = new Map();
    }

    async retryOperation(operation, signal) {
        let lastError;
        for (let i = 0; i < CONSTANTS.MAX_RETRIES; i++) {
            try {
                if (signal?.aborted) {
                    throw new Error('Request cancelled');
                }
                return await operation();
            } catch (err) {
                lastError = err;
                if (i < CONSTANTS.MAX_RETRIES - 1 && !signal?.aborted) {
                    const delay = CONSTANTS.RETRY_DELAY * Math.pow(2, i);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        throw lastError;
    }

    cancelRequest(requestId) {
        const controller = this.pendingRequests.get(requestId);
        if (controller) {
            controller.abort();
            this.pendingRequests.delete(requestId);
        }
    }

    async request(operation, requestId = null) {
        if (requestId) {
            this.cancelRequest(requestId);
        }

        const controller = new AbortController();
        if (requestId) {
            this.pendingRequests.set(requestId, controller);
        }

        try {
            return await this.retryOperation(
                () => operation(controller.signal),
                controller.signal
            );
        } finally {
            if (requestId) {
                this.pendingRequests.delete(requestId);
            }
        }
    }

    // API Methods
    async getLists(requestId = 'lists') {
        return this.request(
            signal => this.api.getLists({ signal }),
            requestId
        );
    }

    async getTags(requestId = 'tags') {
        return this.request(
            signal => this.api.getTags({ signal }),
            requestId
        );
    }

    async getBookmarks(params, requestId = 'bookmarks') {
        return this.request(
            signal => this.api.getBookmarks({ ...params, signal }),
            requestId
        );
    }

    async searchBookmarks(query, params, requestId = 'search') {
        return this.request(
            signal => this.api.searchBookmarks(query, { ...params, signal }),
            requestId
        );
    }

    async getListBookmarks(listId, params, requestId = `list-${listId}`) {
        return this.request(
            signal => this.api.getListBookmarks(listId, { ...params, signal }),
            requestId
        );
    }

    async getTagBookmarks(tagId, params, requestId = `tag-${tagId}`) {
        return this.request(
            signal => this.api.getTagBookmarks(tagId, { ...params, signal }),
            requestId
        );
    }

    async updateList(id, data) {
        return this.request(
            signal => this.api.updateList(id, { ...data, signal })
        );
    }

    async updateTag(id, data) {
        return this.request(
            signal => this.api.updateTag(id, { ...data, signal })
        );
    }

    async updateBookmark(id, data) {
        return this.request(
            signal => this.api.updateBookmark(id, { ...data, signal })
        );
    }

    async deleteBookmark(id) {
        return this.request(
            signal => this.api.deleteBookmark(id, { signal })
        );
    }

    async exportBookmarks() {
        return this.request(
            signal => this.api.exportBookmarks({ signal })
        );
    }

    async uploadAsset(file) {
        return this.request(
            signal => this.api.uploadAsset(file, { signal })
        );
    }

    async createHighlight(data) {
        return this.request(
            signal => this.api.createHighlight({ ...data, signal })
        );
    }

    async updateHighlight(id, data) {
        return this.request(
            signal => this.api.updateHighlight(id, { ...data, signal })
        );
    }

    async deleteHighlight(id) {
        return this.request(
            signal => this.api.deleteHighlight(id, { signal })
        );
    }

    async getBookmarkHighlights(bookmarkId) {
        return this.request(
            signal => this.api.getBookmarkHighlights(bookmarkId, { signal })
        );
    }

    async checkHealth() {
        return this.request(
            signal => this.api.checkHealth({ signal })
        );
    }
}

export function createApiClient(serverUrl, apiKey) {
    return new ApiClient(serverUrl, apiKey);
}