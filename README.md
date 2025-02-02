# Hoarder Web Client

A simple, efficient web client for the Hoarder bookmark management service.

## Features

- API key-based authentication
- Bookmark management (view, add, edit, delete)
- Search and filtering
- Favorites and archive support
- Responsive design

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/yourusername/hoarder-web-client.git
cd hoarder-web-client
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open http://localhost:3000 in your browser

## Configuration

The application requires:
- Server URL (e.g., https://hoarder.sato942.com)
- API Key (format: ak1_xxxxx_xxxxx)

These are stored securely in your browser's localStorage.

## Project Structure

```
hoarder-web-client/
├── src/
│   ├── index.html    # Main HTML file
│   ├── styles.css    # Styles
│   └── main.js       # Application logic
├── package.json      # Project configuration
└── README.md        # This file
```

## Development

- Pure HTML/CSS/JavaScript
- No build tools required
- Modern browser features
- LocalStorage for configuration

## Security

- HTTPS only
- Secure API key storage
- Input validation
- Error handling

## License

MIT