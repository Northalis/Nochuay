# API Reference

Complete reference for the Nochuay REST API. All endpoints return JSON responses wrapped in a standard envelope.

---

## Response Format

Every API response follows this structure:

```json
{
  "data": <payload or null>,
  "error": <error message string or null>
}
```

**Success example:**

```json
{
  "data": { "status": "ok" },
  "error": null
}
```

**Error example:**

```json
{
  "data": null,
  "error": "invalid email or password"
}
```

The response wrapper is implemented in `nochuay-back/internal/handler/response/response.go`.

---

## Authentication

Protected endpoints require a JWT token in the `Authorization` header:

```
Authorization: Bearer <JWT_TOKEN>
```

Tokens are obtained via the `/auth/signup` or `/auth/login` endpoints and are valid for **72 hours**. The JWT uses HS256 signing with the `JWT_SECRET` environment variable.

**Token claims:**

| Claim     | Type   | Description             |
| --------- | ------ | ----------------------- |
| `user_id` | string | UUID of the user        |
| `exp`     | number | Expiration (Unix epoch) |
| `iat`     | number | Issued at (Unix epoch)  |

---

## Endpoints

### Health Check

#### `GET /health`

Public endpoint to verify the API is running.

**Request:**

```bash
curl http://localhost:8080/health
```

**Response (200 OK):**

```json
{
  "data": { "status": "ok" },
  "error": null
}
```

---

### Authentication

#### `POST /auth/signup`

Register a new user account.

**Request Body:**

| Field      | Type   | Required | Validation           |
| ---------- | ------ | -------- | -------------------- |
| `email`    | string | Yes      | Must contain `@`     |
| `password` | string | Yes      | Minimum 6 characters |

```bash
curl -X POST http://localhost:8080/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "securepass"}'
```

**Response (201 Created):**

```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "email": "user@example.com",
      "createdAt": "2026-02-20T10:30:00Z"
    }
  },
  "error": null
}
```

**Error Responses:**

| Status | Error Message                            | Cause                   |
| ------ | ---------------------------------------- | ----------------------- |
| 400    | `email and password are required`        | Empty email or password |
| 400    | `password must be at least 6 characters` | Password too short      |
| 400    | `invalid email format`                   | Email missing `@`       |
| 400    | `invalid request body`                   | Malformed JSON          |
| 409    | `user with this email already exists`    | Duplicate email         |

---

#### `POST /auth/login`

Authenticate an existing user.

**Request Body:**

| Field      | Type   | Required |
| ---------- | ------ | -------- |
| `email`    | string | Yes      |
| `password` | string | Yes      |

```bash
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "securepass"}'
```

**Response (200 OK):**

```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "email": "user@example.com",
      "createdAt": "2026-02-20T10:30:00Z"
    }
  },
  "error": null
}
```

**Error Responses:**

| Status | Error Message                     | Cause                   |
| ------ | --------------------------------- | ----------------------- |
| 400    | `email and password are required` | Empty credentials       |
| 400    | `invalid request body`            | Malformed JSON          |
| 401    | `invalid email or password`       | Wrong email or password |

---

#### `PATCH /auth/account/email`

Update the authenticated user's email address.

**Request Body:**

| Field             | Type   | Required | Description                          |
| ----------------- | ------ | -------- | ------------------------------------ |
| `currentPassword` | string | Yes      | Current account password             |
| `newEmail`        | string | Yes      | New email address (must contain `@`) |

```bash
curl -X PATCH http://localhost:8080/auth/account/email \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword": "password123", "newEmail": "new@example.com"}'
```

**Response (200 OK):**

```json
{
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "new@example.com",
    "createdAt": "2026-02-20T10:30:00Z"
  },
  "error": null
}
```

**Error Responses:**

| Status | Error Message                               | Cause                   |
| ------ | ------------------------------------------- | ----------------------- |
| 400    | `newEmail and currentPassword are required` | Missing required fields |
| 400    | `invalid email format`                      | Email missing `@`       |
| 401    | `invalid current password`                  | Password does not match |
| 404    | `user not found`                            | User record missing     |
| 409    | `user with this email already exists`       | Duplicate email         |
| 500    | `failed to update account email`            | Unexpected server error |

---

#### `PATCH /auth/account/password`

Update the authenticated user's password.

**Request Body:**

| Field             | Type   | Required | Validation               |
| ----------------- | ------ | -------- | ------------------------ |
| `currentPassword` | string | Yes      | Current account password |
| `newPassword`     | string | Yes      | Minimum 6 characters     |

```bash
curl -X PATCH http://localhost:8080/auth/account/password \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword": "password123", "newPassword": "newPassword123"}'
```

**Response (200 OK):**

```json
{
  "data": { "success": true },
  "error": null
}
```

**Error Responses:**

