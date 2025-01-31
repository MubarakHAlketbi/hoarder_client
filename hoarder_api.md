# assets.md

```md
# Hoarder API Assets Management

This document describes the API endpoints for managing assets in the Hoarder API, located in the `code/assets` directory.

## Asset Upload

### `uploadFromPostData(user, db, formData)`

Handles the upload of an asset from form data.

**Parameters:**

-   `user`: The authenticated user object.
-   `db`: The database connection object.
-   `formData`: The form data containing the asset file.

**Returns:**

-   An object containing an error message and status code if the upload fails.
-   An object containing the `assetId`, `contentType`, `fileName`, and `size` if the upload succeeds.

**Functionality:**

1. Checks if the uploaded data is a `File` instance.
2. Validates the content type against a list of supported types.
3. Checks if the file size exceeds the maximum allowed size.
4. Reads the file content into a buffer.
5. Inserts a new record into the `assets` table in the database with initial values (e.g., `assetType` set to `UNKNOWN`, `bookmarkId` set to `null`).
6. Saves the asset file using the `saveAsset` function.
7. Returns the asset ID, content type, size, and file name.

### `POST /api/assets`

Handles asset upload requests.

**Request Body:**

-   Form data containing the asset file (either as `file` or `image`).

**Response:**

-   `status`: 401 if the user is not authenticated.
-   `status`: 403 if the application is in demo mode.
-   `status`: 400 if the request is invalid or the asset type is unsupported.
-   `status`: 413 if the asset size exceeds the maximum allowed size.
-   `status`: 200 if the upload is successful.
-   `resp`: An object containing the `assetId`, `contentType`, `size`, and `fileName` if the upload is successful.

**Example:**

\`\`\`
POST /api/assets
\`\`\`

\`\`\`
------WebKitFormBoundaryExample
Content-Disposition: form-data; name="file"; filename="image.jpg"
Content-Type: image/jpeg

[...image data...]
------WebKitFormBoundaryExample--
\`\`\`

\`\`\`json
{
  "assetId": "a1",
  "contentType": "image/jpeg",
  "size": 12345,
  "fileName": "image.jpg"
}
\`\`\`

## Asset Retrieval

### `GET /api/assets/[assetId]`

Retrieves a specific asset by its ID.

**Parameters:**

-   `assetId`: The ID of the asset.

**Request Headers:**

-   `Range` (optional): Specifies the byte range of the asset to retrieve (e.g., `bytes=0-999`).

**Response:**

-   `status`: 401 if the user is not authenticated.
-   `status`: 404 if the asset is not found.
-   `status`: 200 if the request is successful and the `Range` header is not specified.
-   `status`: 206 if the request is successful and the `Range` header is specified (partial content).
-   `resp`: The asset data as a stream.

**Headers (200 OK):**

-   `Content-Length`: The size of the asset in bytes.
-   `Content-type`: The content type of the asset.

**Headers (206 Partial Content):**

-   `Content-Range`: Specifies the byte range of the asset being returned (e.g., `bytes 0-999/12345`).
-   `Accept-Ranges`: Indicates that the server supports range requests (`bytes`).
-   `Content-Length`: The size of the partial content being returned.
-   `Content-type`: The content type of the asset.

**Example (Full Asset):**

\`\`\`
GET /api/assets/a1
\`\`\`

**Example (Partial Content):**

\`\`\`
GET /api/assets/a1
Range: bytes=0-999
```

# auth.md

