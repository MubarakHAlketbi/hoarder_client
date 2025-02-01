# Hoarder Client

Hoarder Client is a cross-platform desktop application for managing bookmarks, built with Tauri, Rust, and vanilla JavaScript. It serves as a client for the Hoarder bookmark management service, providing a user-friendly and performant interface for managing bookmarks, lists, tags, and highlights.

## Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/) (which includes npm)
-   [Rust](https://www.rust-lang.org/tools/install)
-   [Tauri CLI](https://tauri.app/v1/guides/getting-started/prerequisites)

### Installation

1. Clone the repository:

    ```bash
    git clone <repository-url>
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

### Development

To start the application in development mode, run:

```bash
npm run tauri dev
```

This will start the Tauri development server and open the application in a new window.

### Building

To build the application for production, run:

```bash
npm run tauri build
```

This will create an optimized build of the application in the `src-tauri/target/release` directory.

## Contributing

Contributions are welcome! Please read the [CONTRIBUTING.md](CONTRIBUTING.md) file for guidelines on how to contribute.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.