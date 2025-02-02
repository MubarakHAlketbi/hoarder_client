# api_docs\assets\[assetId]\route.md

```md
# Individual Asset Endpoint

## Overview
This endpoint handles retrieval of individual assets, supporting both full downloads and partial content requests through range headers. It includes authentication checks and ensures users can only access their own assets.

## Technical Details

### Endpoint Information
- **URL**: `/api/assets/:assetId`
- **Method**: GET
- **Authentication**: Required
- **Dynamic**: Yes (force-dynamic enabled)
- **Supports**: Range requests for streaming

### Authentication & Authorization
- Requires authenticated user
- Users can only access their own assets
- Validates asset ownership through database query

### Response Formats

#### Full Download (200 OK)
\`\`\`typescript
Headers:
{
  "Content-Length": string,    // Total file size
  "Content-type": string      // MIME type of the asset
}
Body: Asset stream
\`\`\`

#### Partial Content (206 Partial Content)
\`\`\`typescript
Headers:
{
  "Content-Range": "bytes start-end/total",
  "Accept-Ranges": "bytes",
  "Content-Length": string,    // Size of the chunk
  "Content-type": string      // MIME type of the asset
}
Body: Asset stream (partial)
\`\`\`

#### Error Responses
- 401 Unauthorized
  \`\`\`json
  { "error": "Unauthorized" }
  \`\`\`
- 404 Not Found
  \`\`\`json
  { "error": "Asset not found" }
  \`\`\`

### Implementation
\`\`\`typescript
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { assetId: string } },
) {
  const ctx = await createContextFromRequest(request);
  if (!ctx.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check asset ownership
  const assetDb = await ctx.db.query.assets.findFirst({
    where: and(eq(assets.id, params.assetId), eq(assets.userId, ctx.user.id)),
  });

  if (!assetDb) {
    return Response.json({ error: "Asset not found" }, { status: 404 });
  }

  // Get asset metadata and size
  const [metadata, size] = await Promise.all([
    readAssetMetadata({
      userId: ctx.user.id,
      assetId: params.assetId,
    }),
    getAssetSize({
      userId: ctx.user.id,
      assetId: params.assetId,
    }),
  ]);

  // Handle range requests
  const range = request.headers.get("Range");
  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : size - 1;

    return new Response(
      createAssetReadStream({
        userId: ctx.user.id,
        assetId: params.assetId,
        start,
        end,
      }),
      {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${size}`,
          "Accept-Ranges": "bytes",
          "Content-Length": (end - start + 1).toString(),
          "Content-type": metadata.contentType,
        },
      },
    );
  }

  // Handle full downloads
  return new Response(
    createAssetReadStream({
      userId: ctx.user.id,
      assetId: params.assetId,
    }),
    {
      status: 200,
      headers: {
        "Content-Length": size.toString(),
        "Content-type": metadata.contentType,
      },
    },
  );
}
\`\`\`

## Usage Examples

### Full Download
\`\`\`bash
curl http://localhost:3000/api/assets/123 \
  -H "Authorization: Bearer YOUR_TOKEN"
\`\`\`

### Partial Content (Range Request)
\`\`\`bash
curl http://localhost:3000/api/assets/123 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Range: bytes=0-1023"  # First 1KB
\`\`\`

## Notes
- Supports streaming through range requests
- Uses database to validate asset ownership
- Reads metadata and size concurrently for efficiency
- Returns appropriate status codes for different scenarios
- Handles both full downloads and partial content requests
- Asset streams are created using createAssetReadStream utility
- Content-Type is determined from stored metadata
- Force-dynamic ensures fresh data on each request
```

# api_docs\assets\route.md

```md
# Assets Upload Endpoint

## Overview
This endpoint handles file uploads for the Hoarder API, allowing users to upload assets that can be associated with bookmarks. It includes validation for file types and sizes, and handles both database and file storage operations.

## Technical Details

### Endpoint Information
- **URL**: `/api/assets`
- **Method**: POST
- **Authentication**: Required
- **Content-Type**: multipart/form-data
- **Dynamic**: Yes (force-dynamic enabled)

### Configuration
\`\`\`typescript
const MAX_UPLOAD_SIZE_BYTES = serverConfig.maxAssetSizeMb * 1024 * 1024;
\`\`\`

### Request Format
Multipart form data with either:
- `file` field containing the file to upload
- `image` field containing the image to upload

### Response Format
#### Success (200 OK)
\`\`\`typescript
interface UploadResponse {
  assetId: string;      // Unique identifier for the uploaded asset
  contentType: string;  // MIME type of the uploaded file
  size: number;        // Size in bytes
  fileName: string;    // Original file name
}
\`\`\`

#### Error Responses
- 400 Bad Request
  \`\`\`json
  { "error": "Unsupported asset type" }
  // or
  { "error": "Bad request" }
  \`\`\`
- 401 Unauthorized
  \`\`\`json
  { "error": "Unauthorized" }
  \`\`\`
- 413 Payload Too Large
  \`\`\`json
  { "error": "Asset is too big" }
  \`\`\`
- 403 Forbidden (Demo Mode)
  \`\`\`json
  { "error": "Mutations are not allowed in demo mode" }
  \`\`\`

## Implementation Details

### Upload Process
1. Authentication check
2. Demo mode check
3. Form data extraction
4. File validation
   - Type checking against SUPPORTED_UPLOAD_ASSET_TYPES
   - Size checking against MAX_UPLOAD_SIZE_BYTES
5. Database entry creation
6. File storage
7. Response formatting

### Database Schema
\`\`\`typescript
{
  id: string;           // Generated asset ID
  assetType: string;    // Initially set to UNKNOWN
  bookmarkId: null;     // Initially null until associated
  userId: string;       // Owner of the asset
  contentType: string;  // MIME type
  size: number;        // File size in bytes
  fileName: string;    // Original file name
}
\`\`\`

### Implementation
\`\`\`typescript
export async function uploadFromPostData(
  user: AuthedContext["user"],
  db: AuthedContext["db"],
  formData: FormData,
): Promise<
  | { error: string; status: number }
  | {
      assetId: string;
      contentType: string;
      fileName: string;
      size: number;
    }
> {
  const data = formData.get("file") ?? formData.get("image");
  // ... validation and processing
  // ... database and storage operations
  return {
    assetId: assetDb.id,
    contentType,
    size: buffer.byteLength,
    fileName,
  };
}

export async function POST(request: Request) {
  const ctx = await createContextFromRequest(request);
  // ... authentication and demo mode checks
  const formData = await request.formData();
  const resp = await uploadFromPostData(ctx.user, ctx.db, formData);
  // ... response handling
}
\`\`\`

## Usage Example

\`\`\`bash
curl -X POST http://localhost:3000/api/assets \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/file.pdf"
\`\`\`

## Notes
- Assets are initially uploaded with type UNKNOWN
- Assets are not immediately associated with bookmarks
- File size limit is configured in serverConfig.maxAssetSizeMb
- Only supported file types can be uploaded
- Demo mode prevents any uploads
- Files are stored using the saveAsset utility
- Database entry is created before file storage
- Supports both 'file' and 'image' form field names
- Response type is validated against ZUploadResponse
```

# api_docs\health\route.md

