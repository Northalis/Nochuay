package handler_tests

import (
	"context"
	"encoding/json"

	"github.com/Northalis/Nochuay/nochuay-back/internal/model"
	"github.com/google/uuid"
)

// ── Mock AuthService ────────────────────────────────────────

type MockAuthService struct {
	SignupFn                func(ctx context.Context, email, password string) (string, *model.User, error)
	LoginFn                 func(ctx context.Context, email, password string) (string, *model.User, error)
	UpdateAccountEmailFn    func(ctx context.Context, userID uuid.UUID, currentPassword, newEmail string) (*model.User, error)
	UpdateAccountPasswordFn func(ctx context.Context, userID uuid.UUID, currentPassword, newPassword string) error
	ValidateTokenFn         func(tokenString string) (uuid.UUID, error)
}

func (m *MockAuthService) Signup(ctx context.Context, email, password string) (string, *model.User, error) {
	return m.SignupFn(ctx, email, password)
}

func (m *MockAuthService) Login(ctx context.Context, email, password string) (string, *model.User, error) {
	return m.LoginFn(ctx, email, password)
}

func (m *MockAuthService) UpdateAccountEmail(ctx context.Context, userID uuid.UUID, currentPassword, newEmail string) (*model.User, error) {
	return m.UpdateAccountEmailFn(ctx, userID, currentPassword, newEmail)
}

func (m *MockAuthService) UpdateAccountPassword(ctx context.Context, userID uuid.UUID, currentPassword, newPassword string) error {
	return m.UpdateAccountPasswordFn(ctx, userID, currentPassword, newPassword)
}

func (m *MockAuthService) ValidateToken(tokenString string) (uuid.UUID, error) {
	return m.ValidateTokenFn(tokenString)
}

// ── Mock PageService ────────────────────────────────────────

type MockPageService struct {
	CreatePageFn     func(ctx context.Context, userID uuid.UUID, parentID *uuid.UUID, title string) (*model.Page, error)
	GetPageFn        func(ctx context.Context, userID, pageID uuid.UUID) (*model.Page, error)
	UpdatePageFn     func(ctx context.Context, userID, pageID uuid.UUID, updates map[string]any) (*model.Page, error)
	DeletePageFn     func(ctx context.Context, userID, pageID uuid.UUID) error
	GetSidebarTreeFn func(ctx context.Context, userID uuid.UUID) ([]model.PageNode, error)
	SearchPagesFn    func(ctx context.Context, userID uuid.UUID, query string, limit int) ([]model.PageSearchResult, error)
	SaveContentFn    func(ctx context.Context, userID, pageID uuid.UUID, content json.RawMessage) (*model.Page, error)
	GetContentFn     func(ctx context.Context, userID, pageID uuid.UUID) (json.RawMessage, error)
}

func (m *MockPageService) CreatePage(ctx context.Context, userID uuid.UUID, parentID *uuid.UUID, title string) (*model.Page, error) {
	return m.CreatePageFn(ctx, userID, parentID, title)
}

func (m *MockPageService) GetPage(ctx context.Context, userID, pageID uuid.UUID) (*model.Page, error) {
	return m.GetPageFn(ctx, userID, pageID)
}

func (m *MockPageService) UpdatePage(ctx context.Context, userID, pageID uuid.UUID, updates map[string]any) (*model.Page, error) {
	return m.UpdatePageFn(ctx, userID, pageID, updates)
}

func (m *MockPageService) DeletePage(ctx context.Context, userID, pageID uuid.UUID) error {
	return m.DeletePageFn(ctx, userID, pageID)
}

func (m *MockPageService) GetSidebarTree(ctx context.Context, userID uuid.UUID) ([]model.PageNode, error) {
	return m.GetSidebarTreeFn(ctx, userID)
}

func (m *MockPageService) SearchPages(ctx context.Context, userID uuid.UUID, query string, limit int) ([]model.PageSearchResult, error) {
	return m.SearchPagesFn(ctx, userID, query, limit)
}

func (m *MockPageService) SaveContent(ctx context.Context, userID, pageID uuid.UUID, content json.RawMessage) (*model.Page, error) {
	return m.SaveContentFn(ctx, userID, pageID, content)
}

func (m *MockPageService) GetContent(ctx context.Context, userID, pageID uuid.UUID) (json.RawMessage, error) {
	return m.GetContentFn(ctx, userID, pageID)
}
