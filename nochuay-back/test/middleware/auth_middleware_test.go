package middleware_tests

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Northalis/Nochuay/nochuay-back/internal/middleware"
	"github.com/Northalis/Nochuay/nochuay-back/internal/model"
	"github.com/google/uuid"
)

// ── Mock AuthService for middleware tests ────────────────────

type MockAuthService struct {
	ValidateTokenFn func(tokenString string) (uuid.UUID, error)
}

func (m *MockAuthService) Signup(_ context.Context, _, _ string) (string, *model.User, error) {
	return "", nil, nil
}
func (m *MockAuthService) Login(_ context.Context, _, _ string) (string, *model.User, error) {
	return "", nil, nil
}
func (m *MockAuthService) ValidateToken(tokenString string) (uuid.UUID, error) {
	return m.ValidateTokenFn(tokenString)
}

// ── Middleware Tests ─────────────────────────────────────────

func TestAuth_MissingAuthorizationHeader(t *testing.T) {
	mock := &MockAuthService{}
	mw := middleware.Auth(mock)

	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("handler should not be called without auth header")
	}))

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", w.Code)
	}

	var resp struct {
		Error *string `json:"error"`
	}
	json.NewDecoder(w.Body).Decode(&resp)
	if resp.Error == nil || *resp.Error != "authorization header is required" {
		t.Errorf("unexpected error message: %v", resp.Error)
	}
}

func TestAuth_InvalidHeaderFormat(t *testing.T) {
	mock := &MockAuthService{}
	mw := middleware.Auth(mock)

	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("handler should not be called with invalid header format")
	}))

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "InvalidFormat token123")
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", w.Code)
	}
}

func TestAuth_InvalidToken(t *testing.T) {
	mock := &MockAuthService{
		ValidateTokenFn: func(_ string) (uuid.UUID, error) {
			return uuid.Nil, fmt.Errorf("invalid token")
		},
	}
	mw := middleware.Auth(mock)

	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("handler should not be called with invalid token")
	}))

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer invalid-jwt-token")
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", w.Code)
	}
}

func TestAuth_ValidToken(t *testing.T) {
	expectedUserID := uuid.New()

	mock := &MockAuthService{
		ValidateTokenFn: func(_ string) (uuid.UUID, error) {
			return expectedUserID, nil
		},
	}
	mw := middleware.Auth(mock)

	handlerCalled := false
	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handlerCalled = true

		userID, ok := middleware.GetUserID(r.Context())
		if !ok {
			t.Fatal("userID not found in context")
		}
		if userID != expectedUserID {
			t.Errorf("expected userID %s, got %s", expectedUserID, userID)
		}

		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer valid-jwt-token")
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	if !handlerCalled {
		t.Fatal("handler was not called despite valid token")
	}
	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}
}

func TestAuth_BearerOnly_NoToken(t *testing.T) {
	mock := &MockAuthService{}
	mw := middleware.Auth(mock)

	handler := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("handler should not be called")
	}))

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer")
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, req)

	// "Bearer" without a space+token is actually "Bearer" as one part
	// SplitN(" ", 2) gives ["Bearer"] so len(parts)=1 => should fail
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", w.Code)
	}
}

// ── GetUserID Tests ─────────────────────────────────────────

func TestGetUserID_NotPresent(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	_, ok := middleware.GetUserID(req.Context())
	if ok {
		t.Fatal("expected GetUserID to return false when no userID in context")
	}
}