```md
# Health Check Endpoint

## Overview
This endpoint provides a simple health check mechanism to verify if the API is operational. It's a lightweight endpoint that returns a basic status response indicating the web application is functioning correctly.

## Technical Details

### Endpoint Information
- **URL**: `/api/health`
- **Method**: GET
- **Authentication**: Not required

### Implementation
\`\`\`typescript
import { NextRequest, NextResponse } from "next/server";

export const GET = async (_req: NextRequest) => {
  return NextResponse.json({
    status: "ok",
    message: "Web app is working",
  });
};
\`\`\`

### Code Breakdown
- Uses Next.js server components with `NextRequest` and `NextResponse`
- Implements a GET handler that returns a JSON response
- The underscore prefix in `_req` indicates the request parameter is not used
- Returns a simple JSON object with status and message

### Response Format
\`\`\`json
{
  "status": "ok",
  "message": "Web app is working"
}
\`\`\`

## Usage Example
\`\`\`bash
curl http://localhost:3000/api/health
\`\`\`

## Notes
- This endpoint is useful for:
  - Load balancer health checks
  - Monitoring systems
  - Verifying API availability
- Returns HTTP 200 status code when successful
```

# api_docs\v1\bookmarks\[bookmarkId]\assets\[assetId]\route.md

```md
# Individual Bookmark Asset Endpoint

## Overview
This endpoint manages operations on individual assets associated with a bookmark, providing functionality to replace existing assets and remove asset associations.

## Technical Details

### Endpoint Information
- **URL**: `/api/v1/bookmarks/:bookmarkId/assets/:assetId`
- **Methods**: PUT, DELETE
- **Authentication**: Required
- **Dynamic**: Yes (force-dynamic enabled)

## Operations

### 1. Replace Asset (PUT)
Replaces an existing asset with a new one while maintaining the bookmark association.

#### Parameters
- `bookmarkId` (path parameter): The unique identifier of the bookmark
- `assetId` (path parameter): The current asset's unique identifier

#### Request Body Schema
\`\`\`typescript
{
  assetId: string  // ID of the new asset to replace with
}
\`\`\`

#### Response
- **Status**: 204 No Content
- **Body**: Empty

### 2. Detach Asset (DELETE)
Removes the association between an asset and a bookmark.

#### Parameters
- `bookmarkId` (path parameter): The unique identifier of the bookmark
- `assetId` (path parameter): The asset's unique identifier to detach

#### Response
- **Status**: 204 No Content
- **Body**: Empty

### Implementation
\`\`\`typescript
import { NextRequest } from "next/server";
import { buildHandler } from "@/app/api/v1/utils/handler";
import { z } from "zod";

export const dynamic = "force-dynamic";

export const PUT = (
  req: NextRequest,
  params: { params: { bookmarkId: string; assetId: string } },
) =>
  buildHandler({
    req,
    bodySchema: z.object({ assetId: z.string() }),
    handler: async ({ api, body }) => {
      await api.bookmarks.replaceAsset({
        bookmarkId: params.params.bookmarkId,
        oldAssetId: params.params.assetId,
        newAssetId: body!.assetId,
      });
      return { status: 204 };
    },
  });

export const DELETE = (
  req: NextRequest,
  params: { params: { bookmarkId: string; assetId: string } },
) =>
  buildHandler({
    req,
    handler: async ({ api }) => {
      await api.bookmarks.detachAsset({
        bookmarkId: params.params.bookmarkId,
        assetId: params.params.assetId,
      });
      return { status: 204 };
    },
  });
\`\`\`

## Usage Examples

### Replace Asset
\`\`\`bash
curl -X PUT http://localhost:3000/api/v1/bookmarks/123/assets/456 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "assetId": "789"
  }'
\`\`\`

### Detach Asset
\`\`\`bash
curl -X DELETE http://localhost:3000/api/v1/bookmarks/123/assets/456 \
  -H "Authorization: Bearer YOUR_TOKEN"
\`\`\`

## Notes
- Uses the common buildHandler utility for consistent error handling
- Both operations return 204 No Content on success
- Asset replacement requires the new asset to exist
- Asset detachment only removes the association, doesn't delete the asset
- Force-dynamic ensures fresh data on each request
- Request body validation uses Zod schema
- Path parameters are used to identify both bookmark and asset
```

# api_docs\v1\bookmarks\[bookmarkId]\assets\route.md

```md
# Bookmark Assets Endpoint

## Overview
This endpoint manages the relationship between bookmarks and their associated assets, providing functionality to list existing assets and attach new assets to a bookmark.

## Technical Details

### Endpoint Information
- **URL**: `/api/v1/bookmarks/:bookmarkId/assets`
- **Methods**: GET, POST
- **Authentication**: Required
- **Dynamic**: Yes (force-dynamic enabled)

## Operations

### 1. List Bookmark Assets (GET)
Retrieves all assets associated with a specific bookmark.

#### Parameters
- `bookmarkId` (path parameter): The unique identifier of the bookmark

#### Response
- **Status**: 200 OK
- **Body**:
\`\`\`typescript
{
  assets: {
    // Array of assets associated with the bookmark
    id: string;
    // Other asset properties
  }[]
}
\`\`\`

### 2. Attach Asset (POST)
Attaches an existing asset to a bookmark.

#### Parameters
- `bookmarkId` (path parameter): The unique identifier of the bookmark

#### Request Body
Uses `zAssetSchema` from `@hoarder/shared/types/bookmarks` for validation.
\`\`\`typescript
{
  // Asset properties as defined in zAssetSchema
}
\`\`\`

#### Response
- **Status**: 201 Created
- **Body**: The attached asset object

### Implementation
\`\`\`typescript
import { NextRequest } from "next/server";
import { buildHandler } from "@/app/api/v1/utils/handler";
import { zAssetSchema } from "@hoarder/shared/types/bookmarks";

export const dynamic = "force-dynamic";

export const GET = (
  req: NextRequest,
  params: { params: { bookmarkId: string } },
) =>
  buildHandler({
    req,
    handler: async ({ api }) => {
      const resp = await api.bookmarks.getBookmark({
        bookmarkId: params.params.bookmarkId,
      });
      return { status: 200, resp: { assets: resp.assets } };
    },
  });

export const POST = (
  req: NextRequest,
  params: { params: { bookmarkId: string } },
) =>
  buildHandler({
    req,
    bodySchema: zAssetSchema,
    handler: async ({ api, body }) => {
      const asset = await api.bookmarks.attachAsset({
        bookmarkId: params.params.bookmarkId,
        asset: body!,
      });
      return { status: 201, resp: asset };
    },
  });
\`\`\`

## Usage Examples

### List Bookmark Assets
\`\`\`bash
curl http://localhost:3000/api/v1/bookmarks/123/assets \
  -H "Authorization: Bearer YOUR_TOKEN"
\`\`\`

### Attach Asset to Bookmark
\`\`\`bash
curl -X POST http://localhost:3000/api/v1/bookmarks/123/assets \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    // Asset properties according to zAssetSchema
  }'
\`\`\`

## Notes
- Uses the common buildHandler utility for consistent error handling
- Validates asset attachment using zAssetSchema
- Returns 201 status for successful asset attachment
- Force-dynamic ensures fresh data on each request
- Asset must exist before it can be attached to a bookmark
- Integrates with both bookmark and asset management systems
- Provides a way to organize assets within the context of bookmarks
```

