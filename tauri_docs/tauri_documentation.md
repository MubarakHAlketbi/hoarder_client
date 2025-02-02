# Documentation Index

This document provides an index of the Tauri documentation, with a brief description of each file.

**How to Use This Document (For AI/LLM Models):**

1. **Identify Keywords:** Determine the keywords related to the information you are seeking (e.g., "file system," "dialog," "updater").
2. **Search This Document:** Use your search capabilities to find sections in this document that contain those keywords in their titles or descriptions.
3. **Locate Relevant Files:** The section titles in this document correspond to the file paths of the actual documentation files (e.g., "## plugin/file-system.mdx").
4. **Read the Target File:** Use the `read_file` tool with the identified file path to access the full content of the relevant documentation file.

## concept/architecture.mdx

- Explains the architecture of Tauri, a toolkit for building desktop applications.
- Covers core components, tooling, and upstream crates like TAO and WRY.
- Highlights Tauri's use of Rust and web technologies for cross-platform development.

## concept/index.mdx

- Provides an overview of core concepts in Tauri development.
- Includes links to topics like architecture, IPC, security, process model, and app size.
- Serves as a starting point for understanding key aspects of the framework.

## concept/process-model.md

- Explains Tauri's multi-process architecture, similar to Electron or modern web browsers.
- Describes the core process as the entry point with full OS access, managing windows and IPC.
- Details the WebView process, which renders the UI using OS-provided WebView libraries.

## concept/size.mdx

- Provides tips for optimizing the size of Tauri applications.
- Focuses on Cargo configuration options for both stable and nightly Rust toolchains.
- Recommends settings like `codegen-units`, `lto`, `opt-level`, `panic`, and `strip` for size reduction.

## concept/Inter-Process Communication/brownfield.md

- Describes the Brownfield pattern in Tauri, the default for compatibility with existing frontend projects.
- Requires minimal changes to existing web frontends.
- Can be explicitly set in `tauri.conf.json` but is the default.

## concept/Inter-Process Communication/index.mdx

- Introduces Inter-Process Communication (IPC) in Tauri, enabling communication between isolated processes.
- Explains Events as one-way messages for lifecycle events and state changes.
- Describes Commands as a way for the Frontend to invoke Rust functions and receive data, using a JSON-RPC-like protocol.

## concept/Inter-Process Communication/isolation.md

- Explains the Isolation pattern in Tauri, enhancing security by intercepting and modifying API messages.
- Uses a sandboxed JavaScript application to run securely alongside the main frontend.
- Recommends keeping the Isolation application simple to minimize attack surface.

## develop/calling-frontend.mdx

- Explains how to communicate with the frontend from Rust in Tauri applications.
- Covers the event system, channels, and evaluating JavaScript.
- Provides examples for each method, including global and webview-specific events.

## develop/calling-rust.mdx

- Explains how to communicate with Rust from the frontend in Tauri applications.
- Covers commands for type-safe calls to Rust functions and the event system for dynamic communication.
- Provides examples for defining commands, passing arguments, returning data, error handling, and async commands.

## develop/configuration-files.mdx

- Explains the configuration files used in Tauri projects: `tauri.conf.json`, `Cargo.toml`, and `package.json`.
- Covers the purpose of each file and how they are used to configure the Tauri app, Rust dependencies, and frontend settings.
- Details platform-specific configurations, extending the configuration via the CLI, and managing dependencies.

## develop/index.mdx

- Provides an overview of developing with Tauri, including running the application in development mode for desktop and mobile.
- Explains how to use the development server, open the web inspector, and react to source code changes.
- Covers device selection, using Xcode or Android Studio, troubleshooting tips, and source control recommendations.

## develop/resources.mdx

- Explains how to embed additional files (resources) in a Tauri application bundle.
- Covers configuring `tauri.conf.json` to include resources and accessing them in Rust using `PathResolver`.
- Demonstrates accessing resources in JavaScript using `@tauri-apps/api/path` and `@tauri-apps/plugin-fs`, with notes on permissions.

## develop/sidecar.mdx

- Explains how to embed and use external binaries (sidecars) in a Tauri application.
- Covers configuring `tauri.conf.json` to include sidecars and running them from Rust using `tauri_plugin_shell::ShellExt`.
- Demonstrates running sidecars from JavaScript using `@tauri-apps/plugin-shell`, with notes on permissions and passing arguments.

## develop/state-management.mdx

