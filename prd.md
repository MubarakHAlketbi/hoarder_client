# Product Requirements Document: Hoarder Client

## 1. Introduction

### 1.1. Purpose

This document outlines the product requirements for the Hoarder Client application, a cross-platform desktop client for the Hoarder bookmark management service. The Hoarder Client aims to provide a user-friendly and performant interface for managing bookmarks, offering an alternative to the existing web interface.

### 1.2. App Overview

-   **Name:** Hoarder Client
-   **Description:** A cross-platform desktop application for managing bookmarks using the Hoarder API.
-   **Tagline:** Your powerful and efficient desktop bookmark manager.

## 2. Target Audience

The primary users of the Hoarder Client are individuals who:

-   Have a large number of bookmarks.
-   Use a bookmark manager to organize their bookmarks into lists.
-   Desire a fast and efficient way to search and manage their bookmarks.
-   May want to leverage LLMs for semantic search within their bookmark collection.
-   Prefer a dedicated desktop application over a web interface.

## 3. Key Features

The Hoarder GUI will provide the following features, mirroring the capabilities of the Hoarder API:

### 3.1. Bookmark Management

-   **Create Bookmarks:** Add new bookmarks with URLs, titles, and optional descriptions.
-   **Retrieve Bookmarks:** View a list of all bookmarks, with options to filter by favorited and archived status.
-   **Update Bookmarks:** Edit existing bookmarks (title, URL, description, favorited, archived).
-   **Delete Bookmarks:** Remove bookmarks.
-   **Search Bookmarks:** Search bookmarks by keywords, potentially using LLMs for semantic search.
-   **SingleFile Import:** Import bookmarks from SingleFile data.

### 3.2. Highlight Management

-   **Create Highlights:** Add highlights to bookmarks.
-   **Retrieve Highlights:** View highlights associated with bookmarks.
-   **Update Highlights:** Edit existing highlights.
-   **Delete Highlights:** Remove highlights.

### 3.3. List Management

-   **Create Lists:** Add new lists for organizing bookmarks.
-   **Retrieve Lists:** View all lists.
-   **Update Lists:** Edit list names.
-   **Delete Lists:** Remove lists.
-   **Manage Bookmarks in Lists:** Add and remove bookmarks from lists.

### 3.4. Tag Management

-   **Create Tags:** Add new tags.
-   **Retrieve Tags:** View all tags.
-   **Update Tags:** Edit tag names.
-   **Delete Tags:** Remove tags.
-   **Manage Bookmarks with Tags:** Add and remove tags from bookmarks.

### 3.5. Asset Management

-   **Upload Assets:** Upload assets and associate them with bookmarks.
-   **Retrieve Assets:** View assets associated with bookmarks.
-   **Delete Assets:** Remove assets.

### 3.6. Authentication

-   **Secure Authentication:** Support secure authentication using the Hoarder API's methods (credentials and OAuth).
-   **User Roles:** Handle user roles (admin and regular user) as defined by the Hoarder API.

## 4. Prioritization

The features are listed in order of priority, with bookmark management being the most critical, followed by other core functionalities like highlights, lists, tags, and assets. Authentication is essential for secure access to the Hoarder service.

## 5. Success Metrics

-   **User Adoption:** Track the number of users actively using the Hoarder GUI.
-   **Feature Usage:** Monitor the usage of different features to understand user behavior and identify areas for improvement.
-   **Performance:** Measure application responsiveness and loading times to ensure a fast and efficient user experience.
-   **User Satisfaction:** Gather user feedback through surveys or feedback forms to assess satisfaction levels.

## 6. Assumptions

-   The Hoarder API is stable and accessible.
-   Users have a basic understanding of bookmark management concepts.

## 7. Risks

-   **API Changes:** Changes to the Hoarder API could impact the functionality of the Hoarder GUI.
-   **Performance Bottlenecks:** Unforeseen performance issues could arise during development.
-   **User Interface Complexity:** Balancing simplicity with a comprehensive feature set could be challenging.

## 8. Technology

-   **Framework:** Tauri (Rust backend, **Vanilla JavaScript/HTML/CSS** frontend)
-   **Cross-Platform Compatibility:** Windows, macOS, Linux
-   **Frontend Approach:** The frontend will utilize vanilla JavaScript, HTML, and CSS for development. This approach prioritizes simplicity and performance, avoiding the overhead of complex frontend frameworks while still leveraging web technologies within the Tauri environment.

## 9. Dependencies

-   Hoarder API: The application relies on the Hoarder API for all data management and authentication.