# api_docs\v1\bookmarks\[bookmarkId]\route.md

```md
# Individual Bookmark Operations

## Overview
This endpoint handles operations on individual bookmarks, providing functionality to retrieve, update, and delete specific bookmarks by their ID.

## Technical Details

### Endpoint Information
- **URL**: `/api/v1/bookmarks/:bookmarkId`
- **Methods**: GET, PATCH, DELETE
- **Authentication**: Required
- **Dynamic**: Yes (force-dynamic enabled)

## Operations

### 1. Get Bookmark (GET)
Retrieves a specific bookmark by its ID.

#### Parameters
- `bookmarkId` (path parameter): The unique identifier of the bookmark

#### Response
- **Status**: 200 OK
- **Body**: Bookmark object
\`\`\`typescript
{
  // Bookmark details
  id: string;
  // Other bookmark properties
}
\`\`\`

### 2. Update Bookmark (PATCH)
Updates an existing bookmark with new data.

#### Parameters
- `bookmarkId` (path parameter): The unique identifier of the bookmark

#### Request Body
Uses `zUpdateBookmarksRequestSchema` from `@hoarder/shared/types/bookmarks` with `bookmarkId` omitted.

\`\`\`typescript
{
  // Optional bookmark update fields
  title?: string;
  url?: string;
  // Other updateable properties
}
\`\`\`

#### Response
- **Status**: 200 OK
- **Body**: Updated bookmark object

### 3. Delete Bookmark (DELETE)
Permanently removes a bookmark.

#### Parameters
- `bookmarkId` (path parameter): The unique identifier of the bookmark

#### Response
- **Status**: 204 No Content
- **Body**: Empty

### Implementation
\`\`\`typescript
import { NextRequest } from "next/server";
import { buildHandler } from "@/app/api/v1/utils/handler";
import { zUpdateBookmarksRequestSchema } from "@hoarder/shared/types/bookmarks";

export const dynamic = "force-dynamic";

export const GET = (
  req: NextRequest,
  { params }: { params: { bookmarkId: string } },
) =>
  buildHandler({
    req,
    handler: async ({ api }) => {
      const bookmark = await api.bookmarks.getBookmark({
        bookmarkId: params.bookmarkId,
      });
      return { status: 200, resp: bookmark };
    },
  });

export const PATCH = (
  req: NextRequest,
  { params }: { params: { bookmarkId: string } },
) =>
  buildHandler({
    req,
    bodySchema: zUpdateBookmarksRequestSchema.omit({ bookmarkId: true }),
    handler: async ({ api, body }) => {
      const bookmark = await api.bookmarks.updateBookmark({
        bookmarkId: params.bookmarkId,
        ...body!,
      });
      return { status: 200, resp: bookmark };
    },
  });

export const DELETE = (
  req: NextRequest,
  { params }: { params: { bookmarkId: string } },
) =>
  buildHandler({
    req,
    handler: async ({ api }) => {
      await api.bookmarks.deleteBookmark({
        bookmarkId: params.bookmarkId,
      });
      return { status: 204 };
    },
  });
\`\`\`

## Usage Examples

### Get Bookmark
\`\`\`bash
curl http://localhost:3000/api/v1/bookmarks/123
\`\`\`

### Update Bookmark
\`\`\`bash
curl -X PATCH http://localhost:3000/api/v1/bookmarks/123 \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title",
    "url": "https://updated-url.com"
  }'
\`\`\`

### Delete Bookmark
\`\`\`bash
curl -X DELETE http://localhost:3000/api/v1/bookmarks/123
\`\`\`

## Notes
- All operations require authentication
- Uses standard HTTP status codes (200, 204)
- Update operation validates request body using shared schema
- Delete operation is permanent and cannot be undone
- Force dynamic ensures fresh data on each request
- Uses the common `buildHandler` utility for consistent error handling
```

# api_docs\v1\bookmarks\route.md

```md
# Bookmarks Endpoint

## Overview
This endpoint handles the core bookmark operations in the Hoarder API, allowing users to retrieve and create bookmarks. It supports pagination and filtering options for bookmark retrieval.

## Technical Details

### Endpoint Information
- **URL**: `/api/v1/bookmarks`
- **Methods**: GET, POST
- **Authentication**: Required

### GET Request
Retrieves a paginated list of bookmarks with optional filters.

#### Query Parameters
- `favourited` (optional): Boolean as string to filter favourited bookmarks
- `archived` (optional): Boolean as string to filter archived bookmarks
- Pagination parameters:
  - `page`: Current page number
  - `limit`: Number of items per page

#### Response Format
\`\`\`typescript
{
  items: Bookmark[];
  meta: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
  }
}
\`\`\`

### POST Request
Creates a new bookmark.

#### Request Body Schema
Uses `zNewBookmarkRequestSchema` from `@hoarder/shared/types/bookmarks` which defines the required fields for creating a new bookmark.

#### Response
- Status: 201 Created
- Body: The created bookmark object

### Implementation
\`\`\`typescript
import { NextRequest } from "next/server";
import { z } from "zod";
import { zNewBookmarkRequestSchema } from "@hoarder/shared/types/bookmarks";
import { buildHandler } from "../utils/handler";
import { adaptPagination, zPagination } from "../utils/pagination";
import { zStringBool } from "../utils/types";

export const dynamic = "force-dynamic";

export const GET = (req: NextRequest) =>
  buildHandler({
    req,
    searchParamsSchema: z
      .object({
        favourited: zStringBool.optional(),
        archived: zStringBool.optional(),
      })
      .and(zPagination),
    handler: async ({ api, searchParams }) => {
      const bookmarks = await api.bookmarks.getBookmarks({
        ...searchParams,
      });
      return { status: 200, resp: adaptPagination(bookmarks) };
    },
  });

export const POST = (req: NextRequest) =>
  buildHandler({
    req,
    bodySchema: zNewBookmarkRequestSchema,
    handler: async ({ api, body }) => {
      const bookmark = await api.bookmarks.createBookmark(body!);
      return { status: 201, resp: bookmark };
    },
  });
\`\`\`

### Code Breakdown
- Uses Next.js server components with route handlers
- Implements request validation using Zod schemas
- Uses `buildHandler` utility for consistent error handling and response formatting
- Supports dynamic content with `force-dynamic` export
- Implements pagination through `adaptPagination` utility
- Handles both query parameters and request body validation

## Usage Examples

### Fetch Bookmarks
\`\`\`bash
# Get first page of bookmarks
curl http://localhost:3000/api/v1/bookmarks?page=1&limit=10

# Get favourited bookmarks
curl http://localhost:3000/api/v1/bookmarks?favourited=true&page=1&limit=10
\`\`\`

### Create Bookmark
\`\`\`bash
curl -X POST http://localhost:3000/api/v1/bookmarks \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "title": "Example Website"
  }'
\`\`\`

## Notes
- The endpoint uses the `buildHandler` utility for consistent error handling and response formatting
- Pagination is handled automatically through the `zPagination` schema and `adaptPagination` utility
- All requests are validated using Zod schemas before processing
- The endpoint is marked as dynamic to ensure fresh data on each request
```

# api_docs\v1\bookmarks\search\route.md