- Explains how to manage application state in Tauri using the `Manager` API.
- Covers mutability using `Mutex` and accessing state in commands and event handlers.
- Provides examples for both synchronous and asynchronous commands, and accessing state with the `Manager` trait.

## develop/updating-dependencies.mdx

- Explains how to update npm and Cargo packages in a Tauri project.
- Provides commands for updating `@tauri-apps/cli` and `@tauri-apps/api` using npm, yarn, or pnpm.
- Describes how to update `tauri` and `tauri-build` dependencies in `Cargo.toml` using `cargo update` or `cargo upgrade`.

## develop/_sections/frontend-listen.mdx

- Explains how to listen to events on the frontend in a Tauri application using `@tauri-apps/api`.
- Covers listening to global and webview-specific events, unlistening, and listening once.
- Also briefly explains how to listen to events in Rust.

## develop/Debug/crabnebula-devtools.mdx

- Introduces CrabNebula DevTools, a free application for debugging Tauri apps.
- Explains how to install and initialize the `tauri-plugin-devtools` crate.
- Provides a link to the CrabNebula DevTools documentation for more information.

## develop/Debug/index.mdx

- Provides an overview of debugging in Tauri, including development-only code, Rust console, and WebView console.
- Explains how to open the devtools programmatically and enable the inspector in production builds.
- Mentions using GDB or LLDB for debugging the core process and links to a guide for using the LLDB VS Code extension.

## develop/Debug/neovim.mdx

- Explains how to set up debugging for Tauri applications in Neovim using `nvim-dap`, `nvim-dap-ui`, and `codelldb`.
- Provides instructions for installing and configuring the necessary plugins and setting up a `codelldb` adapter.
- Includes examples for starting the dev server using `overseer` and example key bindings for controlling debugging sessions.

## develop/Debug/rustrover.mdx

- Explains how to set up debugging for the core process of a Tauri app in JetBrains RustRover (and other JetBrains IDEs).
- Covers setting up a Cargo project, configuring run/debug configurations for the Tauri app and the development server.
- Provides instructions for launching a debugging session and debugging the Rust code.

## develop/Debug/vscode.mdx

- Explains how to set up debugging for the core process of a Tauri app in VS Code using either the `vscode-lldb` extension or the Visual Studio Windows Debugger.
- Provides instructions for configuring `launch.json` and `tasks.json` for both `vscode-lldb` and Visual Studio Windows Debugger.
- Covers setting breakpoints, running the debugger, and handling the `beforeDevCommand` and `beforeBuildCommand`.

## develop/Plugins/develop-mobile.mdx

- Explains how to develop mobile plugins for Tauri applications, covering Android (Kotlin/Java) and iOS (Swift).
- Covers plugin initialization, configuration, lifecycle events, adding mobile commands, handling arguments, and permissions.
- Provides code examples for both Android and iOS, demonstrating how to define commands, handle events, and interact with the Rust core.

## develop/Plugins/index.mdx

- Provides an overview of plugin development in Tauri, including naming conventions and project initialization.
- Explains plugin configuration, lifecycle events, exposing Rust APIs, adding commands with permissions, and managing state.
- Links to the mobile plugin development guide and provides examples for various plugin features.

## develop/Tests/index.mdx

- Provides an overview of testing in Tauri, including unit and integration testing with a mock runtime.
- Covers end-to-end testing with WebDriver for desktop and mobile (except macOS desktop).
- Mentions `tauri-action` for GitHub Actions and notes that any CI/CD runner can be used with Tauri.

## develop/Tests/mocking.mdx

- Explains how to mock Tauri APIs for frontend testing, using the `@tauri-apps/api/mocks` module.
- Covers mocking IPC requests with `mockIPC` and simulating windows with `mockWindows`.
- Provides examples using Vitest for testing, but notes that other testing libraries can be used.

## develop/Tests/WebDriver/ci.md

- Explains how to set up Continuous Integration (CI) for WebDriver tests in a Tauri application using GitHub Actions.
- Provides a commented example of a GitHub Actions workflow file that installs dependencies, builds the Tauri app, installs `tauri-driver`, and runs WebDriverIO tests.
- Assumes the use of Linux, `xvfb-run` for a fake display server, and a specific project structure.

## develop/Tests/WebDriver/index.mdx

- Provides an overview of WebDriver testing in Tauri, explaining its use for automated testing and its support on various platforms.
- Covers system dependencies for Linux and Windows, including installing `tauri-driver` and platform-specific WebDriver servers.
- Links to example applications using Selenium and WebdriverIO, and a guide for setting up continuous integration with WebDriver.

