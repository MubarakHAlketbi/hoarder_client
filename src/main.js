import { store } from "./state/store.js";
import { createApiClient } from "./api/client.js";
import { CONSTANTS } from "./utils/helpers.js";
import { showToast } from "./components/Toast.js";
import "./components/BookmarkCard.js";
import "./components/BookmarkList.js";
import "./components/SearchBar.js";
import "./components/Modal.js";

class App {
	constructor() {
		this.api = null;
		this.setupComponents();
		this.initializeFromConfig();
	}

	setupComponents() {
		// Add components to DOM
		this.setupSection = document.getElementById("setup-section");
		this.mainContent = document.getElementById("main-content");
		this.setupForm = document.getElementById("setup-form");

		// Setup event listeners
		this.setupForm.addEventListener("submit", this.handleSetup.bind(this));
		document.addEventListener("keydown", this.handleGlobalKeyboard.bind(this));

		// Initialize theme
		const theme = localStorage.getItem(CONSTANTS.THEME_KEY) || "dark";
		document.documentElement.setAttribute("data-theme", theme);
		document.getElementById("theme-toggle").checked = theme === "dark";
	}

	async initializeFromConfig() {
		const config = this.getConfig();
		if (config) {
			this.api = createApiClient(config.serverUrl, config.apiKey);
			store.setApi(this.api);
			await this.initializeApp();
		}
	}

	getConfig() {
		const config = localStorage.getItem(CONSTANTS.CONFIG_KEY);
		return config ? JSON.parse(config) : null;
	}

	setConfig(serverUrl, apiKey) {
		localStorage.setItem(
			CONSTANTS.CONFIG_KEY,
			JSON.stringify({ serverUrl, apiKey }),
		);
		this.updateServerDisplay();
	}

	updateServerDisplay() {
		const config = this.getConfig();
		if (config?.serverUrl) {
			document.getElementById("current-server").textContent = config.serverUrl;
		}
	}

	async handleSetup(e) {
		e.preventDefault();

		const serverUrl = document.getElementById("server-url").value.trim();
		const apiKey = document.getElementById("api-key").value.trim();

		if (!this.validateSetup(serverUrl, apiKey)) {
			return;
		}

		store.setLoading(true);
		try {
			this.api = createApiClient(serverUrl, apiKey);
			store.setApi(this.api);
			await this.api.checkHealth();

			this.setConfig(serverUrl, apiKey);
			await this.initializeApp();
		} catch (err) {
			console.error("Setup error:", err);
			this.showSetupError(`Failed to connect: ${err.message}`);
		} finally {
			store.setLoading(false);
		}
	}

	validateSetup(serverUrl, apiKey) {
		if (!serverUrl.startsWith("https://")) {
			this.showSetupError("Please enter a valid HTTPS URL");
			return false;
		}

		if (!/^ak1_[a-zA-Z0-9]+_[a-zA-Z0-9]+$/.test(apiKey)) {
			this.showSetupError("Invalid API key format");
			return false;
		}

		return true;
	}

	showSetupError(message) {
		const setupMessage = document.getElementById("setup-message");
		setupMessage.textContent = message;
		setupMessage.className = "error";
	}

	async initializeApp() {
		try {
			// Hide setup, show main content
			this.setupSection.classList.add("hidden");
			this.mainContent.classList.remove("hidden");

			// Initialize data
			await Promise.all([
				store.dispatch("fetchBookmarks", true),
				store.dispatch("fetchLists"),
				store.dispatch("fetchTags"),
			]);
		} catch (err) {
			console.error("Initialization error:", err);
			showToast(`Failed to initialize app: ${err.message}`, "error");
		}
	}

	handleGlobalKeyboard(e) {
		// Ignore shortcuts when typing in input fields
		if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
			return;
		}

		const shortcuts = {
			"/": () => document.querySelector("search-bar").focus(),
			n: () => document.getElementById("new-list-btn").click(),
			b: () => store.dispatch("toggleBulkOperations"),
			f: () => store.dispatch("toggleFavorites"),
			a: () => store.dispatch("toggleArchived"),
			Escape: () => {
				const modal = document.querySelector("modal-dialog:not(.hidden)");
				if (modal) {
					modal.close();
				} else if (
					store.getState().filters.activeList ||
					store.getState().filters.activeTag
				) {
					store.setFilters({ activeList: null, activeTag: null });
					store.dispatch("fetchBookmarks", true);
				}
			},
		};

		const shortcut = shortcuts[e.key];
		if (shortcut) {
			e.preventDefault();
			shortcut();
		}
	}
}

// Initialize app
const app = new App();
