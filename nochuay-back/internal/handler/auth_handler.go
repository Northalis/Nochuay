package handler

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/Northalis/Nochuay/nochuay-back/internal/handler/response"
	"github.com/Northalis/Nochuay/nochuay-back/internal/middleware"
	"github.com/Northalis/Nochuay/nochuay-back/internal/service"
)

// AuthHandler handles authentication HTTP requests.
type AuthHandler struct {
	authService service.AuthService
}

// NewAuthHandler creates a new AuthHandler.
func NewAuthHandler(authService service.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

type signupRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type authResponse struct {
	Token string `json:"token"`
	User  any    `json:"user"`
}

type updateAccountEmailRequest struct {
	CurrentPassword string `json:"currentPassword"`
	NewEmail        string `json:"newEmail"`
}

type updateAccountPasswordRequest struct {
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
}

// Signup handles POST /auth/signup.
func (h *AuthHandler) Signup(w http.ResponseWriter, r *http.Request) {
	var req signupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Validate input
	req.Email = strings.TrimSpace(req.Email)
	if req.Email == "" || req.Password == "" {
		response.Error(w, http.StatusBadRequest, "email and password are required")
		return
	}
	if len(req.Password) < 6 {
		response.Error(w, http.StatusBadRequest, "password must be at least 6 characters")
		return
	}
	if !strings.Contains(req.Email, "@") {
		response.Error(w, http.StatusBadRequest, "invalid email format")
		return
	}

	token, user, err := h.authService.Signup(r.Context(), req.Email, req.Password)
	if err != nil {
		if strings.Contains(err.Error(), "already exists") {
			response.Error(w, http.StatusConflict, "user with this email already exists")
			return
		}
		response.Error(w, http.StatusInternalServerError, "failed to create user")
		return
	}

	response.JSON(w, http.StatusCreated, authResponse{
		Token: token,
		User:  user,
	})
}

// Login handles POST /auth/login.
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	req.Email = strings.TrimSpace(req.Email)
	if req.Email == "" || req.Password == "" {
		response.Error(w, http.StatusBadRequest, "email and password are required")
		return
	}

	token, user, err := h.authService.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		if strings.Contains(err.Error(), "invalid email or password") {
			response.Error(w, http.StatusUnauthorized, "invalid email or password")
			return
		}
		response.Error(w, http.StatusInternalServerError, "login failed")
		return
	}

	response.JSON(w, http.StatusOK, authResponse{
		Token: token,
		User:  user,
	})
}

// UpdateAccountEmail handles PATCH /auth/account/email.
func (h *AuthHandler) UpdateAccountEmail(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req updateAccountEmailRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	req.NewEmail = strings.TrimSpace(req.NewEmail)
	if req.NewEmail == "" || req.CurrentPassword == "" {
		response.Error(w, http.StatusBadRequest, "newEmail and currentPassword are required")
		return
	}
	if !strings.Contains(req.NewEmail, "@") {
		response.Error(w, http.StatusBadRequest, "invalid email format")
		return
	}

	updatedUser, err := h.authService.UpdateAccountEmail(r.Context(), userID, req.CurrentPassword, req.NewEmail)
	if err != nil {
		errMsg := err.Error()
		switch {
		case strings.Contains(errMsg, "invalid current password"):
			response.Error(w, http.StatusUnauthorized, "invalid current password")
		case strings.Contains(errMsg, "already exists"):
			response.Error(w, http.StatusConflict, "user with this email already exists")
		case strings.Contains(errMsg, "user not found"):
			response.Error(w, http.StatusNotFound, "user not found")
		default:
			response.Error(w, http.StatusInternalServerError, "failed to update account email")
		}
		return
	}

	response.JSON(w, http.StatusOK, updatedUser)
}

// UpdateAccountPassword handles PATCH /auth/account/password.
func (h *AuthHandler) UpdateAccountPassword(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req updateAccountPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.CurrentPassword == "" || req.NewPassword == "" {
		response.Error(w, http.StatusBadRequest, "currentPassword and newPassword are required")
		return
	}
	if len(req.NewPassword) < 6 {
		response.Error(w, http.StatusBadRequest, "newPassword must be at least 6 characters")
		return
	}

	err := h.authService.UpdateAccountPassword(r.Context(), userID, req.CurrentPassword, req.NewPassword)
	if err != nil {
		errMsg := err.Error()
		switch {
		case strings.Contains(errMsg, "invalid current password"):
			response.Error(w, http.StatusUnauthorized, "invalid current password")
		case strings.Contains(errMsg, "user not found"):
			response.Error(w, http.StatusNotFound, "user not found")
		default:
			response.Error(w, http.StatusInternalServerError, "failed to update account password")
		}
		return
	}

	response.JSON(w, http.StatusOK, map[string]bool{"success": true})
}
