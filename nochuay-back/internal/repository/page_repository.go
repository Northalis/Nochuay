package repository

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/Northalis/Nochuay/nochuay-back/internal/model"
)

// PageRepository defines the interface for page data access.
type PageRepository interface {
	CreatePage(ctx context.Context, userID uuid.UUID, parentID *uuid.UUID, title string) (*model.Page, error)
	GetPageByID(ctx context.Context, userID, pageID uuid.UUID) (*model.Page, error)
	UpdatePage(ctx context.Context, userID, pageID uuid.UUID, updates map[string]any) (*model.Page, error)
	DeletePage(ctx context.Context, userID, pageID uuid.UUID) error
	GetPagesByUserID(ctx context.Context, userID uuid.UUID) ([]model.Page, error)
	SaveContent(ctx context.Context, userID, pageID uuid.UUID, content json.RawMessage) (*model.Page, error)
	GetContent(ctx context.Context, userID, pageID uuid.UUID) (json.RawMessage, error)
}

type pageRepository struct {
	pool *pgxpool.Pool
}

// NewPageRepository creates a new PageRepository.
func NewPageRepository(pool *pgxpool.Pool) PageRepository {
	return &pageRepository{pool: pool}
}

func (r *pageRepository) CreatePage(ctx context.Context, userID uuid.UUID, parentID *uuid.UUID, title string) (*model.Page, error) {
	var page model.Page
	err := r.pool.QueryRow(ctx,
		`INSERT INTO pages (user_id, parent_id, title)
		 VALUES ($1, $2, $3)
		 RETURNING id, user_id, parent_id, title, icon, cover_image, content, is_published, created_at, updated_at`,
		userID, parentID, title,
	).Scan(
		&page.ID, &page.UserID, &page.ParentID, &page.Title,
		&page.Icon, &page.CoverImage, &page.Content, &page.IsPublished,
		&page.CreatedAt, &page.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create page: %w", err)
	}
	return &page, nil
}

func (r *pageRepository) GetPageByID(ctx context.Context, userID, pageID uuid.UUID) (*model.Page, error) {
	var page model.Page
	err := r.pool.QueryRow(ctx,
		`SELECT id, user_id, parent_id, title, icon, cover_image, content, is_published, created_at, updated_at
		 FROM pages
		 WHERE id = $1 AND user_id = $2`,
		pageID, userID,
	).Scan(
		&page.ID, &page.UserID, &page.ParentID, &page.Title,
		&page.Icon, &page.CoverImage, &page.Content, &page.IsPublished,
		&page.CreatedAt, &page.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get page: %w", err)
	}
	return &page, nil
}

func (r *pageRepository) UpdatePage(ctx context.Context, userID, pageID uuid.UUID, updates map[string]any) (*model.Page, error) {
	// Build dynamic SET clause
	setClauses := ""
	args := []any{}
	argIdx := 1

	for key, val := range updates {
		if setClauses != "" {
			setClauses += ", "
		}
		switch key {
		case "title":
			setClauses += fmt.Sprintf("title = $%d", argIdx)
		case "icon":
			setClauses += fmt.Sprintf("icon = $%d", argIdx)
		case "cover_image":
			setClauses += fmt.Sprintf("cover_image = $%d", argIdx)
		case "content":
			setClauses += fmt.Sprintf("content = $%d", argIdx)
		case "is_published":
			setClauses += fmt.Sprintf("is_published = $%d", argIdx)
		default:
			continue
		}
		args = append(args, val)
		argIdx++
	}

	if setClauses == "" {
		return r.GetPageByID(ctx, userID, pageID)
	}

	// Add updated_at
	setClauses += fmt.Sprintf(", updated_at = NOW()")

	// Add WHERE conditions
	args = append(args, pageID, userID)
	query := fmt.Sprintf(
		`UPDATE pages SET %s WHERE id = $%d AND user_id = $%d
		 RETURNING id, user_id, parent_id, title, icon, cover_image, content, is_published, created_at, updated_at`,
		setClauses, argIdx, argIdx+1,
	)

	var page model.Page
	err := r.pool.QueryRow(ctx, query, args...).Scan(
		&page.ID, &page.UserID, &page.ParentID, &page.Title,
		&page.Icon, &page.CoverImage, &page.Content, &page.IsPublished,
		&page.CreatedAt, &page.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to update page: %w", err)
	}
	return &page, nil
}

func (r *pageRepository) DeletePage(ctx context.Context, userID, pageID uuid.UUID) error {
	result, err := r.pool.Exec(ctx,
		`DELETE FROM pages WHERE id = $1 AND user_id = $2`,
		pageID, userID,
	)
	if err != nil {
		return fmt.Errorf("failed to delete page: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("page not found")
	}
	return nil
}

func (r *pageRepository) GetPagesByUserID(ctx context.Context, userID uuid.UUID) ([]model.Page, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, user_id, parent_id, title, icon, cover_image, content, is_published, created_at, updated_at
		 FROM pages
		 WHERE user_id = $1
		 ORDER BY created_at ASC`,
		userID,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get pages: %w", err)
	}
	defer rows.Close()

	var pages []model.Page
	for rows.Next() {
		var page model.Page
		if err := rows.Scan(
			&page.ID, &page.UserID, &page.ParentID, &page.Title,
			&page.Icon, &page.CoverImage, &page.Content, &page.IsPublished,
			&page.CreatedAt, &page.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan page: %w", err)
		}
		pages = append(pages, page)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed iterating pages: %w", err)
	}

	return pages, nil
}

// SaveContent replaces the content JSONB column for a specific page.
func (r *pageRepository) SaveContent(ctx context.Context, userID, pageID uuid.UUID, content json.RawMessage) (*model.Page, error) {
	var page model.Page
	err := r.pool.QueryRow(ctx,
		`UPDATE pages SET content = $1, updated_at = NOW()
		 WHERE id = $2 AND user_id = $3
		 RETURNING id, user_id, parent_id, title, icon, cover_image, content, is_published, created_at, updated_at`,
		content, pageID, userID,
	).Scan(
		&page.ID, &page.UserID, &page.ParentID, &page.Title,
		&page.Icon, &page.CoverImage, &page.Content, &page.IsPublished,
		&page.CreatedAt, &page.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to save content: %w", err)
	}
	return &page, nil
}

// GetContent returns only the content JSONB for a specific page.
func (r *pageRepository) GetContent(ctx context.Context, userID, pageID uuid.UUID) (json.RawMessage, error) {
	var content json.RawMessage
	err := r.pool.QueryRow(ctx,
		`SELECT content FROM pages WHERE id = $1 AND user_id = $2`,
		pageID, userID,
	).Scan(&content)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get content: %w", err)
	}
	return content, nil
}
