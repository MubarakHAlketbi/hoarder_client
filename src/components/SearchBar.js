import { store } from "../state/store.js";
import { CONSTANTS, debounce } from "../utils/helpers.js";

export class SearchBar extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: "open" });
		this.selectedSuggestionIndex = -1;
		this.recentSearches = JSON.parse(
			localStorage.getItem("recentSearches") || "[]",
		);
	}

	connectedCallback() {
		this.render();
		this.setupEventListeners();
		store.subscribe(this.handleStateChange.bind(this));
	}

	disconnectedCallback() {
		this.removeEventListeners();
	}

	setupEventListeners() {
		const input = this.shadowRoot.querySelector(".search-input");
		const suggestionsContainer = this.shadowRoot.querySelector(
			".search-suggestions",
		);

		input.addEventListener(
			"input",
			debounce(() => {
				if (input.value.trim()) {
					this.showSuggestions();
				} else {
					this.hideSuggestions();
				}
			}, 200),
		);

		input.addEventListener("focus", () => {
			if (input.value.trim() || this.recentSearches.length) {
				this.showSuggestions();
			}
		});

		input.addEventListener("keydown", this.handleSearchKeydown.bind(this));
		suggestionsContainer.addEventListener(
			"click",
			this.handleSuggestionClick.bind(this),
		);

		// Close suggestions when clicking outside
		document.addEventListener("click", (e) => {
			if (!this.contains(e.target)) {
				this.hideSuggestions();
			}
		});

		// Advanced search button
		this.shadowRoot
			.querySelector(".advanced-search-btn")
			.addEventListener("click", this.showAdvancedSearch.bind(this));
	}

	removeEventListeners() {
		const input = this.shadowRoot.querySelector(".search-input");
		input.removeEventListener("input", this.handleInput);
		input.removeEventListener("focus", this.handleFocus);
		input.removeEventListener("keydown", this.handleSearchKeydown);
	}

	handleStateChange(state) {
		// Update suggestions based on new state
		if (this.shadowRoot.querySelector(".search-input").value.trim()) {
			this.showSuggestions();
		}
	}

	addRecentSearch(query) {
		if (!query) return;
		this.recentSearches = [
			query,
			...this.recentSearches
				.filter((s) => s !== query)
				.slice(0, CONSTANTS.MAX_RECENT_SEARCHES - 1),
		];
		localStorage.setItem("recentSearches", JSON.stringify(this.recentSearches));
	}

	clearRecentSearches() {
		this.recentSearches = [];
		localStorage.setItem("recentSearches", "[]");
		this.hideSuggestions();
	}

	showSuggestions() {
		const input = this.shadowRoot.querySelector(".search-input");
		const query = input.value.toLowerCase().trim();
		const state = store.getState();
		const suggestions = [];

		// Add recent searches
		if (this.recentSearches.length) {
			suggestions.push(
				...this.recentSearches
					.filter((s) => !query || s.toLowerCase().includes(query))
					.map((s) => ({
						text: s,
						type: "recent",
						icon: "⌚",
					})),
			);
		}

		// Add matching tags
		if (state.tags.length) {
			suggestions.push(
				...state.tags
					.filter((t) => !query || t.name.toLowerCase().includes(query))
					.map((t) => ({
						text: t.name,
						type: "tag",
						icon: "#",
						id: t.id,
					})),
			);
		}

		// Add matching lists
		if (state.lists.length) {
			suggestions.push(
				...state.lists
					.filter((l) => !query || l.name.toLowerCase().includes(query))
					.map((l) => ({
						text: l.name,
						type: "list",
						icon: "📁",
						id: l.id,
					})),
			);
		}

		if (!suggestions.length) {
			this.hideSuggestions();
			return;
		}

		const suggestionsContainer = this.shadowRoot.querySelector(
			".search-suggestions",
		);
		suggestionsContainer.innerHTML = suggestions
			.map(
				(suggestion, index) => `
            <div class="suggestion-item${index === this.selectedSuggestionIndex ? " active" : ""}"
                data-index="${index}"
                data-type="${suggestion.type}"
                ${suggestion.id ? `data-id="${suggestion.id}"` : ""}>
                <span class="icon">${suggestion.icon}</span>
                <span class="text">${suggestion.text}</span>
                <span class="type">${suggestion.type}</span>
            </div>
        `,
			)
			.join("");

		suggestionsContainer.classList.remove("hidden");
	}

	hideSuggestions() {
		this.shadowRoot
			.querySelector(".search-suggestions")
			.classList.add("hidden");
		this.selectedSuggestionIndex = -1;
	}

	handleSuggestionClick(e) {
		const item = e.target.closest(".suggestion-item");
		if (!item) return;

		const type = item.dataset.type;
		const id = item.dataset.id;
		const text = item.querySelector(".text").textContent;

		if (type === "recent") {
			this.shadowRoot.querySelector(".search-input").value = text;
			store.setFilters({ searchQuery: text });
			store.dispatch("fetchBookmarks", true);
		} else if (type === "tag" && id) {
			store.setFilters({ activeTag: id, activeList: null });
			store.dispatch("fetchBookmarks", true);
		} else if (type === "list" && id) {
			store.setFilters({ activeList: id, activeTag: null });
			store.dispatch("fetchBookmarks", true);
		}

		this.hideSuggestions();
	}

	handleSearchKeydown(e) {
		const suggestions = this.shadowRoot.querySelectorAll(".suggestion-item");
		if (!suggestions.length) return;

		if (e.key === "ArrowDown") {
			e.preventDefault();
			this.selectedSuggestionIndex = Math.min(
				this.selectedSuggestionIndex + 1,
				suggestions.length - 1,
			);
			this.showSuggestions();
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			this.selectedSuggestionIndex = Math.max(
				this.selectedSuggestionIndex - 1,
				-1,
			);
			this.showSuggestions();
		} else if (e.key === "Enter" && this.selectedSuggestionIndex >= 0) {
			e.preventDefault();
			suggestions[this.selectedSuggestionIndex].click();
		} else if (e.key === "Escape") {
			this.hideSuggestions();
		}
	}

	showAdvancedSearch() {
		const modal = document.createElement("modal-dialog");
		modal.setAttribute("title", "Advanced Search");
		modal.setAttribute("size", "large");

		const state = store.getState();
		const { advancedSearch } = state;

		modal.innerHTML = `
            <form id="advanced-search-form">
                <div class="form-group">
                    <label for="search-query">Search Query</label>
                    <input type="text" id="search-query" value="${advancedSearch.searchQuery || ""}">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="date-from">From Date</label>
                        <input type="date" id="date-from" value="${advancedSearch.dateFrom || ""}">
                    </div>
                    <div class="form-group">
                        <label for="date-to">To Date</label>
                        <input type="date" id="date-to" value="${advancedSearch.dateTo || ""}">
                    </div>
                </div>
                <div class="form-group">
                    <label>Tags</label>
                    <div id="search-tags" class="tag-selector">
                        ${state.tags
													.map(
														(tag) => `
                            <div class="selector-item${
															advancedSearch.selectedTags.includes(tag.id)
																? " selected"
																: ""
														}" data-id="${tag.id}">
                                ${tag.name}
                            </div>
                        `,
													)
													.join("")}
                    </div>
                </div>
                <div class="form-group">
                    <label>Lists</label>
                    <div id="search-lists" class="list-selector">
                        ${state.lists
													.map(
														(list) => `
                            <div class="selector-item${
															advancedSearch.selectedLists.includes(list.id)
																? " selected"
																: ""
														}" data-id="${list.id}">
                                ${list.name}
                            </div>
                        `,
													)
													.join("")}
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="sort-by">Sort By</label>
                        <select id="sort-by">
                            <option value="createdAt"${
															advancedSearch.sortBy === "createdAt"
																? " selected"
																: ""
														}>Created Date</option>
                            <option value="updatedAt"${
															advancedSearch.sortBy === "updatedAt"
																? " selected"
																: ""
														}>Updated Date</option>
                            <option value="title"${
															advancedSearch.sortBy === "title"
																? " selected"
																: ""
														}>Title</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="sort-order">Sort Order</label>
                        <select id="sort-order">
                            <option value="desc"${
															advancedSearch.sortOrder === "desc"
																? " selected"
																: ""
														}>Descending</option>
                            <option value="asc"${
															advancedSearch.sortOrder === "asc"
																? " selected"
																: ""
														}>Ascending</option>
                        </select>
                    </div>
                </div>
            </form>
            <div slot="footer">
                <button type="button" class="secondary" id="cancel-search-btn">Cancel</button>
                <button type="button" class="primary" id="apply-search-btn">Apply</button>
            </div>
        `;

		document.body.appendChild(modal);
		modal.show();

		// Handle form submission
		const form = modal.querySelector("#advanced-search-form");
		const applyBtn = modal.querySelector("#apply-search-btn");
		const cancelBtn = modal.querySelector("#cancel-search-btn");

		applyBtn.addEventListener("click", () => {
			const formData = new FormData(form);
			const searchState = {
				searchQuery: formData.get("search-query"),
				dateFrom: formData.get("date-from"),
				dateTo: formData.get("date-to"),
				selectedTags: Array.from(
					modal.querySelectorAll("#search-tags .selector-item.selected"),
				).map((el) => el.dataset.id),
				selectedLists: Array.from(
					modal.querySelectorAll("#search-lists .selector-item.selected"),
				).map((el) => el.dataset.id),
				sortBy: formData.get("sort-by"),
				sortOrder: formData.get("sort-order"),
			};

			store.setState({ advancedSearch: searchState });
			store.dispatch("fetchBookmarks", true);
			modal.close();
		});

		cancelBtn.addEventListener("click", () => modal.close());

		// Handle tag and list selection
		modal.querySelector("#search-tags").addEventListener("click", (e) => {
			const item = e.target.closest(".selector-item");
			if (item) {
				item.classList.toggle("selected");
			}
		});

		modal.querySelector("#search-lists").addEventListener("click", (e) => {
			const item = e.target.closest(".selector-item");
			if (item) {
				item.classList.toggle("selected");
			}
		});
	}

	render() {
		this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                }

                .search-container {
                    position: relative;
                    width: 100%;
                }

                .search-input-wrapper {
                    display: flex;
                    gap: var(--space-sm);
                }

                .search-input {
                    flex: 1;
                    padding: var(--space-sm) var(--space-md);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    font-size: var(--text-md);
                    background: var(--input-bg);
                    color: var(--text-primary);
                }

                .search-input:focus {
                    outline: none;
                    border-color: var(--primary);
                }

                .advanced-search-btn {
                    padding: var(--space-sm) var(--space-md);
                    background: var(--button-bg);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    cursor: pointer;
                    color: var(--text-primary);
                }

                .search-suggestions {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    background: var(--card-bg);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    margin-top: var(--space-sm);
                    box-shadow: var(--shadow-lg);
                    z-index: 100;
                    max-height: 300px;
                    overflow-y: auto;
                }

                .search-suggestions.hidden {
                    display: none;
                }

                .suggestion-item {
                    padding: var(--space-sm) var(--space-md);
                    display: flex;
                    align-items: center;
                    gap: var(--space-sm);
                    cursor: pointer;
                }

                .suggestion-item:hover,
                .suggestion-item.active {
                    background: var(--hover-bg);
                }

                .suggestion-item .icon {
                    font-size: var(--text-lg);
                }

                .suggestion-item .text {
                    flex: 1;
                }

                .suggestion-item .type {
                    color: var(--text-secondary);
                    font-size: var(--text-sm);
                }
            </style>

            <div class="search-container">
                <div class="search-input-wrapper">
                    <input type="text" class="search-input" 
                        placeholder="Search bookmarks..."
                        aria-label="Search bookmarks">
                    <button type="button" class="advanced-search-btn" 
                        aria-label="Advanced Search">
                        ⚡
                    </button>
                </div>
                <div class="search-suggestions hidden"></div>
            </div>
        `;
	}
}

customElements.define("search-bar", SearchBar);