```md
# Hoarder API Authentication

This document describes the authentication setup for the Hoarder API.

## Authentication Handler

The authentication logic is handled by the `authHandler` function, which is defined in `apps/web/server/auth.ts`. This function is used as both the `GET` and `POST` handler for the `/api/auth/[...nextauth]` route, as configured in `code/auth/[...nextauth]/route.tsx`.

## NextAuth.js

The API uses NextAuth.js for authentication. The `authOptions` object configures NextAuth.js with the following:

-   **Adapter:** `DrizzleAdapter` is used to connect to the database.
-   **Providers:**
    -   `CredentialsProvider`: Allows users to sign in with an email and password.
    -   `OAuth Provider`: Allows users to sign in with an OAuth provider (if configured in `serverConfig.auth.oauth`).
-   **Session Strategy:** `jwt` is used for session management.
-   **Pages:** Custom sign-in, sign-out, error, and new user pages are configured.
-   **Callbacks:**
    -   `signIn`: Checks if the user is allowed to sign in. If it's a new user and signups are disabled, the sign-in is rejected.
    -   `jwt`: Adds user information (ID, name, email, image, role) to the JWT.
    -   `session`: Adds user information to the session object.

## Credentials Provider

The `CredentialsProvider` is configured to:

-   Accept an email and password.
-   Use the `validatePassword` function to authenticate the user.
-   Log authentication errors using `logAuthenticationError`.

## OAuth Provider

If configured in `serverConfig.auth.oauth`, an OAuth provider is added. It uses the provided `wellKnownUrl`, `clientId`, `clientSecret`, and other settings. The `profile` function maps the OAuth profile to a user object, setting the role to "admin" if the user is the first user or if the user's email is configured as an admin.

## User Roles

The API supports two user roles:

-   `admin`: Users with administrative privileges.
-   `user`: Regular users.

The first user to sign up is automatically assigned the "admin" role. Additionally, users with emails configured as admins in the database will also have the "admin" role.

## Database

The API uses a database to store user information, accounts, sessions, and verification tokens. The `DrizzleAdapter` connects NextAuth.js to the database using the `db` object from `@hoarder/db`.

## Server Config

The `serverConfig` object from `@hoarder/shared/config` is used to configure various aspects of authentication, such as demo mode, signups, and OAuth settings.
```

# bookmarks.md

