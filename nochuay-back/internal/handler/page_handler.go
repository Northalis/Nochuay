package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/Northalis/Nochuay/nochuay-back/internal/handler/response"
	"github.com/Northalis/Nochuay/nochuay-back/internal/middleware"
	"github.com/Northalis/Nochuay/nochuay-back/internal/service"
	"github.com/google/uuid"
)

// PageHandler handles page-related HTTP requests.
type PageHandler struct {
	pageService        service.PageService
	uploadDir          string
	maxUploadSizeBytes int64
}

// NewPageHandler creates a new PageHandler.
func NewPageHandler(pageService service.PageService, opts ...PageHandlerOption) *PageHandler {
	h := &PageHandler{
		pageService:        pageService,
		uploadDir:          "uploads",
		maxUploadSizeBytes: 10 * 1024 * 1024,
	}

	for _, opt := range opts {
		opt(h)
	}

	return h
}

// PageHandlerOption configures PageHandler behavior.
type PageHandlerOption func(*PageHandler)

// WithUploadDir sets the upload directory used by UploadAsset.
func WithUploadDir(uploadDir string) PageHandlerOption {
	return func(h *PageHandler) {
		if strings.TrimSpace(uploadDir) != "" {
			h.uploadDir = uploadDir
		}
	}
}

// WithMaxUploadSizeBytes sets the max accepted upload request body size.
func WithMaxUploadSizeBytes(maxBytes int64) PageHandlerOption {
	return func(h *PageHandler) {
		if maxBytes > 0 {
			h.maxUploadSizeBytes = maxBytes
		}
	}
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

type uploadAssetResponse struct {
	URL         string `json:"url"`
	ContentType string `json:"contentType"`
	Size        int64  `json:"size"`
	Name        string `json:"name"`
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

// SaveContent handles PUT /pages/{id}/content.
// Accepts a raw BlockNote JSON array and saves it as the page content.
func (h *PageHandler) SaveContent(w http.ResponseWriter, r *http.Request) {
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

	// Read the raw JSON body as-is (BlockNote JSON array)
	var content json.RawMessage
	if err := json.NewDecoder(r.Body).Decode(&content); err != nil {
		response.Error(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	page, err := h.pageService.SaveContent(r.Context(), userID, pageID, content)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			response.Error(w, http.StatusNotFound, "page not found")
			return
		}
		if strings.Contains(err.Error(), "valid JSON") || strings.Contains(err.Error(), "JSON array") {
			response.Error(w, http.StatusBadRequest, err.Error())
			return
		}
		response.Error(w, http.StatusInternalServerError, "failed to save content")
		return
	}

	response.JSON(w, http.StatusOK, page)
}

// GetContent handles GET /pages/{id}/content.
// Returns only the content field for a page (lightweight fetch for the editor).
func (h *PageHandler) GetContent(w http.ResponseWriter, r *http.Request) {
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

	content, err := h.pageService.GetContent(r.Context(), userID, pageID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			response.Error(w, http.StatusNotFound, "page not found")
			return
		}
		response.Error(w, http.StatusInternalServerError, "failed to get content")
		return
	}

	response.JSON(w, http.StatusOK, content)
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

// UploadAsset handles POST /pages/{id}/assets.
// Accepts multipart/form-data with:
// - file: required file payload
// - kind: required, one of "image" or "file"
func (h *PageHandler) UploadAsset(w http.ResponseWriter, r *http.Request) {
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

	// Verify page ownership before accepting upload data.
	if _, err := h.pageService.GetPage(r.Context(), userID, pageID); err != nil {
		if strings.Contains(err.Error(), "not found") {
			response.Error(w, http.StatusNotFound, "page not found")
			return
		}
		response.Error(w, http.StatusInternalServerError, "failed to verify page")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, h.maxUploadSizeBytes)
	if err := r.ParseMultipartForm(h.maxUploadSizeBytes); err != nil {
		if strings.Contains(err.Error(), "request body too large") {
			response.Error(w, http.StatusRequestEntityTooLarge, "upload exceeds max size")
			return
		}
		response.Error(w, http.StatusBadRequest, "invalid multipart form data")
		return
	}

	kind := strings.ToLower(strings.TrimSpace(r.FormValue("kind")))
	if kind != "image" && kind != "file" {
		response.Error(w, http.StatusBadRequest, "kind must be either 'image' or 'file'")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		response.Error(w, http.StatusBadRequest, "file is required")
		return
	}
	defer file.Close()

	contentBytes, err := io.ReadAll(file)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to read uploaded file")
		return
	}

	size := int64(len(contentBytes))
	if size == 0 {
		response.Error(w, http.StatusBadRequest, "uploaded file is empty")
		return
	}
	if size > h.maxUploadSizeBytes {
		response.Error(w, http.StatusRequestEntityTooLarge, "upload exceeds max size")
		return
	}

	detectedContentType := http.DetectContentType(contentBytes)
	if !isAllowedUpload(kind, header.Filename, header.Header.Get("Content-Type"), detectedContentType) {
		response.Error(w, http.StatusBadRequest, "unsupported file type for requested kind")
		return
	}

	ext := sanitizedExt(header.Filename)
	if ext == "" {
		ext = extensionFromContentType(detectedContentType)
	}

	fileName := fmt.Sprintf("%d_%s%s", time.Now().UnixMilli(), uuid.NewString(), ext)
	baseDir := filepath.Join(h.uploadDir, userID.String(), pageID.String())
	if err := os.MkdirAll(baseDir, 0o755); err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to prepare upload directory")
		return
	}

	filePath := filepath.Join(baseDir, fileName)
	if err := os.WriteFile(filePath, contentBytes, 0o644); err != nil {
		response.Error(w, http.StatusInternalServerError, "failed to store uploaded file")
		return
	}

	publicURL := fmt.Sprintf("/assets/%s/%s/%s", userID.String(), pageID.String(), fileName)
	response.JSON(w, http.StatusCreated, uploadAssetResponse{
		URL:         publicURL,
		ContentType: detectedContentType,
		Size:        size,
		Name:        header.Filename,
	})
}