```md
# Bookmark Search Endpoint

## Overview
This endpoint provides search functionality for bookmarks, implementing cursor-based pagination for efficient result retrieval. It allows users to search through their bookmarks using a text query.

## Technical Details

### Endpoint Information
- **URL**: `/api/v1/bookmarks/search`
- **Method**: GET
- **Authentication**: Required

### Query Parameters
- `q` (required): Search query string
- `limit` (optional): Number of results to return per page
- `cursor` (optional): Pagination cursor for fetching next set of results
  - Version 1 cursor format: Simple numeric offset
  - Transformed internally to `{ ver: 1, offset: number }`

### Response Format
\`\`\`typescript
{
  bookmarks: Bookmark[];
  nextCursor: string | null;
}
\`\`\`

### Implementation
\`\`\`typescript
import { NextRequest } from "next/server";
import { z } from "zod";
import { buildHandler } from "../../utils/handler";

export const dynamic = "force-dynamic";

export const GET = (req: NextRequest) =>
  buildHandler({
    req,
    searchParamsSchema: z.object({
      q: z.string(),
      limit: z.coerce.number().optional(),
      cursor: z
        .string()
        .pipe(z.coerce.number())
        .transform((val) => {
          return { ver: 1 as const, offset: val };
        })
        .optional(),
    }),
    handler: async ({ api, searchParams }) => {
      const bookmarks = await api.bookmarks.searchBookmarks({
        text: searchParams.q,
        cursor: searchParams.cursor,
        limit: searchParams.limit,
      });
      return {
        status: 200,
        resp: {
          bookmarks: bookmarks.bookmarks,
          nextCursor: bookmarks.nextCursor
            ? `${bookmarks.nextCursor.offset}`
            : null,
        },
      };
    },
  });
\`\`\`

### Code Breakdown
- Uses Next.js server components with route handlers
- Implements request validation using Zod schemas
- Uses cursor-based pagination for efficient result fetching
- Transforms string cursor to internal format with version control
- Returns null nextCursor when no more results are available

## Usage Examples

### Basic Search
\`\`\`bash
# Search for bookmarks containing "javascript"
curl "http://localhost:3000/api/v1/bookmarks/search?q=javascript&limit=10"
\`\`\`

### Paginated Search
\`\`\`bash
# First page
curl "http://localhost:3000/api/v1/bookmarks/search?q=javascript&limit=10"

# Next page (using cursor from previous response)
curl "http://localhost:3000/api/v1/bookmarks/search?q=javascript&limit=10&cursor=10"
\`\`\`

## Notes
- The endpoint uses cursor-based pagination instead of offset-based for better performance
- Search results are always fresh due to `force-dynamic` export
- The cursor implementation is versioned (V1) to allow for future pagination improvements
- The cursor is transformed from a simple string to a structured object internally
- Response includes null nextCursor when there are no more results to fetch
```

# api_docs\v1\lists\[listId]\bookmarks\[bookmarkId]\route.md

```md
# List Bookmark Management Endpoint

## Overview
This endpoint manages the relationship between individual bookmarks and lists, providing functionality to add and remove bookmarks from specific lists.

## Technical Details

### Endpoint Information
- **URL**: `/api/v1/lists/:listId/bookmarks/:bookmarkId`
- **Methods**: PUT, DELETE
- **Authentication**: Required
- **Dynamic**: Yes (force-dynamic enabled)

## Operations

### 1. Add Bookmark to List (PUT)
Adds a specific bookmark to a list.

#### Known Limitation
Currently, the endpoint is not fully idempotent as required by PUT semantics. It will fail if the bookmark is already in the list. This behavior is planned to be fixed in a future update.

#### Parameters
- `listId` (path parameter): The unique identifier of the list
- `bookmarkId` (path parameter): The unique identifier of the bookmark to add

#### Response
- **Status**: 204 No Content
- **Body**: Empty

### 2. Remove Bookmark from List (DELETE)
Removes a specific bookmark from a list.

#### Parameters
- `listId` (path parameter): The unique identifier of the list
- `bookmarkId` (path parameter): The unique identifier of the bookmark to remove

#### Response
- **Status**: 204 No Content
- **Body**: Empty

### Implementation
\`\`\`typescript
import { NextRequest } from "next/server";
import { buildHandler } from "@/app/api/v1/utils/handler";

export const dynamic = "force-dynamic";

export const PUT = (
  req: NextRequest,
  { params }: { params: { listId: string; bookmarkId: string } },
) =>
  buildHandler({
    req,
    handler: async ({ api }) => {
      await api.lists.addToList({
        listId: params.listId,
        bookmarkId: params.bookmarkId,
      });
      return { status: 204 };
    },
  });

export const DELETE = (
  req: NextRequest,
  { params }: { params: { listId: string; bookmarkId: string } },
) =>
  buildHandler({
    req,
    handler: async ({ api }) => {
      await api.lists.removeFromList({
        listId: params.listId,
        bookmarkId: params.bookmarkId,
      });
      return { status: 204 };
    },
  });
\`\`\`

## Usage Examples

### Add Bookmark to List
\`\`\`bash
curl -X PUT http://localhost:3000/api/v1/lists/123/bookmarks/456 \
  -H "Authorization: Bearer YOUR_TOKEN"
\`\`\`

### Remove Bookmark from List
\`\`\`bash
curl -X DELETE http://localhost:3000/api/v1/lists/123/bookmarks/456 \
  -H "Authorization: Bearer YOUR_TOKEN"
\`\`\`

## Notes
- Uses the common buildHandler utility for consistent error handling
- Both operations return 204 No Content on success
- No request body required for either operation
- Force-dynamic ensures fresh data on each request
- Known issue with PUT idempotency to be addressed in future update
- Operations are atomic - they either completely succeed or fail
- No validation of bookmark existence before attempting operations
```

# api_docs\v1\lists\[listId]\bookmarks\route.md

```md
# List Bookmarks Endpoint

## Overview
This endpoint retrieves bookmarks associated with a specific list, implementing pagination for efficient data retrieval.

## Technical Details

### Endpoint Information
- **URL**: `/api/v1/lists/:listId/bookmarks`
- **Method**: GET
- **Authentication**: Required
- **Dynamic**: Yes (force-dynamic enabled)

### Query Parameters
Uses `zPagination` schema for pagination parameters:
- `limit` (optional): Number of items per page
- `cursor` (optional): Cursor for pagination

## Operation

### Get List Bookmarks (GET)
Retrieves a paginated list of bookmarks associated with a specific list.

#### Parameters
- `listId` (path parameter): The unique identifier of the list
- Pagination parameters in query string

#### Response
- **Status**: 200 OK
- **Body**: Paginated bookmarks response
\`\`\`typescript
{
  items: {
    id: string;
    // Other bookmark properties
  }[];
  meta: {
    nextCursor: string | null;
    // Other pagination metadata
  };
}
\`\`\`

### Implementation
\`\`\`typescript
import { NextRequest } from "next/server";
import { buildHandler } from "@/app/api/v1/utils/handler";
import { adaptPagination, zPagination } from "@/app/api/v1/utils/pagination";

export const dynamic = "force-dynamic";

export const GET = (req: NextRequest, params: { params: { listId: string } }) =>
  buildHandler({
    req,
    searchParamsSchema: zPagination,
    handler: async ({ api, searchParams }) => {
      const bookmarks = await api.bookmarks.getBookmarks({
        listId: params.params.listId,
        ...searchParams,
      });
      return { status: 200, resp: adaptPagination(bookmarks) };
    },
  });
\`\`\`

## Usage Examples

### Get List Bookmarks (First Page)
\`\`\`bash
curl "http://localhost:3000/api/v1/lists/123/bookmarks?limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
\`\`\`

### Get List Bookmarks (With Cursor)
\`\`\`bash
curl "http://localhost:3000/api/v1/lists/123/bookmarks?limit=10&cursor=next_page_cursor" \
  -H "Authorization: Bearer YOUR_TOKEN"
\`\`\`

## Notes
- Uses the common buildHandler utility for consistent error handling
- Implements cursor-based pagination through zPagination schema
- Adapts response format using adaptPagination utility
- Force-dynamic ensures fresh data on each request
- Bookmarks are filtered by list ID
- Response includes pagination metadata for navigating through results
- Cursor format follows the standard pagination implementation
```