```md
# Hoarder API Bookmarks Endpoints

This document describes the API endpoints for managing bookmarks in the Hoarder API, located in the `code/v1/bookmarks` directory.

## `/v1/bookmarks`

### `GET /v1/bookmarks`

Retrieves a list of bookmarks.

**Request Parameters:**

-   `favourited` (optional): A boolean string (`"true"` or `"false"`) indicating whether to filter by favourited bookmarks.
-   `archived` (optional): A boolean string (`"true"` or `"false"`) indicating whether to filter by archived bookmarks.
-   `limit` (optional): A number representing the maximum number of bookmarks to return.
-   `cursor` (optional): A string representing the cursor for pagination.

**Response:**

-   `status`: 200
-   `resp`: An object containing an array of bookmarks and a `nextCursor` for pagination.

**Example:**

\`\`\`
GET /v1/bookmarks?favourited=true&limit=10
\`\`\`

\`\`\`json
{
  "bookmarks": [
    {
      "bookmarkId": "1",
      "url": "https://example.com",
      "title": "Example Domain",
      "favourited": true,
      "archived": false,
      "createdAt": "2023-10-27T12:00:00Z"
    }
  ],
  "nextCursor": "2_2023-10-27T11:00:00Z"
}
\`\`\`

### `POST /v1/bookmarks`

Creates a new bookmark.

**Request Body:**

Conforms to the `zNewBookmarkRequestSchema` schema.

**Response:**

-   `status`: 201
-   `resp`: The created bookmark object.

**Example:**

\`\`\`
POST /v1/bookmarks
\`\`\`

\`\`\`json
{
  "url": "https://example.com",
  "title": "Example Domain"
}
\`\`\`

\`\`\`json
{
  "bookmarkId": "2",
  "url": "https://example.com",
  "title": "Example Domain",
  "favourited": false,
  "archived": false,
  "createdAt": "2023-10-27T13:00:00Z"
}
\`\`\`

## `/v1/bookmarks/[bookmarkId]`

### `GET /v1/bookmarks/[bookmarkId]`

Retrieves a specific bookmark by its ID.

**Parameters:**

-   `bookmarkId`: The ID of the bookmark.

**Response:**

-   `status`: 200
-   `resp`: The bookmark object.

**Example:**

\`\`\`
GET /v1/bookmarks/1
\`\`\`

\`\`\`json
{
  "bookmarkId": "1",
  "url": "https://example.com",
  "title": "Example Domain",
  "favourited": true,
  "archived": false,
  "createdAt": "2023-10-27T12:00:00Z"
}
\`\`\`

### `PATCH /v1/bookmarks/[bookmarkId]`

Updates a specific bookmark.

**Parameters:**

-   `bookmarkId`: The ID of the bookmark.

**Request Body:**

Conforms to the `zUpdateBookmarksRequestSchema` schema, excluding the `bookmarkId` field.

**Response:**

-   `status`: 200
-   `resp`: The updated bookmark object.

**Example:**

\`\`\`
PATCH /v1/bookmarks/1
\`\`\`

\`\`\`json
{
  "title": "New Title",
  "favourited": false
}
\`\`\`

\`\`\`json
{
  "bookmarkId": "1",
  "url": "https://example.com",
  "title": "New Title",
  "favourited": false,
  "archived": false,
  "createdAt": "2023-10-27T12:00:00Z"
}
\`\`\`

### `DELETE /v1/bookmarks/[bookmarkId]`

Deletes a specific bookmark.

**Parameters:**

-   `bookmarkId`: The ID of the bookmark.

**Response:**

-   `status`: 204

**Example:**

\`\`\`
DELETE /v1/bookmarks/1
\`\`\`

## `/v1/bookmarks/[bookmarkId]/assets`

### `GET /v1/bookmarks/[bookmarkId]/assets`

Retrieves the assets associated with a specific bookmark.

**Parameters:**

-   `bookmarkId`: The ID of the bookmark.

**Response:**

-   `status`: 200
-   `resp`: An object containing an array of assets.

**Example:**

\`\`\`
GET /v1/bookmarks/1/assets
\`\`\`

\`\`\`json
{
  "assets": [
    {
      "assetId": "a1",
      "url": "https://example.com/asset1.jpg"
    }
  ]
}
\`\`\`

### `POST /v1/bookmarks/[bookmarkId]/assets`

Attaches an asset to a specific bookmark.

**Parameters:**

-   `bookmarkId`: The ID of the bookmark.

**Request Body:**

Conforms to the `zAssetSchema` schema.

**Response:**

-   `status`: 201
-   `resp`: The attached asset object.

**Example:**

\`\`\`
POST /v1/bookmarks/1/assets
\`\`\`

\`\`\`json
{
  "assetId": "a2",
  "url": "https://example.com/asset2.jpg"
}
\`\`\`

\`\`\`json
{
  "assetId": "a2",
  "url": "https://example.com/asset2.jpg"
}
\`\`\`

## `/v1/bookmarks/[bookmarkId]/assets/[assetId]`

### `PUT /v1/bookmarks/[bookmarkId]/assets/[assetId]`

Replaces an asset associated with a bookmark.

**Parameters:**

-   `bookmarkId`: The ID of the bookmark.
-   `assetId`: The ID of the asset to be replaced.

**Request Body:**

-   `assetId`: The ID of the new asset.

**Response:**

-   `status`: 204

**Example:**

\`\`\`
PUT /v1/bookmarks/1/assets/a1
\`\`\`

\`\`\`json
{
  "assetId": "a3"
}
\`\`\`

### `DELETE /v1/bookmarks/[bookmarkId]/assets/[assetId]`

Detaches an asset from a bookmark.

**Parameters:**

-   `bookmarkId`: The ID of the bookmark.
-   `assetId`: The ID of the asset to be detached.

**Response:**

-   `status`: 204

**Example:**

\`\`\`
DELETE /v1/bookmarks/1/assets/a1
\`\`\`

## `/v1/bookmarks/[bookmarkId]/highlights`

### `GET /v1/bookmarks/[bookmarkId]/highlights`

Retrieves the highlights for a specific bookmark.

**Parameters:**

-   `bookmarkId`: The ID of the bookmark.

**Response:**

-   `status`: 200
-   `resp`: An array of highlight objects.

**Example:**

\`\`\`
GET /v1/bookmarks/1/highlights
\`\`\`

\`\`\`json
[
  {
    "highlightId": "h1",
    "text": "This is a highlight",
    "createdAt": "2023-10-27T14:00:00Z"
  }
]
\`\`\`

## `/v1/bookmarks/[bookmarkId]/lists`

### `GET /v1/bookmarks/[bookmarkId]/lists`

Retrieves the lists that a specific bookmark belongs to.

**Parameters:**

-   `bookmarkId`: The ID of the bookmark.

**Response:**

-   `status`: 200
-   `resp`: An array of list objects.

**Example:**

\`\`\`
GET /v1/bookmarks/1/lists
\`\`\`

\`\`\`json
[
  {
    "listId": "l1",
    "name": "My List"
  }
]
\`\`\`

## `/v1/bookmarks/[bookmarkId]/tags`

### `POST /v1/bookmarks/[bookmarkId]/tags`

Attaches tags to a specific bookmark.

**Parameters:**

-   `bookmarkId`: The ID of the bookmark.

**Request Body:**

-   `tags`: An array of tags conforming to the `zManipulatedTagSchema` schema.

**Response:**

-   `status`: 200
-   `resp`: An object containing an array of attached tags.

**Example:**

\`\`\`
POST /v1/bookmarks/1/tags
\`\`\`

\`\`\`json
{
  "tags": [
    {
      "tagId": "t1",
      "name": "tag1"
    },
    {
      "tagId": "t2",
      "name": "tag2"
    }
  ]
}
\`\`\`

\`\`\`json
{
  "attached": [
    {
      "tagId": "t1",
      "name": "tag1"
    },
    {
      "tagId": "t2",
      "name": "tag2"
    }
  ]
}
\`\`\`

### `DELETE /v1/bookmarks/[bookmarkId]/tags`

Detaches tags from a specific bookmark.

**Parameters:**

-   `bookmarkId`: The ID of the bookmark.

**Request Body:**

-   `tags`: An array of tags conforming to the `zManipulatedTagSchema` schema.

**Response:**

-   `status`: 200
-   `resp`: An object containing an array of detached tags.

**Example:**

\`\`\`
DELETE /v1/bookmarks/1/tags
\`\`\`

\`\`\`json
{
  "tags": [
    {
      "tagId": "t1",
      "name": "tag1"
    }
  ]
}
\`\`\`

\`\`\`json
{
  "detached": [
    {
      "tagId": "t1",
      "name": "tag1"
    }
  ]
}
\`\`\`

## `/v1/bookmarks/search`

### `GET /v1/bookmarks/search`

Searches for bookmarks based on a query string.

**Request Parameters:**

-   `q`: The search query string.
-   `limit` (optional): The maximum number of results to return.
-   `cursor` (optional): A cursor for pagination.

**Response:**

-   `status`: 200
-   `resp`: An object containing an array of bookmarks and a `nextCursor` for pagination.

**Example:**

\`\`\`
GET /v1/bookmarks/search?q=example&limit=5
\`\`\`

\`\`\`json
{
  "bookmarks": [
    {
      "bookmarkId": "1",
      "url": "https://example.com",
      "title": "Example Domain",
      "favourited": true,
      "archived": false,
      "createdAt": "2023-10-27T12:00:00Z"
    }
  ],
  "nextCursor": "5"
}
\`\`\`

## `/v1/bookmarks/singlefile`

### `POST /v1/bookmarks/singlefile`

Creates a bookmark from SingleFile data.

**Request Body:**

-   Form data containing the SingleFile data and the URL of the bookmark.

**Response:**

-   `status`: 201
-   `resp`: The created bookmark object.

**Example:**

\`\`\`
POST /v1/bookmarks/singlefile
\`\`\`

\`\`\`
------WebKitFormBoundaryExample
Content-Disposition: form-data; name="file"; filename="singlefile.html"
Content-Type: text/html

<!DOCTYPE html>
<html>
<head>
  <title>SingleFile Data</title>
</head>
<body>
  <h1>SingleFile Content</h1>
</body>
</html>
------WebKitFormBoundaryExample
Content-Disposition: form-data; name="url"

https://example.com
------WebKitFormBoundaryExample--
\`\`\`

\`\`\`json
{
  "bookmarkId": "3",
  "url": "https://example.com",
  "title": "Example Domain",
  "favourited": false,
  "archived": false,
  "createdAt": "2023-10-27T15:00:00Z",
  "type": "LINK",
  "precrawledArchiveId": "a4"
}
```

