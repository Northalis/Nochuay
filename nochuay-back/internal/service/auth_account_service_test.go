package service

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/Northalis/Nochuay/nochuay-back/internal/model"
	"github.com/google/uuid"
)

type mockUserRepository struct {
	CreateUserFn          func(ctx context.Context, email, passwordHash string) (*model.User, error)
	GetUserByEmailFn      func(ctx context.Context, email string) (*model.User, error)
	GetUserByIDFn         func(ctx context.Context, id uuid.UUID) (*model.User, error)
	UpdateUserEmailFn     func(ctx context.Context, id uuid.UUID, newEmail string) (*model.User, error)
	UpdateUserPasswordFn  func(ctx context.Context, id uuid.UUID, passwordHash string) error
}

func (m *mockUserRepository) CreateUser(ctx context.Context, email, passwordHash string) (*model.User, error) {
	if m.CreateUserFn == nil {
		return nil, nil
	}
	return m.CreateUserFn(ctx, email, passwordHash)
}

func (m *mockUserRepository) GetUserByEmail(ctx context.Context, email string) (*model.User, error) {
	if m.GetUserByEmailFn == nil {
		return nil, nil
	}
	return m.GetUserByEmailFn(ctx, email)
}

func (m *mockUserRepository) GetUserByID(ctx context.Context, id uuid.UUID) (*model.User, error) {
	if m.GetUserByIDFn == nil {
		return nil, nil
	}
	return m.GetUserByIDFn(ctx, id)
}

func (m *mockUserRepository) UpdateUserEmail(ctx context.Context, id uuid.UUID, newEmail string) (*model.User, error) {
	if m.UpdateUserEmailFn == nil {
		return nil, nil
	}
	return m.UpdateUserEmailFn(ctx, id, newEmail)
}

func (m *mockUserRepository) UpdateUserPasswordHash(ctx context.Context, id uuid.UUID, passwordHash string) error {
	if m.UpdateUserPasswordFn == nil {
		return nil
	}
	return m.UpdateUserPasswordFn(ctx, id, passwordHash)
}

func TestUpdateAccountEmail_Success(t *testing.T) {
	ctx := context.Background()
	userID := uuid.New()
	currentHash, err := hashPassword("password123")
	if err != nil {
		t.Fatalf("failed to hash current password: %v", err)
	}

	mockRepo := &mockUserRepository{
		GetUserByIDFn: func(_ context.Context, id uuid.UUID) (*model.User, error) {
			return &model.User{ID: id, Email: "old@example.com", PasswordHash: currentHash, CreatedAt: time.Now()}, nil
		},
		GetUserByEmailFn: func(_ context.Context, email string) (*model.User, error) {
			if email != "new@example.com" {
				t.Fatalf("expected email new@example.com, got %s", email)
			}
			return nil, nil
		},
		UpdateUserEmailFn: func(_ context.Context, id uuid.UUID, newEmail string) (*model.User, error) {
			return &model.User{ID: id, Email: newEmail, PasswordHash: currentHash, CreatedAt: time.Now()}, nil
		},
	}

	svc := NewAuthService(mockRepo, "test-secret")
	updatedUser, err := svc.UpdateAccountEmail(ctx, userID, "password123", "new@example.com")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if updatedUser == nil {
		t.Fatal("expected updated user, got nil")
	}
	if updatedUser.Email != "new@example.com" {
		t.Fatalf("expected updated email new@example.com, got %s", updatedUser.Email)
	}
}

func TestUpdateAccountEmail_Conflict(t *testing.T) {
	ctx := context.Background()
	userID := uuid.New()
	currentHash, err := hashPassword("password123")
	if err != nil {
		t.Fatalf("failed to hash current password: %v", err)
	}

	mockRepo := &mockUserRepository{
		GetUserByIDFn: func(_ context.Context, id uuid.UUID) (*model.User, error) {
			return &model.User{ID: id, Email: "old@example.com", PasswordHash: currentHash, CreatedAt: time.Now()}, nil
		},
		GetUserByEmailFn: func(_ context.Context, _ string) (*model.User, error) {
			return &model.User{ID: uuid.New(), Email: "new@example.com", CreatedAt: time.Now()}, nil
		},
	}

	svc := NewAuthService(mockRepo, "test-secret")
	_, err = svc.UpdateAccountEmail(ctx, userID, "password123", "new@example.com")
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !strings.Contains(err.Error(), "already exists") {
		t.Fatalf("expected already exists error, got %v", err)
	}
}

func TestUpdateAccountEmail_InvalidCurrentPassword(t *testing.T) {
	ctx := context.Background()
	userID := uuid.New()
	currentHash, err := hashPassword("password123")
	if err != nil {
		t.Fatalf("failed to hash current password: %v", err)
	}

	mockRepo := &mockUserRepository{
		GetUserByIDFn: func(_ context.Context, id uuid.UUID) (*model.User, error) {
			return &model.User{ID: id, Email: "old@example.com", PasswordHash: currentHash, CreatedAt: time.Now()}, nil
		},
	}

	svc := NewAuthService(mockRepo, "test-secret")
	_, err = svc.UpdateAccountEmail(ctx, userID, "wrong-password", "new@example.com")
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !strings.Contains(err.Error(), "invalid current password") {
		t.Fatalf("expected invalid current password error, got %v", err)
	}
}

func TestUpdateAccountPassword_Success(t *testing.T) {
	ctx := context.Background()
	userID := uuid.New()
	currentHash, err := hashPassword("password123")
	if err != nil {
		t.Fatalf("failed to hash current password: %v", err)
	}

	capturedHash := ""
	mockRepo := &mockUserRepository{
		GetUserByIDFn: func(_ context.Context, id uuid.UUID) (*model.User, error) {
			return &model.User{ID: id, Email: "test@example.com", PasswordHash: currentHash, CreatedAt: time.Now()}, nil
		},
		UpdateUserPasswordFn: func(_ context.Context, id uuid.UUID, passwordHash string) error {
			if id != userID {
				t.Fatalf("expected userID %s, got %s", userID, id)
			}
			capturedHash = passwordHash
			return nil
		},
	}

	svc := NewAuthService(mockRepo, "test-secret")
	err = svc.UpdateAccountPassword(ctx, userID, "password123", "newPassword123")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if capturedHash == "" {
		t.Fatal("expected password hash to be updated")
	}
	if !verifyPassword("newPassword123", capturedHash) {
		t.Fatal("expected captured hash to match new password")
	}
}

func TestUpdateAccountPassword_InvalidCurrentPassword(t *testing.T) {
	ctx := context.Background()
	userID := uuid.New()
	currentHash, err := hashPassword("password123")
	if err != nil {
		t.Fatalf("failed to hash current password: %v", err)
	}

	mockRepo := &mockUserRepository{
		GetUserByIDFn: func(_ context.Context, id uuid.UUID) (*model.User, error) {
			return &model.User{ID: id, Email: "test@example.com", PasswordHash: currentHash, CreatedAt: time.Now()}, nil
		},
	}

	svc := NewAuthService(mockRepo, "test-secret")
	err = svc.UpdateAccountPassword(ctx, userID, "wrong-password", "newPassword123")
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !strings.Contains(err.Error(), "invalid current password") {
		t.Fatalf("expected invalid current password error, got %v", err)
	}
}
