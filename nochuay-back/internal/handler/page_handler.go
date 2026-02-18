package handler

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"nochuay.app/api/internal/handler/response"
	"nochuay.app/api/internal/middleware"
	"nochuay.app/api/internal/service"
)

// PageHandler handles page-related HTTP requests.
type PageHandler struct {
	pageService service.PageService
}

// NewPageHandler creates a new PageHandler.
func NewPageHandler(pageService service.PageService) *PageHandler {
	return &PageHandler{pageService: pageService}
}

type createPageRequest struct {
	ParentID *string `json:"parentId"`
	Title    string  `json:"title"`
}

type updatePageRequest struct {
	Title   *string          `json:"title,omitempty"`
	Icon    *string          `json:"icon,omitempty"`
	Content *json.RawMessage `json:"content,omitempty"`
}

// CreatePage handles POST /pages.
func (h *PageHandler) CreatePage(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req createPageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	var parentID *uuid.UUID
	if req.ParentID != nil && *req.ParentID != "" {
		parsed, err := uuid.Parse(*req.ParentID)
		if err != nil {
			response.Error(w, http.StatusBadRequest, "invalid parentId format")
			return
		}
		parentID = &parsed
	}

	page, err := h.pageService.CreatePage(r.Context(), userID, parentID, req.Title)
	if err != nil {
		if strings.Contains(err.Error(), "parent page not found") {
			response.Error(w, http.StatusNotFound, "parent page not found")
			return
		}
		response.Error(w, http.StatusInternalServerError, "failed to create page")
		return
	}

	response.JSON(w, http.StatusCreated, page)
}

// GetPage handles GET /pages/{id}.
func (h *PageHandler) GetPage(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	pageID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid page id format")
		return
	}

	page, err := h.pageService.GetPage(r.Context(), userID, pageID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			response.Error(w, http.StatusNotFound, "page not found")
			return
		}
		response.Error(w, http.StatusInternalServerError, "failed to get page")
		return
	}

	response.JSON(w, http.StatusOK, page)
}

// UpdatePage handles PATCH /pages/{id}.
func (h *PageHandler) UpdatePage(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	pageID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid page id format")
		return
	}

	var req updatePageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Build updates map from non-nil fields
	updates := make(map[string]any)
	if req.Title != nil {
		updates["title"] = *req.Title
	}
	if req.Icon != nil {
		updates["icon"] = *req.Icon
	}
	if req.Content != nil {
		updates["content"] = *req.Content
	}

	if len(updates) == 0 {
		response.Error(w, http.StatusBadRequest, "no fields to update")
		return
	}

	page, err := h.pageService.UpdatePage(r.Context(), userID, pageID, updates)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			response.Error(w, http.StatusNotFound, "page not found")
			return
		}
		if strings.Contains(err.Error(), "valid JSON") {
			response.Error(w, http.StatusBadRequest, "content must be valid JSON")
			return
		}
		response.Error(w, http.StatusInternalServerError, "failed to update page")
		return
	}

	response.JSON(w, http.StatusOK, page)
}

// GetSidebar handles GET /pages/sidebar.
func (h *PageHandler) GetSidebar(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	tree, err := h.pageService.GetSidebarTree(r.Context(), userID)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to load sidebar")
		return
	}

	response.JSON(w, http.StatusOK, tree)
}

// DeletePage handles DELETE /pages/{id}.
func (h *PageHandler) DeletePage(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	pageID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		response.Error(w, http.StatusBadRequest, "invalid page id format")
		return
	}

	if err := h.pageService.DeletePage(r.Context(), userID, pageID); err != nil {
		if strings.Contains(err.Error(), "not found") {
			response.Error(w, http.StatusNotFound, "page not found")
			return
		}
		response.Error(w, http.StatusInternalServerError, "failed to delete page")
		return
	}

	response.JSON(w, http.StatusOK, map[string]bool{"success": true})
}