# health.md

```md
# Hoarder API Health Check

This document describes the health check endpoint for the Hoarder API, located in the `code/health` directory.

## `/api/health`

### `GET /api/health`

Checks the health status of the API.

**Response:**

-   `status`: 200
-   `resp`: A JSON object with a `status` field set to "ok" and a `message` field indicating that the web app is working.

**Example:**

\`\`\`
GET /api/health
\`\`\`

\`\`\`json
{
  "status": "ok",
  "message": "Web app is working"
}
```

# highlights.md

```md
# Hoarder API Highlights Endpoints

This document describes the API endpoints for managing highlights in the Hoarder API, located in the `code/v1/highlights` directory.

## `/v1/highlights`

### `GET /v1/highlights`

Retrieves a list of highlights.

**Request Parameters:**

-   `limit` (optional): A number representing the maximum number of highlights to return.
-   `cursor` (optional): A string representing the cursor for pagination.

**Response:**

-   `status`: 200
-   `resp`: An object containing an array of highlights and a `nextCursor` for pagination.

**Example:**

\`\`\`
GET /v1/highlights?limit=10
\`\`\`

\`\`\`json
{
  "highlights": [
    {
      "highlightId": "h1",
      "bookmarkId": "1",
      "text": "This is a highlight",
      "createdAt": "2023-10-27T14:00:00Z"
    }
  ],
  "nextCursor": "h2_2023-10-27T13:00:00Z"
}
\`\`\`

### `POST /v1/highlights`

Creates a new highlight.

**Request Body:**

Conforms to the `zNewHighlightSchema` schema.

**Response:**

-   `status`: 201
-   `resp`: The created highlight object.

**Example:**

\`\`\`
POST /v1/highlights
\`\`\`

\`\`\`json
{
  "bookmarkId": "1",
  "text": "This is a new highlight"
}
\`\`\`

\`\`\`json
{
  "highlightId": "h2",
  "bookmarkId": "1",
  "text": "This is a new highlight",
  "createdAt": "2023-10-27T15:00:00Z"
}
\`\`\`

## `/v1/highlights/[highlightId]`

### `GET /v1/highlights/[highlightId]`

Retrieves a specific highlight by its ID.

**Parameters:**

-   `highlightId`: The ID of the highlight.

**Response:**

-   `status`: 200
-   `resp`: The highlight object.

**Example:**

\`\`\`
GET /v1/highlights/h1
\`\`\`

\`\`\`json
{
  "highlightId": "h1",
  "bookmarkId": "1",
  "text": "This is a highlight",
  "createdAt": "2023-10-27T14:00:00Z"
}
\`\`\`

### `PATCH /v1/highlights/[highlightId]`

Updates a specific highlight.

**Parameters:**

-   `highlightId`: The ID of the highlight.

**Request Body:**

Conforms to the `zUpdateHighlightSchema` schema, excluding the `highlightId` field.

**Response:**

-   `status`: 200
-   `resp`: The updated highlight object.

**Example:**

\`\`\`
PATCH /v1/highlights/h1
\`\`\`

\`\`\`json
{
  "text": "This is an updated highlight"
}
\`\`\`

\`\`\`json
{
  "highlightId": "h1",
  "bookmarkId": "1",
  "text": "This is an updated highlight",
  "createdAt": "2023-10-27T14:00:00Z"
}
\`\`\`

### `DELETE /v1/highlights/[highlightId]`

Deletes a specific highlight.

**Parameters:**

-   `highlightId`: The ID of the highlight.

**Response:**

-   `status`: 200
-   `resp`: The deleted highlight object.

**Example:**

\`\`\`
DELETE /v1/highlights/h1
\`\`\`

\`\`\`json
{
  "highlightId": "h1",
  "bookmarkId": "1",
  "text": "This is an updated highlight",
  "createdAt": "2023-10-27T14:00:00Z"
}
```

