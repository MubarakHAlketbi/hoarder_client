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
				searchQuery: "",
				activeList: null,
				activeTag: null,
				showHighlights: false,
			},
			advancedSearch: {
				dateFrom: "",
				dateTo: "",
				selectedTags: [],
				selectedLists: [],
				sortBy: "createdAt",
				sortOrder: "desc",
			},
			isLoading: false,
			selectedBookmarks: new Set(),
			bulkOperationsActive: false,
		};
		this.listeners = new Set();
		this.api = null;
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
		for (const listener of this.listeners) {
			listener(this.state);
		}
	}

	setApi(api) {
		this.api = api;
	}

	async dispatch(action, payload) {
		if (!this.api) {
			throw new Error("API client not initialized");
		}

		switch (action) {
			case "fetchBookmarks": {
				this.setLoading(true);
				try {
					const { filters, advancedSearch } = this.state;
					const params = {
						...filters,
						...advancedSearch,
						reset: payload,
					};
					const data = await this.api.getBookmarks(params);
					this.setBookmarks(data.bookmarks);
				} finally {
					this.setLoading(false);
				}
				break;
			}

			case "fetchLists": {
				const data = await this.api.getLists();
				this.setState({ lists: data.lists });
				break;
			}

			case "fetchTags": {
				const data = await this.api.getTags();
				this.setState({ tags: data.tags });
				break;
			}

			case "updateBookmark": {
				const { id, data } = payload;
				await this.api.updateBookmark(id, data);
				this.updateBookmark(id, data);
				break;
			}

			case "deleteBookmark": {
				await this.api.deleteBookmark(payload);
				this.removeBookmark(payload);
				break;
			}

			case "toggleBulkOperations": {
				this.toggleBulkOperations(!this.state.bulkOperationsActive);
				break;
			}

			case "toggleFavorites": {
				this.setFilters({
					favourited: !this.state.filters.favourited,
					archived: false,
				});
				await this.dispatch("fetchBookmarks", true);
				break;
			}

			case "toggleArchived": {
				this.setFilters({
					archived: !this.state.filters.archived,
					favourited: false,
				});
				await this.dispatch("fetchBookmarks", true);
				break;
			}

			default:
				throw new Error(`Unknown action: ${action}`);
		}
	}

	// Bookmark actions
	setBookmarks(bookmarks) {
		this.setState({ bookmarks });
	}

	addBookmarks(newBookmarks) {
		this.setState({
			bookmarks: [...this.state.bookmarks, ...newBookmarks],
		});
	}

	updateBookmark(id, data) {
		const bookmarks = this.state.bookmarks.map((b) =>
			b.id === id ? { ...b, ...data } : b,
		);
		this.setState({ bookmarks });
	}

	removeBookmark(id) {
		const bookmarks = this.state.bookmarks.filter((b) => b.id !== id);
		this.setState({ bookmarks });
	}

	// Filter actions
	setFilters(filters) {
		this.setState({
			filters: { ...this.state.filters, ...filters },
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
			selectedBookmarks: new Set(),
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
