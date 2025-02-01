// DOM Elements
const bookmarksList = document.getElementById('bookmarks-list');
const searchInput = document.getElementById('search');
const searchBtn = document.getElementById('search-btn');

// Fetch bookmarks from API
async function fetchBookmarks() {
    try {
        const response = await fetch('/api/v1/bookmarks');
        if (!response.ok) {
            throw new Error('Failed to fetch bookmarks');
        }
        const data = await response.json();
        displayBookmarks(data.bookmarks);
    } catch (error) {
        console.error('Error fetching bookmarks:', error);
    }
}

// Display bookmarks in the UI
function displayBookmarks(bookmarks) {
    bookmarksList.innerHTML = bookmarks.map(bookmark => `
        <div class="bookmark">
            <h3>${bookmark.title}</h3>
            <a href="${bookmark.url}" target="_blank">${bookmark.url}</a>
            <p>Created: ${new Date(bookmark.createdAt).toLocaleDateString()}</p>
        </div>
    `).join('');
}

// Event listeners
searchBtn.addEventListener('click', () => {
    const query = searchInput.value.trim();
    if (query) {
        // Implement search functionality
        console.log('Searching for:', query);
    }
});

// Initial load
fetchBookmarks();