# lists.md

```md
# Hoarder API Lists Endpoints

This document describes the API endpoints for managing lists in the Hoarder API, located in the `code/v1/lists` directory.

## `/v1/lists`

### `GET /v1/lists`

Retrieves a list of all lists.

**Response:**

-   `status`: 200
-   `resp`: An array of list objects.

**Example:**

\`\`\`
GET /v1/lists
\`\`\`

\`\`\`json
[
  {
    "listId": "l1",
    "name": "My List",
    "createdAt": "2023-10-27T16:00:00Z"
  }
]
\`\`\`

### `POST /v1/lists`

Creates a new list.

**Request Body:**

Conforms to the `zNewBookmarkListSchema` schema.

**Response:**

-   `status`: 201
-   `resp`: The created list object.

**Example:**

\`\`\`
POST /v1/lists
\`\`\`

\`\`\`json
{
  "name": "My New List"
}
\`\`\`

\`\`\`json
{
  "listId": "l2",
  "name": "My New List",
  "createdAt": "2023-10-27T17:00:00Z"
}
\`\`\`

## `/v1/lists/[listId]`

### `GET /v1/lists/[listId]`

Retrieves a specific list by its ID.

**Parameters:**

-   `listId`: The ID of the list.

**Response:**

-   `status`: 200
-   `resp`: The list object.

**Example:**

\`\`\`
GET /v1/lists/l1
\`\`\`

\`\`\`json
{
  "listId": "l1",
  "name": "My List",
  "createdAt": "2023-10-27T16:00:00Z"
}
\`\`\`

### `PATCH /v1/lists/[listId]`

Updates a specific list.

**Parameters:**

-   `listId`: The ID of the list.

**Request Body:**

Conforms to the `zEditBookmarkListSchema` schema, excluding the `listId` field.

**Response:**

-   `status`: 200
-   `resp`: The updated list object.

**Example:**

\`\`\`
PATCH /v1/lists/l1
\`\`\`

\`\`\`json
{
  "name": "My Updated List"
}
\`\`\`

\`\`\`json
{
  "listId": "l1",
  "name": "My Updated List",
  "createdAt": "2023-10-27T16:00:00Z"
}
\`\`\`

### `DELETE /v1/lists/[listId]`

Deletes a specific list.

**Parameters:**

-   `listId`: The ID of the list.

**Response:**

-   `status`: 204

**Example:**

\`\`\`
DELETE /v1/lists/l1
\`\`\`

## `/v1/lists/[listId]/bookmarks`

### `GET /v1/lists/[listId]/bookmarks`

Retrieves the bookmarks that belong to a specific list.

**Parameters:**

-   `listId`: The ID of the list.
-   `limit` (optional): A number representing the maximum number of bookmarks to return.
-   `cursor` (optional): A string representing the cursor for pagination.

**Response:**

-   `status`: 200
-   `resp`: An object containing an array of bookmarks and a `nextCursor` for pagination.

**Example:**

\`\`\`
GET /v1/lists/l1/bookmarks?limit=10
\`\`\`

\`\`\`json
{
  "bookmarks": [
    {
      "bookmarkId": "1",
      "url": "https://example.com",
      "title": "Example Domain",
      "favourited": true,
      "archived": false,
      "createdAt": "2023-10-27T12:00:00Z"
    }
  ],
  "nextCursor": "2_2023-10-27T11:00:00Z"
}
\`\`\`

## `/v1/lists/[listId]/bookmarks/[bookmarkId]`

### `PUT /v1/lists/[listId]/bookmarks/[bookmarkId]`

Adds a specific bookmark to a specific list.

**Parameters:**

-   `listId`: The ID of the list.
-   `bookmarkId`: The ID of the bookmark.

**Response:**

-   `status`: 204

**Example:**

\`\`\`
PUT /v1/lists/l1/bookmarks/1
\`\`\`

### `DELETE /v1/lists/[listId]/bookmarks/[bookmarkId]`

Removes a specific bookmark from a specific list.

**Parameters:**

-   `listId`: The ID of the list.
-   `bookmarkId`: The ID of the bookmark.

**Response:**

-   `status`: 204

**Example:**

\`\`\`
DELETE /v1/lists/l1/bookmarks/1
```

