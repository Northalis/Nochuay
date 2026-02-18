package service

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"nochuay.app/api/internal/model"
	"nochuay.app/api/internal/repository"
)

// PageService defines the interface for page business logic.
type PageService interface {
	CreatePage(ctx context.Context, userID uuid.UUID, parentID *uuid.UUID, title string) (*model.Page, error)
	GetPage(ctx context.Context, userID, pageID uuid.UUID) (*model.Page, error)
	UpdatePage(ctx context.Context, userID, pageID uuid.UUID, updates map[string]any) (*model.Page, error)
	DeletePage(ctx context.Context, userID, pageID uuid.UUID) error
}

type pageService struct {
	pageRepo repository.PageRepository
}

// NewPageService creates a new PageService.
func NewPageService(pageRepo repository.PageRepository) PageService {
	return &pageService{pageRepo: pageRepo}
}

func (s *pageService) CreatePage(ctx context.Context, userID uuid.UUID, parentID *uuid.UUID, title string) (*model.Page, error) {
	if title == "" {
		title = "Untitled"
	}

	// If parentID is provided, verify the parent belongs to the same user
	if parentID != nil {
		parent, err := s.pageRepo.GetPageByID(ctx, userID, *parentID)
		if err != nil {
			return nil, fmt.Errorf("failed to verify parent page: %w", err)
		}
		if parent == nil {
			return nil, fmt.Errorf("parent page not found")
		}
	}

	page, err := s.pageRepo.CreatePage(ctx, userID, parentID, title)
	if err != nil {
		return nil, fmt.Errorf("failed to create page: %w", err)
	}
	return page, nil
}

func (s *pageService) GetPage(ctx context.Context, userID, pageID uuid.UUID) (*model.Page, error) {
	page, err := s.pageRepo.GetPageByID(ctx, userID, pageID)
	if err != nil {
		return nil, fmt.Errorf("failed to get page: %w", err)
	}
	if page == nil {
		return nil, fmt.Errorf("page not found")
	}
	return page, nil
}

func (s *pageService) UpdatePage(ctx context.Context, userID, pageID uuid.UUID, updates map[string]any) (*model.Page, error) {
	// Verify page exists and belongs to user
	existing, err := s.pageRepo.GetPageByID(ctx, userID, pageID)
	if err != nil {
		return nil, fmt.Errorf("failed to verify page: %w", err)
	}
	if existing == nil {
		return nil, fmt.Errorf("page not found")
	}

	// Validate content is valid JSON if provided
	if content, ok := updates["content"]; ok {
		switch v := content.(type) {
		case json.RawMessage:
			if !json.Valid(v) {
				return nil, fmt.Errorf("content must be valid JSON")
			}
		case []byte:
			if !json.Valid(v) {
				return nil, fmt.Errorf("content must be valid JSON")
			}
		}
	}

	page, err := s.pageRepo.UpdatePage(ctx, userID, pageID, updates)
	if err != nil {
		return nil, fmt.Errorf("failed to update page: %w", err)
	}
	if page == nil {
		return nil, fmt.Errorf("page not found after update")
	}
	return page, nil
}

func (s *pageService) DeletePage(ctx context.Context, userID, pageID uuid.UUID) error {
	// Verify page exists and belongs to user
	existing, err := s.pageRepo.GetPageByID(ctx, userID, pageID)
	if err != nil {
		return fmt.Errorf("failed to verify page: %w", err)
	}
	if existing == nil {
		return fmt.Errorf("page not found")
	}

	if err := s.pageRepo.DeletePage(ctx, userID, pageID); err != nil {
		return fmt.Errorf("failed to delete page: %w", err)
	}
	return nil
}