# api_docs\v1\lists\[listId]\route.md

```md
# Individual List Endpoint

## Overview
This endpoint manages operations on individual bookmark lists, providing functionality to retrieve, update, and delete specific lists by their ID.

## Technical Details

### Endpoint Information
- **URL**: `/api/v1/lists/:listId`
- **Methods**: GET, PATCH, DELETE
- **Authentication**: Required
- **Dynamic**: Yes (force-dynamic enabled)

## Operations

### 1. Get List (GET)
Retrieves a specific list by its ID.

#### Parameters
- `listId` (path parameter): The unique identifier of the list

#### Response
- **Status**: 200 OK
- **Body**: List object
\`\`\`typescript
{
  id: string;
  // Other list properties
}
\`\`\`

### 2. Update List (PATCH)
Updates an existing list with new data.

#### Parameters
- `listId` (path parameter): The unique identifier of the list

#### Request Body
Uses `zEditBookmarkListSchema` from `@hoarder/shared/types/lists` with `listId` omitted.
\`\`\`typescript
{
  // Optional list update fields
  name?: string;
  // Other updateable properties
}
\`\`\`

#### Response
- **Status**: 200 OK
- **Body**: Updated list object

### 3. Delete List (DELETE)
Permanently removes a list.

#### Parameters
- `listId` (path parameter): The unique identifier of the list

#### Response
- **Status**: 204 No Content
- **Body**: Empty

### Implementation
\`\`\`typescript
import { NextRequest } from "next/server";
import { buildHandler } from "@/app/api/v1/utils/handler";
import { zEditBookmarkListSchema } from "@hoarder/shared/types/lists";

export const dynamic = "force-dynamic";

export const GET = (
  req: NextRequest,
  { params }: { params: { listId: string } },
) =>
  buildHandler({
    req,
    handler: async ({ api }) => {
      const list = await api.lists.get({
        listId: params.listId,
      });
      return {
        status: 200,
        resp: list,
      };
    },
  });

export const PATCH = (
  req: NextRequest,
  { params }: { params: { listId: string } },
) =>
  buildHandler({
    req,
    bodySchema: zEditBookmarkListSchema.omit({ listId: true }),
    handler: async ({ api, body }) => {
      const list = await api.lists.edit({
        ...body!,
        listId: params.listId,
      });
      return { status: 200, resp: list };
    },
  });

export const DELETE = (
  req: NextRequest,
  { params }: { params: { listId: string } },
) =>
  buildHandler({
    req,
    handler: async ({ api }) => {
      await api.lists.delete({
        listId: params.listId,
      });
      return {
        status: 204,
      };
    },
  });
\`\`\`

## Usage Examples

### Get List
\`\`\`bash
curl http://localhost:3000/api/v1/lists/123 \
  -H "Authorization: Bearer YOUR_TOKEN"
\`\`\`

### Update List
\`\`\`bash
curl -X PATCH http://localhost:3000/api/v1/lists/123 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated List Name"
  }'
\`\`\`

### Delete List
\`\`\`bash
curl -X DELETE http://localhost:3000/api/v1/lists/123 \
  -H "Authorization: Bearer YOUR_TOKEN"
\`\`\`

## Notes
- Uses the common buildHandler utility for consistent error handling
- Validates list updates using shared schema
- Returns appropriate status codes (200, 204) for different operations
- Force-dynamic ensures fresh data on each request
- List operations are user-specific through authentication
- Delete operation is permanent and cannot be undone
- Update operation allows partial updates through PATCH method
```

# api_docs\v1\lists\route.md

```md
# Lists Endpoint

## Overview
This endpoint manages bookmark lists, providing functionality to retrieve all lists and create new ones. Lists allow users to organize their bookmarks into collections.

## Technical Details

### Endpoint Information
- **URL**: `/api/v1/lists`
- **Methods**: GET, POST
- **Authentication**: Required
- **Dynamic**: Yes (force-dynamic enabled)

## Operations

### 1. List All Lists (GET)
Retrieves all bookmark lists for the authenticated user.

#### Response
- **Status**: 200 OK
- **Body**: Array of list objects
\`\`\`typescript
{
  // Array of bookmark lists
  lists: {
    id: string;
    // Other list properties
  }[]
}
\`\`\`

### 2. Create List (POST)
Creates a new bookmark list.

#### Request Body
Uses `zNewBookmarkListSchema` from `@hoarder/shared/types/lists` for validation.
\`\`\`typescript
{
  // List properties as defined in zNewBookmarkListSchema
  name: string;
  // Other required properties
}
\`\`\`

#### Response
- **Status**: 201 Created
- **Body**: The created list object

### Implementation
\`\`\`typescript
import { NextRequest } from "next/server";
import { zNewBookmarkListSchema } from "@hoarder/shared/types/lists";
import { buildHandler } from "../utils/handler";

export const dynamic = "force-dynamic";

export const GET = (req: NextRequest) =>
  buildHandler({
    req,
    handler: async ({ api }) => {
      const lists = await api.lists.list();
      return { status: 200, resp: lists };
    },
  });

export const POST = (req: NextRequest) =>
  buildHandler({
    req,
    bodySchema: zNewBookmarkListSchema,
    handler: async ({ api, body }) => {
      const list = await api.lists.create(body!);
      return { status: 201, resp: list };
    },
  });
\`\`\`

## Usage Examples

### Get All Lists
\`\`\`bash
curl http://localhost:3000/api/v1/lists \
  -H "Authorization: Bearer YOUR_TOKEN"
\`\`\`

### Create New List
\`\`\`bash
curl -X POST http://localhost:3000/api/v1/lists \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Reading List",
    // Other required properties according to zNewBookmarkListSchema
  }'
\`\`\`

## Notes
- Uses the common buildHandler utility for consistent error handling
- Validates new list creation using shared schema
- Returns 201 status for successful list creation
- Force-dynamic ensures fresh data on each request
- Lists are user-specific through authentication
- No pagination implemented for list retrieval
- List creation requires all fields specified in zNewBookmarkListSchema
```

# api_docs\v1\tags\[tagId]\bookmarks\route.md

