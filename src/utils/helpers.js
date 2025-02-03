// Utility Functions
export function debounce(func, wait) {
	let timeout;
	return function executedFunction(...args) {
		const later = () => {
			clearTimeout(timeout);
			func(...args);
		};
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
	};
}

export function validateUrl(url) {
	try {
		const parsedUrl = new URL(url);
		return parsedUrl.protocol === "https:";
	} catch {
		return false;
	}
}

export function validateApiKey(apiKey) {
	return /^ak1_[a-zA-Z0-9]+_[a-zA-Z0-9]+$/.test(apiKey);
}

export function formatFileSize(bytes) {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function escapeHtml(str) {
	if (str === null || str === undefined) return "";
	return String(str)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

export function classNames(...args) {
	return args
		.flat()
		.filter((x) => x)
		.join(" ");
}

export function getBookmarksFromResponse(response) {
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

	console.warn("Unexpected response format:", response);
	return [];
}

export function getNextCursorFromResponse(response) {
	if (!response) return null;

	if (response.nextCursor !== undefined) {
		return response.nextCursor;
	}

	if (response.meta?.nextCursor !== undefined) {
		return response.meta.nextCursor;
	}

	if (
		response.meta?.currentPage !== undefined &&
		response.meta?.totalPages !== undefined
	) {
		return response.meta.currentPage < response.meta.totalPages
			? response.meta.currentPage + 1
			: null;
	}

	console.warn("Could not determine next cursor from response:", response);
	return null;
}

export function sanitizeHtml(html) {
	const div = document.createElement("div");
	div.textContent = html;
	return div.innerHTML;
}

export const CONSTANTS = {
	CONFIG_KEY: "hoarder_config",
	THEME_KEY: "theme",
	MAX_RECENT_SEARCHES: 5,
	BOOKMARK_HEIGHT: 150,
	BUFFER_SIZE: 10,
	MAX_RETRIES: 3,
	RETRY_DELAY: 1000,
};