## develop/Tests/WebDriver/Example/index.mdx

- Provides a step-by-step guide to creating a minimal Tauri application for testing with WebDriver.
- Covers initializing a Cargo project, creating a minimal frontend (HTML), adding Tauri dependencies, and configuring `tauri.conf.json`.
- Explains how to build and run the example application and sets the stage for testing with WebdriverIO and Selenium.

## develop/Tests/WebDriver/Example/selenium.mdx

- Provides a step-by-step guide to setting up WebDriver testing with Selenium for the minimal Tauri example application.
- Explains how to create a directory for tests, initialize a Selenium project with dependencies like Mocha and Chai, and write a test script.
- Demonstrates running the test suite and verifying the output, showcasing end-to-end testing with Selenium and Tauri.

## develop/Tests/WebDriver/Example/webdriverio.mdx

- Provides a step-by-step guide to setting up WebDriver testing with WebdriverIO for the minimal Tauri example application.
- Explains how to create a directory for tests, initialize a WebdriverIO project with dependencies, and configure `wdio.conf.js`.
- Demonstrates writing a spec file with tests and running the test suite, showcasing end-to-end testing with WebdriverIO and Tauri.

## distribute/app-store.mdx

- Provides a guide for distributing Tauri apps via the Apple App Store, covering both macOS and iOS.
- Explains requirements, changing the app icon, setting up the project, and building and uploading the app.
- Covers platform-specific configurations, code signing, provisioning profiles, and using `altool` for uploading.

## distribute/appimage.mdx

- Explains how to distribute Tauri applications using the AppImage format for Linux.
- Covers multimedia support via GStreamer, including custom files in the AppImage, and building AppImages for ARM-based devices.
- Provides configuration examples and notes on limitations and considerations for each topic.

## distribute/aur.mdx

- Provides a guide on publishing Tauri applications to the Arch User Repository (AUR).
- Explains the steps for setting up an AUR account, creating a `PKGBUILD` file, generating the `SRCINFO` file, testing, and publishing.
- Includes examples of `PKGBUILD` files for extracting from a Debian package and building from source.

## distribute/crabnebula-cloud.mdx

- Introduces CrabNebula Cloud as a platform for distributing Tauri applications, integrated with the Tauri updater.
- Highlights its CDN for shipping installers and updates globally, support for multiple release channels, and download buttons.
- Provides links to the CrabNebula Cloud website, documentation, and a GitHub Action for simplified integration.

## distribute/debian.mdx

- Explains how to distribute Tauri applications as Debian packages.
- Covers the default configuration of the Debian package generated by the Tauri bundler.
- Describes how to customize the package with additional system dependencies and custom files using `tauri.conf.json`.

## distribute/dmg.mdx

- Explains how to distribute Tauri applications as DMG files on macOS.
- Covers creating a DMG installer with the Tauri CLI, setting a custom background image, and configuring window size and position.
- Details how to change the app and Applications folder icon positions within the DMG.

## distribute/google-play.mdx

- Provides a guide for distributing Tauri applications on the Google Play Store for Android.
- Covers requirements, changing the app icon, setting up the project on the Google Play Console, and building the app.
- Explains how to generate an Android App Bundle (AAB) or APK, configure the minimum supported Android version, and upload the app to the Play Store.

## distribute/index.mdx

- Provides an overview of distributing Tauri applications, including building, bundling, versioning, and signing.
- Explains how to build and bundle for different platforms and distribution channels, such as app stores and direct downloads.
- Links to detailed guides for each platform (Linux, macOS, Windows, Android, iOS) and distribution method (AppImage, Debian, Flatpak, RPM, Snapcraft, DMG, Microsoft Store, Google Play, App Store, and CrabNebula Cloud).

## distribute/macos-application-bundle.mdx

- Explains how to distribute Tauri applications as macOS application bundles (`.app`).
- Covers the structure of the app bundle, configuring the `Info.plist` file, and handling localization with `InfoPlist.strings`.
- Details setting entitlements, minimum system version, including macOS frameworks, and adding custom files to the bundle.

## distribute/microsoft-store.mdx

- Provides a guide for distributing Tauri applications on the Microsoft Store for Windows.
- Covers requirements, changing the app icon, setting up the project on the Microsoft Partner Center, and building the app.
- Explains how to configure an offline installer, handle the publisher name, and upload the app to the Microsoft Store.