```md
# Tag Bookmarks Endpoint

## Overview
This endpoint retrieves bookmarks associated with a specific tag, implementing pagination for efficient data retrieval.

## Technical Details

### Endpoint Information
- **URL**: `/api/v1/tags/:tagId/bookmarks`
- **Method**: GET
- **Authentication**: Required
- **Dynamic**: Yes (force-dynamic enabled)

### Query Parameters
Uses `zPagination` schema for pagination parameters:
- `limit` (optional): Number of items per page
- `cursor` (optional): Cursor for pagination

## Operation

### Get Tagged Bookmarks (GET)
Retrieves a paginated list of bookmarks associated with a specific tag.

#### Parameters
- `tagId` (path parameter): The unique identifier of the tag
- Pagination parameters in query string

#### Response
- **Status**: 200 OK
- **Body**: Paginated bookmarks response
\`\`\`typescript
{
  items: {
    id: string;
    // Other bookmark properties
  }[];
  meta: {
    nextCursor: string | null;
    // Other pagination metadata
  };
}
\`\`\`

### Implementation
\`\`\`typescript
import { NextRequest } from "next/server";
import { buildHandler } from "@/app/api/v1/utils/handler";
import { adaptPagination, zPagination } from "@/app/api/v1/utils/pagination";

export const dynamic = "force-dynamic";

export const GET = (
  req: NextRequest,
  { params }: { params: { tagId: string } },
) =>
  buildHandler({
    req,
    searchParamsSchema: zPagination,
    handler: async ({ api, searchParams }) => {
      const bookmarks = await api.bookmarks.getBookmarks({
        tagId: params.tagId,
        limit: searchParams.limit,
        cursor: searchParams.cursor,
      });
      return {
        status: 200,
        resp: adaptPagination(bookmarks),
      };
    },
  });
\`\`\`

## Usage Examples

### Get Tagged Bookmarks (First Page)
\`\`\`bash
curl "http://localhost:3000/api/v1/tags/123/bookmarks?limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
\`\`\`

### Get Tagged Bookmarks (With Cursor)
\`\`\`bash
curl "http://localhost:3000/api/v1/tags/123/bookmarks?limit=10&cursor=next_page_cursor" \
  -H "Authorization: Bearer YOUR_TOKEN"
\`\`\`

## Notes
- Uses the common buildHandler utility for consistent error handling
- Implements cursor-based pagination through zPagination schema
- Adapts response format using adaptPagination utility
- Force-dynamic ensures fresh data on each request
- Bookmarks are filtered by tag ID
- Response includes pagination metadata for navigating through results
- Cursor format follows the standard pagination implementation
- Useful for retrieving all bookmarks with a specific tag
- Can be used to build tag-based navigation or filtering
```

# api_docs\v1\tags\[tagId]\route.md

```md
# Individual Tag Endpoint

## Overview
This endpoint manages operations on individual tags, providing functionality to retrieve, update, and delete specific tags by their ID.

## Technical Details

### Endpoint Information
- **URL**: `/api/v1/tags/:tagId`
- **Methods**: GET, PATCH, DELETE
- **Authentication**: Required
- **Dynamic**: Yes (force-dynamic enabled)

## Operations

### 1. Get Tag (GET)
Retrieves a specific tag by its ID.

#### Parameters
- `tagId` (path parameter): The unique identifier of the tag

#### Response
- **Status**: 200 OK
- **Body**: Tag object
\`\`\`typescript
{
  id: string;
  name: string;
  // Other tag properties
}
\`\`\`

### 2. Update Tag (PATCH)
Updates an existing tag with new data.

#### Parameters
- `tagId` (path parameter): The unique identifier of the tag

#### Request Body
Uses `zUpdateTagRequestSchema` from `@hoarder/shared/types/tags` with `tagId` omitted.
\`\`\`typescript
{
  // Optional tag update fields
  name?: string;
  // Other updateable properties
}
\`\`\`

#### Response
- **Status**: 200 OK
- **Body**: Updated tag object

### 3. Delete Tag (DELETE)
Permanently removes a tag.

#### Parameters
- `tagId` (path parameter): The unique identifier of the tag

#### Response
- **Status**: 204 No Content
- **Body**: Empty

### Implementation
\`\`\`typescript
import { NextRequest } from "next/server";
import { buildHandler } from "@/app/api/v1/utils/handler";
import { zUpdateTagRequestSchema } from "@hoarder/shared/types/tags";

export const dynamic = "force-dynamic";

export const GET = (
  req: NextRequest,
  { params }: { params: { tagId: string } },
) =>
  buildHandler({
    req,
    handler: async ({ api }) => {
      const tag = await api.tags.get({
        tagId: params.tagId,
      });
      return {
        status: 200,
        resp: tag,
      };
    },
  });

export const PATCH = (
  req: NextRequest,
  { params }: { params: { tagId: string } },
) =>
  buildHandler({
    req,
    bodySchema: zUpdateTagRequestSchema.omit({ tagId: true }),
    handler: async ({ api, body }) => {
      const tag = await api.tags.update({
        tagId: params.tagId,
        ...body!,
      });
      return { status: 200, resp: tag };
    },
  });

export const DELETE = (
  req: NextRequest,
  { params }: { params: { tagId: string } },
) =>
  buildHandler({
    req,
    handler: async ({ api }) => {
      await api.tags.delete({
        tagId: params.tagId,
      });
      return {
        status: 204,
      };
    },
  });
\`\`\`

## Usage Examples

### Get Tag
\`\`\`bash
curl http://localhost:3000/api/v1/tags/123 \
  -H "Authorization: Bearer YOUR_TOKEN"
\`\`\`

### Update Tag
\`\`\`bash
curl -X PATCH http://localhost:3000/api/v1/tags/123 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Tag Name"
  }'
\`\`\`

### Delete Tag
\`\`\`bash
curl -X DELETE http://localhost:3000/api/v1/tags/123 \
  -H "Authorization: Bearer YOUR_TOKEN"
\`\`\`

## Notes
- Uses the common buildHandler utility for consistent error handling
- Validates tag updates using shared schema
- Returns appropriate status codes (200, 204) for different operations
- Force-dynamic ensures fresh data on each request
- Tag operations are user-specific through authentication
- Delete operation is permanent and cannot be undone
- Update operation allows partial updates through PATCH method
- Tag deletion may affect bookmark categorization
```

# api_docs\v1\tags\route.md

```md
# Tags Endpoint

## Overview
This endpoint provides functionality to retrieve all tags in the system. Tags are used to categorize and organize bookmarks.

## Technical Details

### Endpoint Information
- **URL**: `/api/v1/tags`
- **Method**: GET
- **Authentication**: Required
- **Dynamic**: Yes (force-dynamic enabled)

## Operation

### List All Tags (GET)
Retrieves all tags for the authenticated user.

#### Response
- **Status**: 200 OK
- **Body**: Array of tag objects
\`\`\`typescript
{
  // Array of tags
  tags: {
    id: string;
    name: string;
    // Other tag properties
  }[]
}
\`\`\`

### Implementation
\`\`\`typescript
import { NextRequest } from "next/server";
import { buildHandler } from "../utils/handler";

export const dynamic = "force-dynamic";

export const GET = (req: NextRequest) =>
  buildHandler({
    req,
    handler: async ({ api }) => {
      const tags = await api.tags.list();
      return { status: 200, resp: tags };
    },
  });
\`\`\`

## Usage Example

### Get All Tags
\`\`\`bash
curl http://localhost:3000/api/v1/tags \
  -H "Authorization: Bearer YOUR_TOKEN"
\`\`\`

## Notes
- Uses the common buildHandler utility for consistent error handling
- No pagination implemented for tag listing
- Force-dynamic ensures fresh data on each request
- Tags are user-specific through authentication
- Simple endpoint focused solely on tag retrieval
- Tags can be used for bookmark organization
- Returns all tags without filtering options
```