| Status | Error Message                                  | Cause                   |
| ------ | ---------------------------------------------- | ----------------------- |
| 400    | `currentPassword and newPassword are required` | Missing required fields |
| 400    | `newPassword must be at least 6 characters`    | Password too short      |
| 401    | `invalid current password`                     | Password does not match |
| 404    | `user not found`                               | User record missing     |
| 500    | `failed to update account password`            | Unexpected server error |

---

### Pages

All page endpoints require authentication (Bearer JWT).

#### `GET /pages/sidebar`

Fetch the full nested page tree for the authenticated user. This is the primary data source for the sidebar navigation.

**Request:**

```bash
curl http://localhost:8080/pages/sidebar \
  -H "Authorization: Bearer <TOKEN>"
```

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": "page-uuid-1",
      "userId": "user-uuid",
      "parentId": null,
      "title": "My Notes",
      "icon": "📝",
      "content": [],
      "isPublished": false,
      "createdAt": "2026-02-20T10:00:00Z",
      "updatedAt": "2026-02-20T10:00:00Z",
      "children": [
        {
          "id": "page-uuid-2",
          "userId": "user-uuid",
          "parentId": "page-uuid-1",
          "title": "Sub-page",
          "content": [],
          "isPublished": false,
          "createdAt": "2026-02-20T10:05:00Z",
          "updatedAt": "2026-02-20T10:05:00Z",
          "children": [],
          "depth": 1
        }
      ],
      "depth": 0
    }
  ],
  "error": null
}
```

Returns an empty array `[]` if the user has no pages.

---

#### `GET /pages/search`

Search page titles for the authenticated user.

**Query Parameters:**

| Param | Type   | Required | Description                     |
| ----- | ------ | -------- | ------------------------------- |
| `q`   | string | Yes      | Search query (case-insensitive) |

Results are ordered with prefix matches first, then A-Z by title.
The backend limits results to 25 items per request.

**Request:**

```bash
curl "http://localhost:8080/pages/search?q=roadmap" \
  -H "Authorization: Bearer <TOKEN>"
```

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": "page-uuid",
      "parentId": null,
      "title": "Roadmap",
      "icon": "🧭"
    }
  ],
  "error": null
}
```

**Error Responses:**

| Status | Error Message                     | Cause                    |
| ------ | --------------------------------- | ------------------------ |
| 400    | `query parameter 'q' is required` | Missing or empty query   |
| 401    | `unauthorized`                    | Missing or invalid token |

---

#### `POST /pages`

Create a new page.

**Request Body:**

| Field      | Type           | Required | Default      | Description                       |
| ---------- | -------------- | -------- | ------------ | --------------------------------- |
| `parentId` | string \| null | No       | `null`       | UUID of parent page (null = root) |
| `title`    | string         | No       | `"Untitled"` | Page title                        |

```bash
# Create a root page
curl -X POST http://localhost:8080/pages \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title": "My New Page"}'

# Create a child page
curl -X POST http://localhost:8080/pages \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"parentId": "parent-uuid", "title": "Child Page"}'
```

**Response (201 Created):**

```json
{
  "data": {
    "id": "new-page-uuid",
    "userId": "user-uuid",
    "parentId": null,
    "title": "My New Page",
    "content": [],
    "isPublished": false,
    "createdAt": "2026-02-20T12:00:00Z",
    "updatedAt": "2026-02-20T12:00:00Z"
  },
  "error": null
}
```

**Error Responses:**

| Status | Error Message             | Cause                          |
| ------ | ------------------------- | ------------------------------ |
| 400    | `invalid request body`    | Malformed JSON                 |
| 400    | `invalid parentId format` | `parentId` is not a valid UUID |
| 401    | `unauthorized`            | Missing or invalid auth token  |
| 404    | `parent page not found`   | Parent UUID doesn't exist      |

---

#### `POST /pages/{id}/assets`

Upload an image or file for a page using multipart form data. This is used by the editor slash menu for direct local uploads.

**Request:**

- Content-Type: `multipart/form-data`
- Auth required: `Authorization: Bearer <TOKEN>`

**Form Fields:**

| Field  | Type   | Required | Description           |
| ------ | ------ | -------- | --------------------- |
| `kind` | string | Yes      | `image` or `file`     |
| `file` | file   | Yes      | Uploaded file payload |

**Allowed MIME / extension policy:**

- `kind=image`: png, jpg/jpeg, webp, gif, svg
- `kind=file`: pdf, txt, doc, docx
- Default max size: `10MB` (configurable via `MAX_UPLOAD_SIZE_BYTES`)

```bash
curl -X POST http://localhost:8080/pages/page-uuid/assets \
  -H "Authorization: Bearer <TOKEN>" \
  -F "kind=image" \
  -F "file=@./example.png"
```

**Response (201 Created):**

