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
