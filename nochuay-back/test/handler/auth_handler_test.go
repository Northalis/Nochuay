package handler_tests

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/Northalis/Nochuay/nochuay-back/internal/handler"
	"github.com/Northalis/Nochuay/nochuay-back/internal/handler/response"
	"github.com/Northalis/Nochuay/nochuay-back/internal/model"
	"github.com/google/uuid"
)

// ── Helpers ──────────────────────────────────────────────────

func decodeResponse(t *testing.T, body *bytes.Buffer) response.Response {
	t.Helper()
	var resp response.Response
	if err := json.NewDecoder(body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response body: %v", err)
	}
	return resp
}

// ── POST /auth/signup ───────────────────────────────────────

func TestSignup_Success(t *testing.T) {
	testUser := &model.User{
		ID:        uuid.New(),
		Email:     "test@example.com",
		CreatedAt: time.Now(),
	}

	mock := &MockAuthService{
		SignupFn: func(_ context.Context, email, password string) (string, *model.User, error) {
			return "jwt-token-123", testUser, nil
		},
	}

	h := handler.NewAuthHandler(mock)

	reqBody := `{"email":"test@example.com","password":"password123"}`
	req := httptest.NewRequest(http.MethodPost, "/api/auth/signup", bytes.NewBufferString(reqBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	h.Signup(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d", w.Code)
	}

	resp := decodeResponse(t, w.Body)
	if resp.Error != nil {
		t.Fatalf("expected no error, got: %s", *resp.Error)
	}

	dataMap, ok := resp.Data.(map[string]interface{})
	if !ok {
		t.Fatalf("expected data to be a map, got %T", resp.Data)
	}
	if dataMap["token"] != "jwt-token-123" {
		t.Errorf("expected token 'jwt-token-123', got '%v'", dataMap["token"])
	}
}

func TestSignup_EmptyEmail(t *testing.T) {
	mock := &MockAuthService{}
	h := handler.NewAuthHandler(mock)

	reqBody := `{"email":"","password":"password123"}`
	req := httptest.NewRequest(http.MethodPost, "/api/auth/signup", bytes.NewBufferString(reqBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	h.Signup(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}

	resp := decodeResponse(t, w.Body)
	if resp.Error == nil {
		t.Fatal("expected error response")
	}
	if *resp.Error != "email and password are required" {
		t.Errorf("expected 'email and password are required', got '%s'", *resp.Error)
	}
}

func TestSignup_EmptyPassword(t *testing.T) {
	mock := &MockAuthService{}
	h := handler.NewAuthHandler(mock)

	reqBody := `{"email":"test@example.com","password":""}`
	req := httptest.NewRequest(http.MethodPost, "/api/auth/signup", bytes.NewBufferString(reqBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	h.Signup(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}
}

func TestSignup_ShortPassword(t *testing.T) {
	mock := &MockAuthService{}
	h := handler.NewAuthHandler(mock)

	reqBody := `{"email":"test@example.com","password":"abc"}`
	req := httptest.NewRequest(http.MethodPost, "/api/auth/signup", bytes.NewBufferString(reqBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	h.Signup(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}

	resp := decodeResponse(t, w.Body)
	if resp.Error == nil || *resp.Error != "password must be at least 6 characters" {
		t.Errorf("expected password length error, got '%v'", resp.Error)
	}
}

func TestSignup_InvalidEmailFormat(t *testing.T) {
	mock := &MockAuthService{}
	h := handler.NewAuthHandler(mock)

	reqBody := `{"email":"not-an-email","password":"password123"}`
	req := httptest.NewRequest(http.MethodPost, "/api/auth/signup", bytes.NewBufferString(reqBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	h.Signup(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}

	resp := decodeResponse(t, w.Body)
	if resp.Error == nil || *resp.Error != "invalid email format" {
		t.Errorf("expected 'invalid email format', got '%v'", resp.Error)
	}
}

func TestSignup_DuplicateEmail(t *testing.T) {
	mock := &MockAuthService{
		SignupFn: func(_ context.Context, email, password string) (string, *model.User, error) {
			return "", nil, fmt.Errorf("user with this email already exists")
		},
	}
	h := handler.NewAuthHandler(mock)

	reqBody := `{"email":"existing@example.com","password":"password123"}`
	req := httptest.NewRequest(http.MethodPost, "/api/auth/signup", bytes.NewBufferString(reqBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	h.Signup(w, req)

	if w.Code != http.StatusConflict {
		t.Fatalf("expected status 409, got %d", w.Code)
	}
}

func TestSignup_InvalidJSON(t *testing.T) {
	mock := &MockAuthService{}
	h := handler.NewAuthHandler(mock)

	req := httptest.NewRequest(http.MethodPost, "/api/auth/signup", bytes.NewBufferString(`{invalid`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	h.Signup(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}
}

// ── POST /auth/login ────────────────────────────────────────

func TestLogin_Success(t *testing.T) {
	testUser := &model.User{
		ID:        uuid.New(),
		Email:     "test@example.com",
		CreatedAt: time.Now(),
	}

	mock := &MockAuthService{
		LoginFn: func(_ context.Context, email, password string) (string, *model.User, error) {
			return "jwt-token-456", testUser, nil
		},
	}
	h := handler.NewAuthHandler(mock)

	reqBody := `{"email":"test@example.com","password":"password123"}`
	req := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBufferString(reqBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	h.Login(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	resp := decodeResponse(t, w.Body)
	if resp.Error != nil {
		t.Fatalf("expected no error, got: %s", *resp.Error)
	}

	dataMap, ok := resp.Data.(map[string]interface{})
	if !ok {
		t.Fatalf("expected data to be a map, got %T", resp.Data)
	}
	if dataMap["token"] != "jwt-token-456" {
		t.Errorf("expected token 'jwt-token-456', got '%v'", dataMap["token"])
	}
}

func TestLogin_EmptyCredentials(t *testing.T) {
	mock := &MockAuthService{}
	h := handler.NewAuthHandler(mock)

	reqBody := `{"email":"","password":""}`
	req := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBufferString(reqBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	h.Login(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}
}

func TestLogin_InvalidCredentials(t *testing.T) {
	mock := &MockAuthService{
		LoginFn: func(_ context.Context, email, password string) (string, *model.User, error) {
			return "", nil, fmt.Errorf("invalid email or password")
		},
	}
	h := handler.NewAuthHandler(mock)

	reqBody := `{"email":"test@example.com","password":"wrongpassword"}`
	req := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBufferString(reqBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	h.Login(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", w.Code)
	}
}

func TestLogin_InvalidJSON(t *testing.T) {
	mock := &MockAuthService{}
	h := handler.NewAuthHandler(mock)

	req := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBufferString(`not-json`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	h.Login(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}
}

func TestLogin_ServiceInternalError(t *testing.T) {
	mock := &MockAuthService{
		LoginFn: func(_ context.Context, email, password string) (string, *model.User, error) {
			return "", nil, fmt.Errorf("database connection lost")
		},
	}
	h := handler.NewAuthHandler(mock)

	reqBody := `{"email":"test@example.com","password":"password123"}`
	req := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBufferString(reqBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	h.Login(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected status 500, got %d", w.Code)
	}
}

// ── PATCH /auth/account/email ───────────────────────────────

func TestUpdateAccountEmail_Success(t *testing.T) {
	userID := uuid.New()
	updatedUser := &model.User{
		ID:        userID,
		Email:     "new@example.com",
		CreatedAt: time.Now(),
	}

	mock := &MockAuthService{
		UpdateAccountEmailFn: func(_ context.Context, gotUserID uuid.UUID, currentPassword, newEmail string) (*model.User, error) {
			if gotUserID != userID {
				t.Fatalf("expected userID %s, got %s", userID, gotUserID)
			}
			if currentPassword != "password123" {
				t.Fatalf("expected currentPassword password123, got %s", currentPassword)
			}
			if newEmail != "new@example.com" {
				t.Fatalf("expected newEmail new@example.com, got %s", newEmail)
			}

			return updatedUser, nil
		},
	}

	h := handler.NewAuthHandler(mock)
	req := httptest.NewRequest(http.MethodPatch, "/api/auth/account/email", bytes.NewBufferString(`{"currentPassword":"password123","newEmail":"new@example.com"}`))
	req.Header.Set("Content-Type", "application/json")
	req = injectUserID(req, userID)

	w := httptest.NewRecorder()
	h.UpdateAccountEmail(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d; body: %s", w.Code, w.Body.String())
	}
}

func TestUpdateAccountEmail_Unauthorized(t *testing.T) {
	mock := &MockAuthService{}
	h := handler.NewAuthHandler(mock)

	req := httptest.NewRequest(http.MethodPatch, "/api/auth/account/email", bytes.NewBufferString(`{"currentPassword":"password123","newEmail":"new@example.com"}`))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	h.UpdateAccountEmail(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", w.Code)
	}
}

func TestUpdateAccountEmail_Conflict(t *testing.T) {
	mock := &MockAuthService{
		UpdateAccountEmailFn: func(_ context.Context, _ uuid.UUID, _, _ string) (*model.User, error) {
			return nil, fmt.Errorf("user with this email already exists")
		},
	}

	h := handler.NewAuthHandler(mock)
	req := httptest.NewRequest(http.MethodPatch, "/api/auth/account/email", bytes.NewBufferString(`{"currentPassword":"password123","newEmail":"existing@example.com"}`))
	req.Header.Set("Content-Type", "application/json")
	req = injectUserID(req, uuid.New())

	w := httptest.NewRecorder()
	h.UpdateAccountEmail(w, req)

	if w.Code != http.StatusConflict {
		t.Fatalf("expected status 409, got %d", w.Code)
	}
}

func TestUpdateAccountEmail_InvalidCurrentPassword(t *testing.T) {
	mock := &MockAuthService{
		UpdateAccountEmailFn: func(_ context.Context, _ uuid.UUID, _, _ string) (*model.User, error) {
			return nil, fmt.Errorf("invalid current password")
		},
	}

	h := handler.NewAuthHandler(mock)
	req := httptest.NewRequest(http.MethodPatch, "/api/auth/account/email", bytes.NewBufferString(`{"currentPassword":"wrong","newEmail":"new@example.com"}`))
	req.Header.Set("Content-Type", "application/json")
	req = injectUserID(req, uuid.New())

	w := httptest.NewRecorder()
	h.UpdateAccountEmail(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", w.Code)
	}
}

// ── PATCH /auth/account/password ────────────────────────────

func TestUpdateAccountPassword_Success(t *testing.T) {
	userID := uuid.New()

	mock := &MockAuthService{
		UpdateAccountPasswordFn: func(_ context.Context, gotUserID uuid.UUID, currentPassword, newPassword string) error {
			if gotUserID != userID {
				t.Fatalf("expected userID %s, got %s", userID, gotUserID)
			}
			if currentPassword != "password123" {
				t.Fatalf("expected currentPassword password123, got %s", currentPassword)
			}
			if newPassword != "newPassword123" {
				t.Fatalf("expected newPassword newPassword123, got %s", newPassword)
			}

			return nil
		},
	}

	h := handler.NewAuthHandler(mock)
	req := httptest.NewRequest(http.MethodPatch, "/api/auth/account/password", bytes.NewBufferString(`{"currentPassword":"password123","newPassword":"newPassword123"}`))
	req.Header.Set("Content-Type", "application/json")
	req = injectUserID(req, userID)

	w := httptest.NewRecorder()
	h.UpdateAccountPassword(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d; body: %s", w.Code, w.Body.String())
	}
}

func TestUpdateAccountPassword_InvalidCurrentPassword(t *testing.T) {
	mock := &MockAuthService{
		UpdateAccountPasswordFn: func(_ context.Context, _ uuid.UUID, _, _ string) error {
			return fmt.Errorf("invalid current password")
		},
	}

	h := handler.NewAuthHandler(mock)
	req := httptest.NewRequest(http.MethodPatch, "/api/auth/account/password", bytes.NewBufferString(`{"currentPassword":"wrong","newPassword":"newPassword123"}`))
	req.Header.Set("Content-Type", "application/json")
	req = injectUserID(req, uuid.New())

	w := httptest.NewRecorder()
	h.UpdateAccountPassword(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", w.Code)
	}
}

func TestUpdateAccountPassword_Validation(t *testing.T) {
	mock := &MockAuthService{}
	h := handler.NewAuthHandler(mock)

	req := httptest.NewRequest(http.MethodPatch, "/api/auth/account/password", bytes.NewBufferString(`{"currentPassword":"123","newPassword":"abc"}`))
	req.Header.Set("Content-Type", "application/json")
	req = injectUserID(req, uuid.New())

	w := httptest.NewRecorder()
	h.UpdateAccountPassword(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}
}