# api_docs\v1\utils\handler.md

```md
# Request Handler Utility

## Overview
The `buildHandler` utility provides a standardized way to handle HTTP requests in the Hoarder API. It implements consistent error handling, request validation, and response formatting while integrating with tRPC for type-safe API operations.

## Core Features

### 1. Request Processing
- Validates request parameters and body against Zod schemas
- Handles JSON parsing and content-type validation
- Creates tRPC context and client for each request
- Provides type-safe access to request data

### 2. Error Handling
- Handles different types of errors with appropriate HTTP status codes:
  - Zod validation errors (400 Bad Request)
  - tRPC errors (mapped to appropriate HTTP codes)
  - JSON parsing errors (400 Bad Request)
  - Unexpected errors (500 Internal Server Error)

### 3. Type Safety
- Fully typed request handling with TypeScript
- Generic type parameters for search params and body schemas
- Type inference for request handlers

## Technical Details

### Type Definitions

\`\`\`typescript
interface ErrorMessage {
  path: (string | number)[];
  message: string;
}

interface TrpcAPIRequest<SearchParamsT, BodyType> {
  ctx: Context;
  api: ReturnType<typeof createTrcpClientFromCtx>;
  searchParams: SearchParamsT extends z.ZodTypeAny
    ? z.infer<SearchParamsT>
    : undefined;
  body: BodyType extends z.ZodTypeAny
    ? z.infer<BodyType> | undefined
    : undefined;
}
\`\`\`

### TRPC Error Code Mapping
\`\`\`typescript
function trpcCodeToHttpCode(code: TRPCError["code"]) {
  switch (code) {
    case "BAD_REQUEST":
    case "PARSE_ERROR":
      return 400;
    case "UNAUTHORIZED":
      return 401;
    case "FORBIDDEN":
      return 403;
    case "NOT_FOUND":
      return 404;
    case "METHOD_NOT_SUPPORTED":
      return 405;
    case "TIMEOUT":
      return 408;
    case "PAYLOAD_TOO_LARGE":
      return 413;
    case "INTERNAL_SERVER_ERROR":
      return 500;
    default:
      return 500;
  }
}
\`\`\`

### Implementation Details

#### Handler Configuration
\`\`\`typescript
buildHandler({
  req: NextRequest;
  handler: (req: InputT) => Promise<{ status: number; resp?: object }>;
  searchParamsSchema?: SearchParamsT;
  bodySchema?: BodyT;
})
\`\`\`

#### Error Response Format
- Zod Validation Errors:
  \`\`\`json
  {
    "code": "ParseError",
    "message": "field.path: error message"
  }
  \`\`\`
- TRPC Errors:
  \`\`\`json
  {
    "code": "ERROR_CODE",
    "error": "Error message"
  }
  \`\`\`
- Unexpected Errors:
  \`\`\`json
  {
    "code": "UnknownError"
  }
  \`\`\`

## Usage Example

\`\`\`typescript
export const POST = (req: NextRequest) =>
  buildHandler({
    req,
    bodySchema: z.object({
      title: z.string(),
      content: z.string()
    }),
    searchParamsSchema: z.object({
      draft: z.boolean().optional()
    }),
    handler: async ({ api, body, searchParams }) => {
      const result = await api.someEndpoint.create({
        ...body,
        isDraft: searchParams?.draft
      });
      return { status: 201, resp: result };
    },
  });
\`\`\`

## Error Handling Flow
1. Request received
2. Content-type checked for POST/PUT requests
3. JSON body parsed if present
4. Search params and body validated against schemas
5. Handler executed within try-catch
6. Errors caught and formatted:
   - ZodError → 400 with formatted validation errors
   - TRPCError → Mapped HTTP status with error message
   - Other errors → 500 with UnknownError code

## Notes
- Always use Zod schemas for request validation
- Handler responses should include status code and optional response object
- All responses are automatically formatted as JSON
- Unexpected errors are logged but not exposed to clients
- TRPC errors are automatically mapped to appropriate HTTP status codes
```

# api_docs\v1\utils\pagination.md

```md
# Pagination Utility

## Overview
The pagination utility provides standardized cursor-based pagination functionality for the Hoarder API. It implements a cursor format that combines ID and timestamp for reliable pagination ordering.

## Technical Details

### Pagination Schema
\`\`\`typescript
const zPagination = z.object({
  limit: z.coerce.number().max(MAX_NUM_BOOKMARKS_PER_PAGE).optional(),
  cursor: z
    .string()
    .refine((val) => val.includes("_"), "Must be a valid cursor")
    .transform((val) => {
      const [id, createdAt] = val.split("_");
      return { id, createdAt };
    })
    .pipe(z.object({ id: z.string(), createdAt: z.coerce.date() }))
    .optional(),
});
\`\`\`

### Key Features

#### 1. Cursor Format
- Format: `{id}_{timestamp}`
- Example: `123_2024-02-02T18:30:00.000Z`
- Components:
  - `id`: Resource identifier
  - `timestamp`: ISO formatted creation date

#### 2. Pagination Parameters
- `limit`: Optional number of items per page
  - Maximum value enforced by `MAX_NUM_BOOKMARKS_PER_PAGE`
  - Coerced to number from string input
- `cursor`: Optional pagination cursor
  - String format: `id_timestamp`
  - Transformed into object with `id` and `createdAt`

#### 3. Response Adaptation
The `adaptPagination` function transforms internal cursor format to client-friendly string:

\`\`\`typescript
function adaptPagination<T extends { nextCursor: CursorV2 | null }>(input: T) {
  const { nextCursor, ...rest } = input;
  if (!nextCursor) {
    return input;
  }
  return {
    ...rest,
    nextCursor: `${nextCursor.id}_${nextCursor.createdAt.toISOString()}`,
  };
}
\`\`\`

## Usage Example

### Request
\`\`\`typescript
// GET /api/v1/bookmarks?limit=10&cursor=123_2024-02-02T18:30:00.000Z
export const GET = (req: NextRequest) =>
  buildHandler({
    req,
    searchParamsSchema: zPagination,
    handler: async ({ searchParams }) => {
      // searchParams.cursor is automatically transformed to:
      // { id: "123", createdAt: Date("2024-02-02T18:30:00.000Z") }
      const result = await getItems(searchParams);
      return { status: 200, resp: adaptPagination(result) };
    },
  });
\`\`\`

### Response
\`\`\`json
{
  "items": [...],
  "nextCursor": "124_2024-02-02T18:31:00.000Z"
}
\`\`\`

## Implementation Notes

1. Cursor Validation
   - Ensures cursor contains both ID and timestamp
   - Validates timestamp is a valid date
   - Transforms string input into structured object

2. Pagination Flow
   - Client sends cursor string in query params
   - Server validates and transforms cursor
   - Query uses cursor for efficient pagination
   - Response adapted back to string format

3. Type Safety
   - Uses Zod for runtime validation
   - Maintains type safety through generics
   - Integrates with shared type definitions

4. Best Practices
   - Cursor-based pagination for consistency
   - ISO timestamp format for universal compatibility
   - Automatic type coercion for better DX
   - Maximum limit enforcement for performance

## Notes
- Always use `adaptPagination` when returning paginated responses
- Cursor format ensures stable ordering even with data changes
- Integrates with `@hoarder/shared/types/pagination` for consistency
- Maximum items per page is defined in shared constants
```