## distribute/rpm.mdx

- Provides a guide on packaging and distributing Tauri applications as RPM packages for RPM-based Linux distributions.
- Explains how to configure the RPM package, add pre/post-install/remove scripts, set dependencies, and include custom files.
- Covers building, signing, verifying, and debugging the RPM package, along with examples and commands.

## distribute/snapcraft.mdx

- Provides a guide on packaging and distributing Tauri applications as Snap packages using Snapcraft.
- Covers prerequisites like installing `snap` and `snapcraft`, configuring the `snapcraft.yaml` file, and building the snap.
- Explains how to test the snap locally, release it manually using `snapcraft upload`, and set up automatic builds with GitHub.

## plugin/autostart.mdx

- Explains how to use the `autostart` plugin to automatically launch a Tauri application at system startup.
- Covers installation, setup, and usage of the plugin in both JavaScript and Rust.
- Details the necessary permissions to enable, disable, and check the autostart status of the application.

## plugin/barcode-scanner.mdx

- Explains how to use the `barcode-scanner` plugin to enable barcode scanning capabilities in Tauri mobile applications.
- Covers installation, setup, configuration (including iOS-specific settings), and usage in JavaScript.
- Details the necessary permissions to access barcode scanning functionalities and provides a sample usage code snippet.

## plugin/biometric.mdx

- Explains how to use the `biometric` plugin to prompt users for biometric authentication on Android and iOS devices.
- Covers installation, setup, configuration (including iOS-specific settings), and usage in both JavaScript and Rust.
- Details checking the biometric authentication status, prompting for authentication with various options, and handling the result.

## plugin/cli.mdx

- Explains how to use the `cli` plugin to parse command-line arguments in Tauri applications using the `clap` crate.
- Covers installation, setup, base configuration, adding arguments (positional, named, flag), and defining subcommands.
- Demonstrates how to access the parsed arguments in both JavaScript and Rust, and highlights the necessary permissions.

## plugin/clipboard.mdx

- Explains how to use the `clipboard-manager` plugin to read and write to the system clipboard in Tauri applications.
- Covers installation, setup, and usage of the plugin in both JavaScript and Rust.
- Provides examples for writing and reading text from the clipboard, along with the necessary permissions.

## plugin/deep-linking.mdx

- Explains how to use the `deep-link` plugin to set a Tauri application as the default handler for a specific URL scheme or domain.
- Covers installation, setup, and configuration for Android, iOS, and desktop platforms.
- Details how to listen for deep links in both JavaScript and Rust, register deep links at runtime, and test deep link handling on different platforms.

## plugin/dialog.mdx

- Explains how to use the `dialog` plugin to create native system dialogs for opening and saving files, along with message dialogs in Tauri applications.
- Covers installation, setup, and usage in both JavaScript and Rust.
- Provides examples for creating Yes/No, Ok/Cancel, and message dialogs, as well as opening file/directory selection and save dialogs in both JavaScript and Rust.

## plugin/file-system.mdx

- Explains how to use the `fs` plugin to access the file system in Tauri applications.
- Covers installation, setup, configuration for Android and iOS, and usage in both JavaScript and Rust.
- Details various file system operations like creating, writing, opening, reading, removing, copying, checking existence, getting metadata, renaming, truncating, and watching for changes, along with necessary permissions and scopes.

## plugin/global-shortcut.mdx

- Explains how to use the `global-shortcut` plugin to register global keyboard shortcuts in Tauri applications.
- Covers installation, setup, and usage of the plugin in both JavaScript and Rust.
- Details the necessary permissions to register, unregister, and check the status of global shortcuts.

## plugin/http-client.mdx

- Explains how to use the `http` plugin to make HTTP requests in Tauri applications.
- Covers installation, setup, and usage in both JavaScript and Rust.
- Details configuring allowed URLs, sending requests with the `fetch` API in JavaScript, using the re-exported `reqwest` crate in Rust, and handling permissions.

## plugin/index.mdx

- Provides an overview of the "Features & Recipes" section, listing built-in Tauri features and community resources.
- Includes a searchable list of features and community-developed plugins and integrations.
- Presents a support table showing the compatibility of different plugins across various platforms.

## plugin/localhost.mdx

- Explains how to use the `localhost` plugin to expose a Tauri application's assets through a localhost server instead of the default custom protocol.
- Covers installation, setup, and usage of the plugin in Rust.
- Warns about the considerable security risks associated with using a localhost server and advises caution.