```json
{
  "data": {
    "url": "/assets/user-uuid/page-uuid/1713209600000_xxxxxxxx.png",
    "contentType": "image/png",
    "size": 18342,
    "name": "example.png"
  },
  "error": null
}
```

**Error Responses:**

| Status | Error Message                              | Cause                                   |
| ------ | ------------------------------------------ | --------------------------------------- |
| 400    | `invalid page id format`                   | Invalid UUID                            |
| 400    | `kind must be either 'image' or 'file'`    | Invalid upload kind                     |
| 400    | `file is required`                         | Missing `file` field                    |
| 400    | `unsupported file type for requested kind` | MIME/extension validation failed        |
| 401    | `unauthorized`                             | Missing or invalid token                |
| 404    | `page not found`                           | Page doesn't exist or not owned by user |
| 413    | `upload exceeds max size`                  | File larger than configured limit       |

---

#### `GET /assets/{userID}/{pageID}/{filename}`

Retrieve previously uploaded assets. Returned URLs are intentionally opaque and can be embedded directly in editor blocks.

**Request:**

```bash
curl http://localhost:8080/assets/user-uuid/page-uuid/1713209600000_xxxxxxxx.png
```

**Response (200 OK):** Raw file bytes with content type inferred by file server.

---

#### `GET /pages/{id}`

Retrieve a single page with all its properties including content.

**Request:**

```bash
curl http://localhost:8080/pages/page-uuid \
  -H "Authorization: Bearer <TOKEN>"
```

**Response (200 OK):**

```json
{
  "data": {
    "id": "page-uuid",
    "userId": "user-uuid",
    "parentId": null,
    "title": "My Page",
    "icon": "📄",
    "content": [
      {
        "id": "block-1",
        "type": "paragraph",
        "props": { "textAlignment": "left" },
        "content": [{ "type": "text", "text": "Hello world", "styles": {} }],
        "children": []
      }
    ],
    "isPublished": false,
    "createdAt": "2026-02-20T10:00:00Z",
    "updatedAt": "2026-02-20T12:30:00Z"
  },
  "error": null
}
```

**Error Responses:**

| Status | Error Message            | Cause                                   |
| ------ | ------------------------ | --------------------------------------- |
| 400    | `invalid page id format` | `{id}` is not a valid UUID              |
| 401    | `unauthorized`           | Missing or invalid auth token           |
| 404    | `page not found`         | Page doesn't exist or not owned by user |

---

#### `PATCH /pages/{id}`

Partially update a page's properties. Only include fields you want to change.

**Request Body:**

| Field     | Type   | Description                                   |
| --------- | ------ | --------------------------------------------- |
| `title`   | string | New page title                                |
| `icon`    | string | Emoji or icon identifier                      |
| `content` | JSON   | BlockNote JSON content (array or stringified) |

```bash
# Update title only
curl -X PATCH http://localhost:8080/pages/page-uuid \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Title"}'

# Update icon
curl -X PATCH http://localhost:8080/pages/page-uuid \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"icon": "🚀"}'

# Update multiple fields
curl -X PATCH http://localhost:8080/pages/page-uuid \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title": "New Title", "icon": "📋"}'
```

**Response (200 OK):** Returns the full updated page object.

**Error Responses:**

| Status | Error Message                | Cause                    |
| ------ | ---------------------------- | ------------------------ |
| 400    | `invalid page id format`     | Invalid UUID             |
| 400    | `invalid request body`       | Malformed JSON           |
| 400    | `no fields to update`        | Empty update body        |
| 400    | `content must be valid JSON` | Content parse error      |
| 401    | `unauthorized`               | Missing or invalid token |
| 404    | `page not found`             | Page doesn't exist       |

---

#### `DELETE /pages/{id}`

Move a page and all its descendant pages to Trash (soft delete). This sets `deleted_at` and hides the page from all active GET endpoints.

**Request:**

```bash
curl -X DELETE http://localhost:8080/pages/page-uuid \
  -H "Authorization: Bearer <TOKEN>"
```

**Response (200 OK):**

```json
{
  "data": { "success": true },
  "error": null
}
```

**Error Responses:**

| Status | Error Message            | Cause                    |
| ------ | ------------------------ | ------------------------ |
| 400    | `invalid page id format` | Invalid UUID             |
| 401    | `unauthorized`           | Missing or invalid token |
| 404    | `page not found`         | Page doesn't exist       |

---

#### `GET /pages/trash`

Fetch all trashed pages for the authenticated user.

**Request:**

