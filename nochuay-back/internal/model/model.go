package model

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// User represents a registered user.
type User struct {
	ID           uuid.UUID `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"` // Never expose in JSON responses
	CreatedAt    time.Time `json:"createdAt"`
}

// Page represents a single page/document.
//
// The Content field stores a BlockNote editor JSON array as JSONB.
// Schema for block content (BlockNote format):
//
//	[
//	  {
//	    "id":       "string",              // Unique block identifier
//	    "type":     "string",              // Block type: paragraph, heading, bulletListItem, numberedListItem, checkListItem, image, table, codeBlock, etc.
//	    "props":    { ... },               // Type-specific properties (e.g., textAlignment, level for headings, url for images)
//	    "content":  [ { "type": "text", "text": "...", "styles": { ... } }, ... ],  // Inline content array
//	    "children": [ ... ]                // Nested child blocks (same schema, recursive)
//	  }
//	]
//
// An empty page has content = []  (empty JSON array).
type Page struct {
	ID          uuid.UUID       `json:"id"`
	UserID      uuid.UUID       `json:"userId"`
	ParentID    *uuid.UUID      `json:"parentId"` // nil = root page
	Title       string          `json:"title"`
	Icon        *string         `json:"icon,omitempty"`
	CoverImage  *string         `json:"coverImage,omitempty"`
	Content     json.RawMessage `json:"content"`
	IsPublished bool            `json:"isPublished"`
	CreatedAt   time.Time       `json:"createdAt"`
	UpdatedAt   time.Time       `json:"updatedAt"`
}

// PageNode is the recursive tree structure used for the sidebar.
type PageNode struct {
	Page
	Children []PageNode `json:"children"`
	Depth    int        `json:"depth"`
}

// PageSearchResult is a lightweight projection used by title search.
type PageSearchResult struct {
	ID       uuid.UUID  `json:"id"`
	ParentID *uuid.UUID `json:"parentId"`
	Title    string     `json:"title"`
	Icon     *string    `json:"icon,omitempty"`
}