# README.md

```md
# Hoarder API Documentation

## Overview

This document provides a comprehensive overview of the Hoarder API, its architecture, endpoints, and usage. The Hoarder API is designed to manage bookmarks, highlights, lists, and tags, providing functionalities for creating, retrieving, updating, and deleting these resources.

## Documentation

The following documentation files are available in the root directory:

-   `README.md`: Overview of the project and API documentation.
-   `utils.md`: Utility functions used across the API.
-   `bookmarks.md`: Detailed documentation for the `/v1/bookmarks` endpoints.
-   `highlights.md`: Detailed documentation for the `/v1/highlights` endpoints.
-   `lists.md`: Detailed documentation for the `/v1/lists` endpoints.
-   `tags.md`: Detailed documentation for the `/v1/tags` endpoints.
-   `assets.md`: Documentation for asset management.
-   `health.md`: Documentation for the health check endpoint.
-   `trpc.md`: Documentation for the tRPC setup.
-   `auth.md`: Documentation for the authentication setup.

## API Endpoints (v1)

### Bookmarks

-   `GET /v1/bookmarks`: Retrieve all bookmarks.
-   `POST /v1/bookmarks`: Create a new bookmark.
-   `GET /v1/bookmarks/:bookmarkId`: Retrieve a specific bookmark.
-   `PUT /v1/bookmarks/:bookmarkId`: Update a bookmark.
-   `DELETE /v1/bookmarks/:bookmarkId`: Delete a bookmark.
-   `GET /v1/bookmarks/:bookmarkId/assets`: Retrieve assets for a bookmark.
-   `POST /v1/bookmarks/:bookmarkId/assets`: Add an asset to a bookmark.
-   `GET /v1/bookmarks/:bookmarkId/assets/:assetId`: Retrieve a specific asset.
-   `DELETE /v1/bookmarks/:bookmarkId/assets/:assetId`: Delete an asset.
-   `GET /v1/bookmarks/:bookmarkId/highlights`: Retrieve highlights for a bookmark.
-   `POST /v1/bookmarks/:bookmarkId/highlights`: Add a highlight to a bookmark.
-   `GET /v1/bookmarks/:bookmarkId/lists`: Retrieve lists associated with a bookmark.
-   `POST /v1/bookmarks/:bookmarkId/lists`: Add a bookmark to a list.
-   `GET /v1/bookmarks/:bookmarkId/tags`: Retrieve tags for a bookmark.
-   `POST /v1/bookmarks/:bookmarkId/tags`: Add a tag to a bookmark.
-   `GET /v1/bookmarks/search`: Search bookmarks.
-   `POST /v1/bookmarks/singlefile`: Import bookmarks from SingleFile.

### Highlights

-   `GET /v1/highlights`: Retrieve all highlights.
-   `POST /v1/highlights`: Create a new highlight.
-   `GET /v1/highlights/:highlightId`: Retrieve a specific highlight.
-   `PUT /v1/highlights/:highlightId`: Update a highlight.
-   `DELETE /v1/highlights/:highlightId`: Delete a highlight.

### Lists

-   `GET /v1/lists`: Retrieve all lists.
-   `POST /v1/lists`: Create a new list.
-   `GET /v1/lists/:listId`: Retrieve a specific list.
-   `PUT /v1/lists/:listId`: Update a list.
-   `DELETE /v1/lists/:listId`: Delete a list.
-   `GET /v1/lists/:listId/bookmarks`: Retrieve bookmarks in a list.
-   `POST /v1/lists/:listId/bookmarks`: Add a bookmark to a list.
-   `DELETE /v1/lists/:listId/bookmarks/:bookmarkId`: Remove a bookmark from a list.

### Tags

-   `GET /v1/tags`: Retrieve all tags.
-   `POST /v1/tags`: Create a new tag.
-   `GET /v1/tags/:tagId`: Retrieve a specific tag.
-   `PUT /v1/tags/:tagId`: Update a tag.
-   `DELETE /v1/tags/:tagId`: Delete a tag.
-   `GET /v1/tags/:tagId/bookmarks`: Retrieve bookmarks associated with a tag.

## Further Development

This documentation is located in the root directory and will be continuously updated as the API evolves. Future updates will include more detailed information on each endpoint, request/response formats, error handling, and other relevant aspects of the Hoarder API.
```

