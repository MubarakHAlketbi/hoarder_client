// State Management
class Store {
    constructor() {
        this.state = {
            bookmarks: [],
            highlights: [],
            lists: [],
            tags: [],
            nextCursor: null,
            currentPage: 1,
            filters: {
                favourited: false,
                archived: false,
                searchQuery: '',
                activeList: null,
                activeTag: null,
                showHighlights: false
            },
            advancedSearch: {
                dateFrom: '',
                dateTo: '',
                selectedTags: [],
                selectedLists: [],
                sortBy: 'createdAt',
                sortOrder: 'desc'
            },
            isLoading: false,
            selectedBookmarks: new Set(),
            bulkOperationsActive: false
        };
        this.listeners = new Set();
    }

    getState() {
        return this.state;
    }

    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.notify();
    }

    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    notify() {
        this.listeners.forEach(listener => listener(this.state));
    }

    // Bookmark actions
    setBookmarks(bookmarks) {
        this.setState({ bookmarks });
    }

    addBookmarks(newBookmarks) {
        this.setState({ 
            bookmarks: [...this.state.bookmarks, ...newBookmarks]
        });
    }

    updateBookmark(id, data) {
        const bookmarks = this.state.bookmarks.map(b => 
            b.id === id ? { ...b, ...data } : b
        );
        this.setState({ bookmarks });
    }

    removeBookmark(id) {
        const bookmarks = this.state.bookmarks.filter(b => b.id !== id);
        this.setState({ bookmarks });
    }

    // Filter actions
    setFilters(filters) {
        this.setState({ 
            filters: { ...this.state.filters, ...filters }
        });
    }

    // Loading state
    setLoading(isLoading) {
        this.setState({ isLoading });
    }

    // Bulk operations
    toggleBulkOperations(active) {
        this.setState({ 
            bulkOperationsActive: active,
            selectedBookmarks: new Set()
        });
    }

    toggleBookmarkSelection(id) {
        const selectedBookmarks = new Set(this.state.selectedBookmarks);
        if (selectedBookmarks.has(id)) {
            selectedBookmarks.delete(id);
        } else {
            selectedBookmarks.add(id);
        }
        this.setState({ selectedBookmarks });
    }
}

export const store = new Store();