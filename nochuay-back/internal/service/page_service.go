package service

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/Northalis/Nochuay/nochuay-back/internal/model"
	"github.com/Northalis/Nochuay/nochuay-back/internal/repository"
	"github.com/google/uuid"
)

// PageService defines the interface for page business logic.
type PageService interface {
	CreatePage(ctx context.Context, userID uuid.UUID, parentID *uuid.UUID, title string) (*model.Page, error)
	GetPage(ctx context.Context, userID, pageID uuid.UUID) (*model.Page, error)
	UpdatePage(ctx context.Context, userID, pageID uuid.UUID, updates map[string]any) (*model.Page, error)
	DeletePage(ctx context.Context, userID, pageID uuid.UUID) error
	RestorePage(ctx context.Context, userID, pageID uuid.UUID) error
	DeletePagePermanently(ctx context.Context, userID, pageID uuid.UUID) error
	GetSidebarTree(ctx context.Context, userID uuid.UUID) ([]model.PageNode, error)
	GetTrash(ctx context.Context, userID uuid.UUID) ([]model.PageTrashItem, error)
	SearchPages(ctx context.Context, userID uuid.UUID, query string, limit int) ([]model.PageSearchResult, error)
	SaveContent(ctx context.Context, userID, pageID uuid.UUID, content json.RawMessage) (*model.Page, error)
	GetContent(ctx context.Context, userID, pageID uuid.UUID) (json.RawMessage, error)
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

	if err := s.pageRepo.SoftDeletePageSubtree(ctx, userID, pageID); err != nil {
		return fmt.Errorf("failed to delete page: %w", err)
	}
	return nil
}

func (s *pageService) RestorePage(ctx context.Context, userID, pageID uuid.UUID) error {
	existing, err := s.pageRepo.GetTrashedPageByID(ctx, userID, pageID)
	if err != nil {
		return fmt.Errorf("failed to verify trashed page: %w", err)
	}
	if existing == nil {
		return fmt.Errorf("page not found")
	}

	if err := s.pageRepo.RestorePageSubtree(ctx, userID, pageID); err != nil {
		return fmt.Errorf("failed to restore page: %w", err)
	}
	return nil
}

func (s *pageService) DeletePagePermanently(ctx context.Context, userID, pageID uuid.UUID) error {
	existing, err := s.pageRepo.GetTrashedPageByID(ctx, userID, pageID)
	if err != nil {
		return fmt.Errorf("failed to verify trashed page: %w", err)
	}
	if existing == nil {
		return fmt.Errorf("page not found")
	}

	if err := s.pageRepo.DeletePagePermanently(ctx, userID, pageID); err != nil {
		return fmt.Errorf("failed to permanently delete page: %w", err)
	}
	return nil
}

// SaveContent validates and saves editor content (BlockNote JSON array) to a page.
func (s *pageService) SaveContent(ctx context.Context, userID, pageID uuid.UUID, content json.RawMessage) (*model.Page, error) {
	// Validate the content is a valid JSON array
	if !json.Valid(content) {
		return nil, fmt.Errorf("content must be valid JSON")
	}

	// Ensure content is a JSON array (BlockNote stores blocks as an array)
	var arr []json.RawMessage
	if err := json.Unmarshal(content, &arr); err != nil {
		return nil, fmt.Errorf("content must be a JSON array of blocks")
	}

	page, err := s.pageRepo.SaveContent(ctx, userID, pageID, content)
	if err != nil {
		return nil, fmt.Errorf("failed to save content: %w", err)
	}
	if page == nil {
		return nil, fmt.Errorf("page not found")
	}
	return page, nil
}

// GetContent returns just the editor content for a page.
func (s *pageService) GetContent(ctx context.Context, userID, pageID uuid.UUID) (json.RawMessage, error) {
	content, err := s.pageRepo.GetContent(ctx, userID, pageID)
	if err != nil {
		return nil, fmt.Errorf("failed to get content: %w", err)
	}
	if content == nil {
		return nil, fmt.Errorf("page not found")
	}
	return content, nil
}

// GetSidebarTree fetches all pages for a user and constructs a nested tree.
func (s *pageService) GetSidebarTree(ctx context.Context, userID uuid.UUID) ([]model.PageNode, error) {
	pages, err := s.pageRepo.GetPagesByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get pages: %w", err)
	}
	return BuildTree(pages), nil
}

func (s *pageService) GetTrash(ctx context.Context, userID uuid.UUID) ([]model.PageTrashItem, error) {
	items, err := s.pageRepo.GetTrashedPages(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get trash: %w", err)
	}
	return items, nil
}

func (s *pageService) SearchPages(ctx context.Context, userID uuid.UUID, query string, limit int) ([]model.PageSearchResult, error) {
	normalizedQuery := strings.TrimSpace(query)
	if normalizedQuery == "" {
		return nil, fmt.Errorf("search query is required")
	}

	if limit <= 0 || limit > 50 {
		limit = 25
	}

	results, err := s.pageRepo.SearchPagesByTitle(ctx, userID, normalizedQuery, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to search pages: %w", err)
	}

	return results, nil
}

// BuildTree constructs a nested PageNode tree from a flat list of pages.
// Exported for unit testing.
func BuildTree(pages []model.Page) []model.PageNode {
	if len(pages) == 0 {
		return []model.PageNode{}
	}

	// Create a map of ID -> *treeNode using pointers for mutable children
	type treeNode struct {
		page     model.Page
		children []*treeNode
	}

	nodeMap := make(map[uuid.UUID]*treeNode, len(pages))
	for _, p := range pages {
		cp := p
		nodeMap[cp.ID] = &treeNode{page: cp}
	}

	// Build parent-child relationships via pointers
	var roots []*treeNode
	for _, p := range pages {
		node := nodeMap[p.ID]
		if p.ParentID == nil {
			roots = append(roots, node)
		} else if parent, exists := nodeMap[*p.ParentID]; exists {
			parent.children = append(parent.children, node)
		} else {
			// Orphan: parent not in list, treat as root
			roots = append(roots, node)
		}
	}

	// Recursively convert to PageNode values with depth
	var materialize func(nodes []*treeNode, depth int) []model.PageNode
	materialize = func(nodes []*treeNode, depth int) []model.PageNode {
		result := make([]model.PageNode, 0, len(nodes))
		for _, n := range nodes {
			pn := model.PageNode{
				Page:     n.page,
				Children: materialize(n.children, depth+1),
				Depth:    depth,
			}
			result = append(result, pn)
		}
		return result
	}

	return materialize(roots, 0)
}

// setDepths is no longer needed but kept for reference.
// Depth is now set during materialization.