# tags.md

```md
# Hoarder API Tags Endpoints

This document describes the API endpoints for managing tags in the Hoarder API, located in the `code/v1/tags` directory.

## `/v1/tags`

### `GET /v1/tags`

Retrieves a list of all tags.

**Response:**

-   `status`: 200
-   `resp`: An array of tag objects.

**Example:**

\`\`\`
GET /v1/tags
\`\`\`

\`\`\`json
[
  {
    "tagId": "t1",
    "name": "tag1",
    "createdAt": "2023-10-27T18:00:00Z"
  }
]
\`\`\`

## `/v1/tags/[tagId]`

### `GET /v1/tags/[tagId]`

Retrieves a specific tag by its ID.

**Parameters:**

-   `tagId`: The ID of the tag.

**Response:**

-   `status`: 200
-   `resp`: The tag object.

**Example:**

\`\`\`
GET /v1/tags/t1
\`\`\`

\`\`\`json
{
  "tagId": "t1",
  "name": "tag1",
  "createdAt": "2023-10-27T18:00:00Z"
}
\`\`\`

### `PATCH /v1/tags/[tagId]`

Updates a specific tag.

**Parameters:**

-   `tagId`: The ID of the tag.

**Request Body:**

Conforms to the `zUpdateTagRequestSchema` schema, excluding the `tagId` field.

**Response:**

-   `status`: 200
-   `resp`: The updated tag object.

**Example:**

\`\`\`
PATCH /v1/tags/t1
\`\`\`

\`\`\`json
{
  "name": "updatedTag1"
}
\`\`\`

\`\`\`json
{
  "tagId": "t1",
  "name": "updatedTag1",
  "createdAt": "2023-10-27T18:00:00Z"
}
\`\`\`

### `DELETE /v1/tags/[tagId]`

Deletes a specific tag.

**Parameters:**

-   `tagId`: The ID of the tag.

**Response:**

-   `status`: 204

**Example:**

\`\`\`
DELETE /v1/tags/t1
\`\`\`

## `/v1/tags/[tagId]/bookmarks`

### `GET /v1/tags/[tagId]/bookmarks`

Retrieves the bookmarks that are associated with a specific tag.

**Parameters:**

-   `tagId`: The ID of the tag.
-   `limit` (optional): A number representing the maximum number of bookmarks to return.
-   `cursor` (optional): A string representing the cursor for pagination.

**Response:**

-   `status`: 200
-   `resp`: An object containing an array of bookmarks and a `nextCursor` for pagination.

**Example:**

\`\`\`
GET /v1/tags/t1/bookmarks?limit=10
\`\`\`

\`\`\`json
{
  "bookmarks": [
    {
      "bookmarkId": "1",
      "url": "https://example.com",
      "title": "Example Domain",
      "favourited": true,
      "archived": false,
      "createdAt": "2023-10-27T12:00:00Z"
    }
  ],
  "nextCursor": "2_2023-10-27T11:00:00Z"
}
```