## plugin/logging.mdx

- Explains how to use the `log` plugin for configurable logging in Tauri applications.
- Covers installation, setup, and usage in both JavaScript and Rust.
- Details logging to the terminal, webview console, and files, along with filtering and formatting options, and necessary permissions.

## plugin/nfc.mdx

- Explains how to use the `nfc` plugin to read and write NFC tags on Android and iOS devices in Tauri applications.
- Covers installation, setup, configuration (including iOS-specific settings), and usage in both JavaScript and Rust.
- Details checking NFC availability, scanning NFC tags with filters, writing to NFC tags, and handling permissions.

## plugin/opener.mdx

- Explains how to use the `opener` plugin to open files and URLs in external applications in Tauri.
- Covers installation, setup, and usage of the plugin in both JavaScript and Rust.
- Details the necessary permissions to open files and URLs, including specifying allowed paths in the capabilities configuration.

## plugin/os-info.mdx

- Explains how to use the `os` plugin to retrieve information about the operating system in Tauri applications.
- Covers installation, setup, and usage of the plugin in both JavaScript and Rust.
- Provides an example of getting the OS platform and details the necessary permissions to access OS information.

## plugin/persisted-scope.mdx

- Explains how to use the `persisted-scope` plugin to save and restore filesystem and asset scopes in Tauri applications.
- Covers installation and setup of the plugin in Rust.
- States that the plugin automatically handles saving and restoring scopes after setup.

## plugin/positioner.mdx

- Explains how to use the `positioner` plugin to move windows to common locations in Tauri applications.
- Covers installation, setup, and usage of the plugin in both JavaScript and Rust.
- Details additional setup required for tray-relative positions and the necessary permissions to use the plugin.

## plugin/process.mdx

- Explains how to use the `process` plugin to access the current process in Tauri applications.
- Covers installation, setup, and usage of the plugin in both JavaScript and Rust.
- Details the necessary permissions to use the `exit` and `relaunch` functionalities.

## plugin/shell.mdx

- Explains how to use the `shell` plugin to access the system shell and spawn child processes in Tauri applications.
- Covers installation, setup, and usage of the plugin in both JavaScript and Rust.
- Details the necessary permissions to execute commands and configure allowed arguments, including an example using `exec-sh`.

## plugin/single-instance.mdx

- Explains how to use the `single-instance` plugin to ensure that only one instance of a Tauri application is running at a time.
- Covers installation, setup, and usage of the plugin in Rust.
- Details how to initialize the plugin with a closure that is invoked when a new instance is started, and how to focus the existing window.

## plugin/sql.mdx

- Explains how to use the `sql` plugin to interact with SQL databases (SQLite, MySQL, PostgreSQL) in Tauri applications using `sqlx`.
- Covers installation, setup, usage in JavaScript, and database-specific syntax for queries.
- Details how to define and apply database migrations, manage migration versions, and configure necessary permissions.

## plugin/store.mdx

- Explains how to use the `store` plugin for persistent key-value storage in Tauri applications.
- Covers installation, setup, and usage of the plugin in both JavaScript and Rust.
- Details how to create, load, set, get, save, and manage a store, including a `LazyStore` API and migration from older versions.

## plugin/stronghold.mdx

- Explains how to use the `stronghold` plugin to store secrets and keys using the IOTA Stronghold secret management engine in Tauri applications.
- Covers installation, setup, and usage of the plugin in both JavaScript and Rust.
- Details how to initialize the plugin with a password hash function (either the default `argon2` or a custom one), and how to use the JavaScript API to interact with the Stronghold vault.

## plugin/updater.mdx

- Explains how to use the `updater` plugin to implement in-app updates for Tauri applications.
- Covers installation, setup, signing updates, configuring the updater in `tauri.conf.json`, and setting up an update server (static or dynamic).
- Details how to check for updates, download and install them in both JavaScript and Rust, along with runtime configuration options and necessary permissions.

## plugin/websocket.mdx

- Explains how to use the `websocket` plugin to establish WebSocket connections in Tauri applications using a Rust client from JavaScript.
- Covers installation, setup, and usage of the plugin in JavaScript.
- Details how to connect to a WebSocket server, send messages, listen for incoming messages, and disconnect, along with the necessary permissions.

## reference/_cli.mdx

- Provides an overview of the Tauri command-line interface (CLI).
- Explains how to add the Tauri CLI to a project using various package managers.
- Includes a placeholder for a list of CLI commands and a tip for plugin developers.