func isAllowedUpload(kind, originalName, providedContentType, detectedContentType string) bool {
	provided := strings.ToLower(strings.TrimSpace(providedContentType))
	detected := strings.ToLower(strings.TrimSpace(detectedContentType))
	ext := strings.ToLower(filepath.Ext(originalName))

	allowedImageMime := map[string]struct{}{
		"image/png":     {},
		"image/jpeg":    {},
		"image/webp":    {},
		"image/gif":     {},
		"image/svg+xml": {},
	}
	allowedImageExt := map[string]struct{}{
		".png":  {},
		".jpg":  {},
		".jpeg": {},
		".webp": {},
		".gif":  {},
		".svg":  {},
	}

	allowedFileMime := map[string]struct{}{
		"application/pdf": {},
		"text/plain":      {},
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document": {},
		"application/msword": {},
	}
	allowedFileExt := map[string]struct{}{
		".pdf":  {},
		".txt":  {},
		".doc":  {},
		".docx": {},
	}

	if kind == "image" {
		if _, ok := allowedImageMime[detected]; ok {
			return true
		}
		if _, ok := allowedImageMime[provided]; ok {
			return true
		}
		if _, ok := allowedImageExt[ext]; ok {
			if ext == ".svg" {
				return strings.Contains(detected, "svg") ||
					strings.Contains(provided, "svg") ||
					strings.Contains(detected, "xml") ||
					strings.Contains(provided, "xml") ||
					strings.Contains(detected, "text/plain") ||
					strings.Contains(provided, "text/plain")
			}
			return strings.HasPrefix(detected, "image/") || strings.HasPrefix(provided, "image/")
		}
		return false
	}

	if _, ok := allowedFileMime[detected]; ok {
		return true
	}
	if _, ok := allowedFileMime[provided]; ok {
		return true
	}
	if detected == "application/zip" && ext == ".docx" {
		return true
	}
	_, ok := allowedFileExt[ext]
	return ok
}

func sanitizedExt(filename string) string {
	ext := strings.ToLower(filepath.Ext(filename))
	switch ext {
	case ".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".pdf", ".txt", ".doc", ".docx":
		return ext
	default:
		return ""
	}
}

func extensionFromContentType(contentType string) string {
	switch strings.ToLower(strings.TrimSpace(contentType)) {
	case "image/png":
		return ".png"
	case "image/jpeg":
		return ".jpg"
	case "image/webp":
		return ".webp"
	case "image/gif":
		return ".gif"
	case "image/svg+xml":
		return ".svg"
	case "application/pdf":
		return ".pdf"
	case "text/plain":
		return ".txt"
	default:
		return ""
	}
}