# trpc.md

```md
# Hoarder API tRPC Setup

This document describes the tRPC setup for the Hoarder API, located in the `code/trpc` directory.

## `/api/trpc/[trpc]/route.ts`

This file sets up the tRPC handler using `fetchRequestHandler` from `@trpc/server/adapters/fetch`.

### `handler(req: Request)`

Handles tRPC requests.

**Parameters:**

-   `req`: The incoming request object.

**Functionality:**

1. Sets the tRPC endpoint to `/api/trpc`.
2. Uses the `appRouter` as the tRPC router.
3. Logs errors to the console, including more detailed logging in development mode.
4. Creates the context for each request using `createContextFromRequest`.

**Exports:**

-   `GET`: The `handler` function, used to handle `GET` requests.
-   `POST`: The `handler` function, used to handle `POST` requests.

**Example:**

\`\`\`typescript
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@hoarder/trpc/routers/_app";
import { createContextFromRequest } from "@/server/api/client";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    onError: ({ path, error }) => {
      if (process.env.NODE_ENV === "development") {
        console.error(`❌ tRPC failed on ${path}`);
      }
      console.error(error);
    },
    createContext: async (opts) => {
      return await createContextFromRequest(opts.req);
    },
  });

export { handler as GET, handler as POST };
```

# utils.md

```md
# Hoarder API Utilities

This document describes the utility functions used in the Hoarder API, located in the `code/v1/utils` directory.

## `handler.ts`

This file provides a standardized way to handle API requests and responses, leveraging `zod` for schema validation and `trpc` for error handling.

### `trpcCodeToHttpCode(code: TRPCError["code"])`

Converts TRPC error codes to HTTP status codes.

**Parameters:**

-   `code`: A TRPC error code.

**Returns:**

-   An HTTP status code corresponding to the given TRPC error code.

### `formatZodError(error: ZodError)`

Formats `zod` validation errors into a human-readable string.

**Parameters:**

-   `error`: A `zod` error object.

**Returns:**

-   A string representation of the validation error.

### `interface TrpcAPIRequest<SearchParamsT, BodyType>`

Defines the structure of the input to the handler function.

**Properties:**

-   `ctx`: The request context.
-   `api`: The tRPC client.
-   `searchParams`: The parsed search parameters, validated against the provided schema.
-   `body`: The parsed request body, validated against the provided schema.

### `buildHandler<SearchParamsT extends z.ZodTypeAny | undefined, BodyT extends z.ZodTypeAny | undefined, InputT extends TrpcAPIRequest<SearchParamsT, BodyT>>({ req, handler, searchParamsSchema, bodySchema })`

A generic function that handles parsing the request, validating the input, calling the handler function, and formatting the response or error.

**Parameters:**

-   `req`: The Next.js API request object.
-   `handler`: The function that processes the request and returns a response.
-   `searchParamsSchema`: An optional `zod` schema to validate the search parameters.
-   `bodySchema`: An optional `zod` schema to validate the request body.

**Returns:**

-   A Next.js API response object.

## `pagination.ts`

This file defines a `zod` schema for pagination parameters and a function to adapt the `nextCursor` format.

### `zPagination`

A `zod` schema that validates `limit` and `cursor` parameters.

-   `limit`: A number representing the maximum number of items per page. It has a maximum value defined by `MAX_NUM_BOOKMARKS_PER_PAGE`.
-   `cursor`: A string representing the cursor for pagination. It must contain an underscore and is transformed into an object with `id` and `createdAt` properties.

### `adaptPagination<T extends { nextCursor: z.infer<typeof zCursorV2> | null }>(input: T)`

Adapts the `nextCursor` format from an object with `id` and `createdAt` to a string format by concatenating the `id` and the ISO string representation of `createdAt` with an underscore.

**Parameters:**

-   `input`: An object containing a `nextCursor` property.

**Returns:**

-   The input object with the `nextCursor` property adapted to the string format.

## `types.ts`

This file defines custom `zod` schemas for specific data types.

### `zStringBool`

A `zod` schema that validates a string to be either `"true"` or `"false"` and transforms it into a boolean value.
```

