import { store } from "../state/store.js";
import { CONSTANTS, debounce } from "../utils/helpers.js";
import "./BookmarkCard.js";

export class BookmarkList extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: "open" });
		this.renderedItems = new Map();
		this.intersectionObserver = null;
		this.setupIntersectionObserver();
	}

	connectedCallback() {
		this.render();
		this.setupEventListeners();
		store.subscribe(this.handleStateChange.bind(this));
	}

	disconnectedCallback() {
		this.removeEventListeners();
		this.intersectionObserver?.disconnect();
	}

	setupIntersectionObserver() {
		this.intersectionObserver = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						const state = store.getState();
						if (!state.isLoading && state.nextCursor) {
							store.dispatch("fetchMoreBookmarks");
						}
					}
				});
			},
			{
				rootMargin: "100px",
				threshold: 0.1,
			},
		);
	}

	setupEventListeners() {
		this.shadowRoot.addEventListener(
			"scroll",
			debounce(this.handleScroll.bind(this), 100),
		);
	}

	removeEventListeners() {
		this.shadowRoot.removeEventListener("scroll", this.handleScroll.bind(this));
	}

	handleStateChange(state) {
		this.render();
	}

	handleScroll() {
		requestAnimationFrame(() => this.updateVisibleItems());
	}

	getVisibleRange() {
		const containerHeight = this.clientHeight;
		const scrollTop = this.scrollTop;

		const startIndex = Math.max(
			0,
			Math.floor(scrollTop / CONSTANTS.BOOKMARK_HEIGHT) - CONSTANTS.BUFFER_SIZE,
		);
		const endIndex = Math.min(
			store.getState().bookmarks.length,
			Math.ceil((scrollTop + containerHeight) / CONSTANTS.BOOKMARK_HEIGHT) +
				CONSTANTS.BUFFER_SIZE,
		);

		return { startIndex, endIndex };
	}

	updateVisibleItems() {
		const { startIndex, endIndex } = this.getVisibleRange();
		const bookmarks = store.getState().bookmarks;
		const container = this.shadowRoot.querySelector(".bookmarks-container");

		// Remove items that are no longer visible
		for (const [index, element] of this.renderedItems.entries()) {
			if (index < startIndex || index >= endIndex) {
				element.remove();
				this.renderedItems.delete(index);
			}
		}

		// Add new visible items
		for (let i = startIndex; i < endIndex; i++) {
			if (!this.renderedItems.has(i)) {
				const bookmark = bookmarks[i];
				const element = document.createElement("bookmark-card");
				element.setAttribute("data-id", bookmark.id);
				element.setAttribute("data-position", bookmark.position || 0);
				element.style.position = "absolute";
				element.style.top = `${i * CONSTANTS.BOOKMARK_HEIGHT}px`;
				element.style.left = "0";
				element.style.right = "0";

				container.appendChild(element);
				this.renderedItems.set(i, element);
			}
		}
	}

	render() {
		const state = store.getState();
		const { bookmarks, isLoading } = state;

		this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    height: 100%;
                    overflow-y: auto;
                }
                .bookmarks-container {
                    position: relative;
                    min-height: 100%;
                }
                .no-bookmarks {
                    padding: var(--space-lg);
                    text-align: center;
                    color: var(--text-secondary);
                }
                .loading-skeleton {
                    padding: var(--space-lg);
                }
            </style>

            ${
							isLoading && !bookmarks.length
								? `
                <div class="loading-skeleton">
                    ${Array(3)
											.fill(0)
											.map(
												() => `
                        <div class="bookmark-card loading-skeleton skeleton-card">
                            <div class="skeleton-header"></div>
                            <div class="skeleton-url"></div>
                            <div class="skeleton-actions"></div>
                        </div>
                    `,
											)
											.join("")}
                </div>
            `
								: bookmarks.length
									? `
                <div class="bookmarks-container" 
                    style="height: ${bookmarks.length * CONSTANTS.BOOKMARK_HEIGHT}px">
                </div>
            `
									: `
                <div class="no-bookmarks">No bookmarks found</div>
            `
						}
        `;

		if (bookmarks.length) {
			this.updateVisibleItems();

			// Observe the last few items for infinite scroll
			const lastItems = Array.from(this.renderedItems.values()).slice(
				-CONSTANTS.BUFFER_SIZE,
			);

			lastItems.forEach((item) => {
				this.intersectionObserver.observe(item);
			});
		}
	}
}

customElements.define("bookmark-list", BookmarkList);