# api_docs\v1\utils\types.md

```md
# Types Utility

## Overview
The types utility provides shared type definitions and validation schemas used across the Hoarder API. Currently, it includes a specialized Zod schema for handling boolean values passed as strings in URL query parameters.

## Technical Details

### String Boolean Schema
\`\`\`typescript
const zStringBool = z
  .string()
  .refine((val) => val === "true" || val === "false", "Must be true or false")
  .transform((val) => val === "true");
\`\`\`

#### Features
- Validates string input must be exactly "true" or "false"
- Transforms validated string to actual boolean value
- Provides type-safe boolean handling for query parameters

### Usage Example

\`\`\`typescript
// In an API route
export const GET = (req: NextRequest) =>
  buildHandler({
    req,
    searchParamsSchema: z.object({
      isActive: zStringBool.optional(),
    }),
    handler: async ({ searchParams }) => {
      // searchParams.isActive is boolean | undefined
      const items = await getItems({ active: searchParams.isActive });
      return { status: 200, resp: items };
    },
  });
\`\`\`

### Valid Requests
\`\`\`
GET /api/endpoint?isActive=true   // searchParams.isActive = true
GET /api/endpoint?isActive=false  // searchParams.isActive = false
GET /api/endpoint                 // searchParams.isActive = undefined
\`\`\`

### Invalid Requests
\`\`\`
GET /api/endpoint?isActive=1      // Error: Must be true or false
GET /api/endpoint?isActive=yes    // Error: Must be true or false
GET /api/endpoint?isActive=       // Error: Must be true or false
\`\`\`

## Notes
- Used primarily for query parameter validation
- Ensures consistent boolean handling across the API
- Provides better type safety than manual string parsing
- Integrates with Zod for runtime type validation
```

# README.md

```md
# Hoarder API Documentation

## Overview

This document provides a comprehensive overview of the Hoarder API, its architecture, endpoints, and usage. The Hoarder API is designed to manage bookmarks, highlights, lists, and tags, providing functionalities for creating, retrieving, updating, and deleting these resources.

## Documentation Structure

The API documentation is organized in a mirrored structure to the codebase, making it easy to find corresponding documentation for any code file:

\`\`\`
api_docs/
├── health/
│   └── route.md              # Health check endpoint
├── assets/
│   ├── route.md             # Asset upload
│   └── [assetId]/
│       └── route.md         # Individual asset operations
├── v1/
│   ├── utils/
│   │   ├── handler.md       # Request handler utility
│   │   ├── pagination.md    # Pagination utility
│   │   └── types.md        # Type definitions
│   ├── bookmarks/
│   │   ├── route.md        # Bookmark collection
│   │   ├── search/
│   │   │   └── route.md    # Bookmark search
│   │   └── [bookmarkId]/
│   │       ├── route.md    # Individual bookmark
│   │       └── assets/     # Bookmark assets
│   ├── lists/
│   │   ├── route.md        # List collection
│   │   └── [listId]/
│   │       ├── route.md    # Individual list
│   │       └── bookmarks/  # List bookmarks
│   └── tags/
│       ├── route.md        # Tag collection
│       └── [tagId]/
│           ├── route.md    # Individual tag
│           └── bookmarks/  # Tagged bookmarks
\`\`\`

Each documentation file includes:
- Endpoint/utility overview
- Technical details
- Implementation examples
- Usage examples with curl commands
- Notes and best practices

## API Endpoints (v1)

### Bookmarks

- `GET /v1/bookmarks`: Retrieve all bookmarks.
- `POST /v1/bookmarks`: Create a new bookmark.
- `GET /v1/bookmarks/:bookmarkId`: Retrieve a specific bookmark.
- `PUT /v1/bookmarks/:bookmarkId`: Update a bookmark.
- `DELETE /v1/bookmarks/:bookmarkId`: Delete a bookmark.
- `GET /v1/bookmarks/:bookmarkId/assets`: Retrieve assets for a bookmark.
- `POST /v1/bookmarks/:bookmarkId/assets`: Add an asset to a bookmark.
- `GET /v1/bookmarks/:bookmarkId/assets/:assetId`: Retrieve a specific asset.
- `DELETE /v1/bookmarks/:bookmarkId/assets/:assetId`: Delete an asset.
- `GET /v1/bookmarks/:bookmarkId/highlights`: Retrieve highlights for a bookmark.
- `POST /v1/bookmarks/:bookmarkId/highlights`: Add a highlight to a bookmark.
- `GET /v1/bookmarks/:bookmarkId/lists`: Retrieve lists associated with a bookmark.
- `POST /v1/bookmarks/:bookmarkId/lists`: Add a bookmark to a list.
- `GET /v1/bookmarks/:bookmarkId/tags`: Retrieve tags for a bookmark.
- `POST /v1/bookmarks/:bookmarkId/tags`: Add a tag to a bookmark.
- `GET /v1/bookmarks/search`: Search bookmarks.
- `POST /v1/bookmarks/singlefile`: Import bookmarks from SingleFile.

### Highlights

- `GET /v1/highlights`: Retrieve all highlights.
- `POST /v1/highlights`: Create a new highlight.
- `GET /v1/highlights/:highlightId`: Retrieve a specific highlight.
- `PUT /v1/highlights/:highlightId`: Update a highlight.
- `DELETE /v1/highlights/:highlightId`: Delete a highlight.

### Lists

- `GET /v1/lists`: Retrieve all lists.
- `POST /v1/lists`: Create a new list.
- `GET /v1/lists/:listId`: Retrieve a specific list.
- `PUT /v1/lists/:listId`: Update a list.
- `DELETE /v1/lists/:listId`: Delete a list.
- `GET /v1/lists/:listId/bookmarks`: Retrieve bookmarks in a list.
- `POST /v1/lists/:listId/bookmarks`: Add a bookmark to a list.
- `DELETE /v1/lists/:listId/bookmarks/:bookmarkId`: Remove a bookmark from a list.

### Tags

- `GET /v1/tags`: Retrieve all tags.
- `POST /v1/tags`: Create a new tag.
- `GET /v1/tags/:tagId`: Retrieve a specific tag.
- `PUT /v1/tags/:tagId`: Update a tag.
- `DELETE /v1/tags/:tagId`: Delete a tag.
- `GET /v1/tags/:tagId/bookmarks`: Retrieve bookmarks associated with a tag.

## Documentation Features

- **Mirrored Structure**: Documentation follows the same structure as the codebase
- **Comprehensive Coverage**: Each endpoint and utility has detailed documentation
- **Code Examples**: Implementation details with TypeScript code
- **Usage Examples**: Practical curl commands for API interaction
- **Type Safety**: Detailed type information for request/response schemas
- **Best Practices**: Notes on usage patterns and considerations

## Further Development

The documentation is maintained alongside the codebase in the api_docs directory. Each code file in api_code has a corresponding markdown file in api_docs with detailed documentation. This structure ensures documentation stays current with code changes and makes it easy to find relevant documentation for any part of the API.
```