```bash
curl http://localhost:8080/pages/trash \
  -H "Authorization: Bearer <TOKEN>"
```

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": "page-uuid",
      "parentId": "parent-uuid",
      "title": "Archived page",
      "icon": "🗂️",
      "deletedAt": "2026-04-28T10:30:00Z"
    }
  ],
  "error": null
}
```

**Error Responses:**

| Status | Error Message  | Cause                    |
| ------ | -------------- | ------------------------ |
| 401    | `unauthorized` | Missing or invalid token |

---

#### `PATCH /pages/{id}/restore`

Restore a trashed page and its descendant pages back to the active tree.

**Request:**

```bash
curl -X PATCH http://localhost:8080/pages/page-uuid/restore \
  -H "Authorization: Bearer <TOKEN>"
```

**Response (200 OK):**

```json
{
  "data": { "success": true },
  "error": null
}
```

**Error Responses:**

| Status | Error Message            | Cause                    |
| ------ | ------------------------ | ------------------------ |
| 400    | `invalid page id format` | Invalid UUID             |
| 401    | `unauthorized`           | Missing or invalid token |
| 404    | `page not found`         | Page is not in the trash |

---

#### `DELETE /pages/{id}/permanent`

Permanently delete a trashed page and all descendants. This action is irreversible.

**Request:**

```bash
curl -X DELETE http://localhost:8080/pages/page-uuid/permanent \
  -H "Authorization: Bearer <TOKEN>"
```

**Response (200 OK):**

```json
{
  "data": { "success": true },
  "error": null
}
```

**Error Responses:**

| Status | Error Message            | Cause                    |
| ------ | ------------------------ | ------------------------ |
| 400    | `invalid page id format` | Invalid UUID             |
| 401    | `unauthorized`           | Missing or invalid token |
| 404    | `page not found`         | Page is not in the trash |

---

#### `PUT /pages/{id}/content`

Save the full BlockNote editor content for a page. This is a dedicated endpoint for content-only updates, separate from the general `PATCH` endpoint.

**Request Body:** A raw JSON array of BlockNote block objects.

```bash
curl -X PUT http://localhost:8080/pages/page-uuid/content \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "id": "block-1",
      "type": "paragraph",
      "props": { "textAlignment": "left" },
      "content": [{ "type": "text", "text": "Updated content", "styles": {} }],
      "children": []
    }
  ]'
```

**Response (200 OK):** Returns the full updated page object.

**Error Responses:**

| Status | Error Message                            | Cause                    |
| ------ | ---------------------------------------- | ------------------------ |
| 400    | `invalid page id format`                 | Invalid UUID             |
| 400    | `invalid JSON body`                      | Parse error              |
| 400    | `content must be valid JSON`             | Invalid JSON             |
| 400    | `content must be a JSON array of blocks` | Not a JSON array         |
| 401    | `unauthorized`                           | Missing or invalid token |
| 404    | `page not found`                         | Page doesn't exist       |

---

#### `GET /pages/{id}/content`

Retrieve only the content field for a page. This is a lightweight endpoint used by the editor to fetch content without loading all page metadata.

**Request:**

```bash
curl http://localhost:8080/pages/page-uuid/content \
  -H "Authorization: Bearer <TOKEN>"
```

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": "block-1",
      "type": "paragraph",
      "props": { "textAlignment": "left" },
      "content": [{ "type": "text", "text": "Hello", "styles": {} }],
      "children": []
    }
  ],
  "error": null
}
```

**Error Responses:**

| Status | Error Message            | Cause                    |
| ------ | ------------------------ | ------------------------ |
| 400    | `invalid page id format` | Invalid UUID             |
| 401    | `unauthorized`           | Missing or invalid token |
| 404    | `page not found`         | Page doesn't exist       |

---

## Error Status Code Summary

| Status Code | Meaning               | When Used                                       |
| ----------- | --------------------- | ----------------------------------------------- |
| 200         | OK                    | Successful GET, PATCH, PUT, DELETE              |
| 201         | Created               | Successful POST (signup, create page)           |
| 400         | Bad Request           | Invalid input, malformed JSON, validation error |
| 401         | Unauthorized          | Missing/invalid/expired JWT token               |
| 404         | Not Found             | Resource doesn't exist or not owned by user     |
| 409         | Conflict              | Duplicate email on signup                       |
| 413         | Payload Too Large     | Upload request exceeds configured max size      |
| 500         | Internal Server Error | Unexpected server-side failure                  |

---

## CORS Configuration

The backend sets these CORS headers on all responses:

| Header                         | Value                                                                      |
| ------------------------------ | -------------------------------------------------------------------------- |
| `Access-Control-Allow-Origin`  | Value of `CORS_ALLOWED_ORIGINS` env var (default: `http://localhost:3000`) |
| `Access-Control-Allow-Methods` | `GET, POST, PATCH, PUT, DELETE, OPTIONS`                                   |
| `Access-Control-Allow-Headers` | `Authorization, Content-Type`                                              |

Preflight `OPTIONS` requests are handled automatically with a `204 No Content` response.
