package handler_tests

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/Northalis/Nochuay/nochuay-back/internal/handler"
	"github.com/Northalis/Nochuay/nochuay-back/internal/middleware"
	"github.com/Northalis/Nochuay/nochuay-back/internal/model"
	"github.com/google/uuid"
)

// injectUserID adds a userID to the request context (simulates auth middleware).
func injectUserID(r *http.Request, userID uuid.UUID) *http.Request {
	ctx := context.WithValue(r.Context(), middleware.UserIDKey, userID)
	return r.WithContext(ctx)
}

// ── POST /pages (CreatePage) ────────────────────────────────

func TestCreatePage_Success(t *testing.T) {
	userID := uuid.New()
	pageID := uuid.New()

	mock := &MockPageService{
		CreatePageFn: func(_ context.Context, uid uuid.UUID, parentID *uuid.UUID, title string) (*model.Page, error) {
			return &model.Page{
				ID:        pageID,
				UserID:    uid,
				ParentID:  parentID,
				Title:     title,
				Content:   json.RawMessage(`[]`),
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			}, nil
		},
	}

	h := handler.NewPageHandler(mock)

	reqBody := `{"title":"My Page"}`
	req := httptest.NewRequest(http.MethodPost, "/pages", bytes.NewBufferString(reqBody))
	req.Header.Set("Content-Type", "application/json")
	req = injectUserID(req, userID)

	w := httptest.NewRecorder()
	h.CreatePage(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d; body: %s", w.Code, w.Body.String())
	}
}

func TestCreatePage_WithParent(t *testing.T) {
	userID := uuid.New()
	parentID := uuid.New()

	mock := &MockPageService{
		CreatePageFn: func(_ context.Context, uid uuid.UUID, pid *uuid.UUID, title string) (*model.Page, error) {
			if pid == nil || *pid != parentID {
				t.Errorf("expected parentID %s, got %v", parentID, pid)
			}
			return &model.Page{
				ID:        uuid.New(),
				UserID:    uid,
				ParentID:  pid,
				Title:     title,
				Content:   json.RawMessage(`[]`),
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			}, nil
		},
	}

	h := handler.NewPageHandler(mock)

	reqBody := fmt.Sprintf(`{"parentId":"%s","title":"Child Page"}`, parentID.String())
	req := httptest.NewRequest(http.MethodPost, "/pages", bytes.NewBufferString(reqBody))
	req.Header.Set("Content-Type", "application/json")
	req = injectUserID(req, userID)

	w := httptest.NewRecorder()
	h.CreatePage(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d; body: %s", w.Code, w.Body.String())
	}
}

func TestCreatePage_Unauthorized(t *testing.T) {
	mock := &MockPageService{}
	h := handler.NewPageHandler(mock)

	reqBody := `{"title":"Test"}`
	req := httptest.NewRequest(http.MethodPost, "/pages", bytes.NewBufferString(reqBody))
	req.Header.Set("Content-Type", "application/json")
	// No userID injected

	w := httptest.NewRecorder()
	h.CreatePage(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", w.Code)
	}
}

func TestCreatePage_InvalidJSON(t *testing.T) {
	mock := &MockPageService{}
	h := handler.NewPageHandler(mock)

	req := httptest.NewRequest(http.MethodPost, "/pages", bytes.NewBufferString(`{bad`))
	req.Header.Set("Content-Type", "application/json")
	req = injectUserID(req, uuid.New())

	w := httptest.NewRecorder()
	h.CreatePage(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}
}

func TestCreatePage_InvalidParentID(t *testing.T) {
	mock := &MockPageService{}
	h := handler.NewPageHandler(mock)

	reqBody := `{"parentId":"not-a-uuid","title":"Test"}`
	req := httptest.NewRequest(http.MethodPost, "/pages", bytes.NewBufferString(reqBody))
	req.Header.Set("Content-Type", "application/json")
	req = injectUserID(req, uuid.New())

	w := httptest.NewRecorder()
	h.CreatePage(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}
}

func TestCreatePage_ParentNotFound(t *testing.T) {
	mock := &MockPageService{
		CreatePageFn: func(_ context.Context, _ uuid.UUID, _ *uuid.UUID, _ string) (*model.Page, error) {
			return nil, fmt.Errorf("parent page not found")
		},
	}
	h := handler.NewPageHandler(mock)

	parentID := uuid.New()
	reqBody := fmt.Sprintf(`{"parentId":"%s","title":"Orphan"}`, parentID.String())
	req := httptest.NewRequest(http.MethodPost, "/pages", bytes.NewBufferString(reqBody))
	req.Header.Set("Content-Type", "application/json")
	req = injectUserID(req, uuid.New())

	w := httptest.NewRecorder()
	h.CreatePage(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d", w.Code)
	}
}

// ── GET /pages/{id} (GetPage) ───────────────────────────────

func TestGetPage_Success(t *testing.T) {
	userID := uuid.New()
	pageID := uuid.New()

	mock := &MockPageService{
		GetPageFn: func(_ context.Context, uid, pid uuid.UUID) (*model.Page, error) {
			return &model.Page{
				ID:        pid,
				UserID:    uid,
				Title:     "Test Page",
				Content:   json.RawMessage(`[]`),
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			}, nil
		},
	}
	h := handler.NewPageHandler(mock)

	req := httptest.NewRequest(http.MethodGet, "/pages/"+pageID.String(), nil)
	req.SetPathValue("id", pageID.String())
	req = injectUserID(req, userID)

	w := httptest.NewRecorder()
	h.GetPage(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d; body: %s", w.Code, w.Body.String())
	}
}

func TestGetPage_NotFound(t *testing.T) {
	mock := &MockPageService{
		GetPageFn: func(_ context.Context, _, _ uuid.UUID) (*model.Page, error) {
			return nil, fmt.Errorf("page not found")
		},
	}
	h := handler.NewPageHandler(mock)

	pageID := uuid.New()
	req := httptest.NewRequest(http.MethodGet, "/pages/"+pageID.String(), nil)
	req.SetPathValue("id", pageID.String())
	req = injectUserID(req, uuid.New())

	w := httptest.NewRecorder()
	h.GetPage(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d", w.Code)
	}
}

func TestGetPage_InvalidID(t *testing.T) {
	mock := &MockPageService{}
	h := handler.NewPageHandler(mock)

	req := httptest.NewRequest(http.MethodGet, "/pages/not-a-uuid", nil)
	req.SetPathValue("id", "not-a-uuid")
	req = injectUserID(req, uuid.New())

	w := httptest.NewRecorder()
	h.GetPage(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}
}

func TestGetPage_Unauthorized(t *testing.T) {
	mock := &MockPageService{}
	h := handler.NewPageHandler(mock)

	req := httptest.NewRequest(http.MethodGet, "/pages/"+uuid.New().String(), nil)
	req.SetPathValue("id", uuid.New().String())

	w := httptest.NewRecorder()
	h.GetPage(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", w.Code)
	}
}

// ── PATCH /pages/{id} (UpdatePage) ──────────────────────────

func TestUpdatePage_Success(t *testing.T) {
	userID := uuid.New()
	pageID := uuid.New()

	mock := &MockPageService{
		UpdatePageFn: func(_ context.Context, uid, pid uuid.UUID, updates map[string]any) (*model.Page, error) {
			title := updates["title"].(string)
			return &model.Page{
				ID:        pid,
				UserID:    uid,
				Title:     title,
				Content:   json.RawMessage(`[]`),
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			}, nil
		},
	}
	h := handler.NewPageHandler(mock)

	reqBody := `{"title":"Updated Title"}`
	req := httptest.NewRequest(http.MethodPatch, "/pages/"+pageID.String(), bytes.NewBufferString(reqBody))
	req.Header.Set("Content-Type", "application/json")
	req.SetPathValue("id", pageID.String())
	req = injectUserID(req, userID)

	w := httptest.NewRecorder()
	h.UpdatePage(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d; body: %s", w.Code, w.Body.String())
	}
}

func TestUpdatePage_NoFields(t *testing.T) {
	mock := &MockPageService{}
	h := handler.NewPageHandler(mock)

	reqBody := `{}`
	req := httptest.NewRequest(http.MethodPatch, "/pages/"+uuid.New().String(), bytes.NewBufferString(reqBody))
	req.Header.Set("Content-Type", "application/json")
	req.SetPathValue("id", uuid.New().String())
	req = injectUserID(req, uuid.New())

	w := httptest.NewRecorder()
	h.UpdatePage(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}
}

func TestUpdatePage_NotFound(t *testing.T) {
	mock := &MockPageService{
		UpdatePageFn: func(_ context.Context, _, _ uuid.UUID, _ map[string]any) (*model.Page, error) {
			return nil, fmt.Errorf("page not found")
		},
	}
	h := handler.NewPageHandler(mock)

	reqBody := `{"title":"Updated"}`
	pageID := uuid.New()
	req := httptest.NewRequest(http.MethodPatch, "/pages/"+pageID.String(), bytes.NewBufferString(reqBody))
	req.Header.Set("Content-Type", "application/json")
	req.SetPathValue("id", pageID.String())
	req = injectUserID(req, uuid.New())

	w := httptest.NewRecorder()
	h.UpdatePage(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d", w.Code)
	}
}

// ── DELETE /pages/{id} (DeletePage) ─────────────────────────

func TestDeletePage_Success(t *testing.T) {
	mock := &MockPageService{
		DeletePageFn: func(_ context.Context, _, _ uuid.UUID) error {
			return nil
		},
	}
	h := handler.NewPageHandler(mock)

	pageID := uuid.New()
	req := httptest.NewRequest(http.MethodDelete, "/pages/"+pageID.String(), nil)
	req.SetPathValue("id", pageID.String())
	req = injectUserID(req, uuid.New())

	w := httptest.NewRecorder()
	h.DeletePage(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d; body: %s", w.Code, w.Body.String())
	}
}

func TestDeletePage_NotFound(t *testing.T) {
	mock := &MockPageService{
		DeletePageFn: func(_ context.Context, _, _ uuid.UUID) error {
			return fmt.Errorf("page not found")
		},
	}
	h := handler.NewPageHandler(mock)

	pageID := uuid.New()
	req := httptest.NewRequest(http.MethodDelete, "/pages/"+pageID.String(), nil)
	req.SetPathValue("id", pageID.String())
	req = injectUserID(req, uuid.New())

	w := httptest.NewRecorder()
	h.DeletePage(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d", w.Code)
	}
}

func TestDeletePage_Unauthorized(t *testing.T) {
	mock := &MockPageService{}
	h := handler.NewPageHandler(mock)

	req := httptest.NewRequest(http.MethodDelete, "/pages/"+uuid.New().String(), nil)
	req.SetPathValue("id", uuid.New().String())

	w := httptest.NewRecorder()
	h.DeletePage(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", w.Code)
	}
}

// ── GET /pages/sidebar (GetSidebar) ─────────────────────────

func TestGetSidebar_Success(t *testing.T) {
	userID := uuid.New()

	mock := &MockPageService{
		GetSidebarTreeFn: func(_ context.Context, uid uuid.UUID) ([]model.PageNode, error) {
			return []model.PageNode{
				{
					Page: model.Page{
						ID:      uuid.New(),
						UserID:  uid,
						Title:   "Root Page",
						Content: json.RawMessage(`[]`),
					},
					Children: []model.PageNode{},
					Depth:    0,
				},
			}, nil
		},
	}
	h := handler.NewPageHandler(mock)

	req := httptest.NewRequest(http.MethodGet, "/pages/sidebar", nil)
	req = injectUserID(req, userID)

	w := httptest.NewRecorder()
	h.GetSidebar(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d; body: %s", w.Code, w.Body.String())
	}
}

func TestGetSidebar_Empty(t *testing.T) {
	mock := &MockPageService{
		GetSidebarTreeFn: func(_ context.Context, _ uuid.UUID) ([]model.PageNode, error) {
			return []model.PageNode{}, nil
		},
	}
	h := handler.NewPageHandler(mock)

	req := httptest.NewRequest(http.MethodGet, "/pages/sidebar", nil)
	req = injectUserID(req, uuid.New())

	w := httptest.NewRecorder()
	h.GetSidebar(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}
}

func TestGetSidebar_Unauthorized(t *testing.T) {
	mock := &MockPageService{}
	h := handler.NewPageHandler(mock)

	req := httptest.NewRequest(http.MethodGet, "/pages/sidebar", nil)

	w := httptest.NewRecorder()
	h.GetSidebar(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", w.Code)
	}
}

func TestGetSidebar_ServiceError(t *testing.T) {
	mock := &MockPageService{
		GetSidebarTreeFn: func(_ context.Context, _ uuid.UUID) ([]model.PageNode, error) {
			return nil, fmt.Errorf("database unavailable")
		},
	}
	h := handler.NewPageHandler(mock)

	req := httptest.NewRequest(http.MethodGet, "/pages/sidebar", nil)
	req = injectUserID(req, uuid.New())

	w := httptest.NewRecorder()
	h.GetSidebar(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected status 500, got %d", w.Code)
	}
}

// ── GET /pages/search?q=... (SearchPages) ─────────────────

func TestSearchPages_Success(t *testing.T) {
	userID := uuid.New()

	mock := &MockPageService{
		SearchPagesFn: func(_ context.Context, uid uuid.UUID, query string, limit int) ([]model.PageSearchResult, error) {
			if uid != userID {
				t.Fatalf("expected userID %s, got %s", userID, uid)
			}
			if query != "road" {
				t.Fatalf("expected query 'road', got '%s'", query)
			}
			if limit != 25 {
				t.Fatalf("expected limit 25, got %d", limit)
			}

			return []model.PageSearchResult{
				{ID: uuid.New(), Title: "Roadmap"},
				{ID: uuid.New(), Title: "Weekly Road"},
			}, nil
		},
	}
	h := handler.NewPageHandler(mock)

	req := httptest.NewRequest(http.MethodGet, "/pages/search?q=road", nil)
	req = injectUserID(req, userID)

	w := httptest.NewRecorder()
	h.SearchPages(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d; body: %s", w.Code, w.Body.String())
	}
}

func TestSearchPages_MissingQuery(t *testing.T) {
	mock := &MockPageService{}
	h := handler.NewPageHandler(mock)

	req := httptest.NewRequest(http.MethodGet, "/pages/search", nil)
	req = injectUserID(req, uuid.New())

	w := httptest.NewRecorder()
	h.SearchPages(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}
}

func TestSearchPages_Unauthorized(t *testing.T) {
	mock := &MockPageService{}
	h := handler.NewPageHandler(mock)

	req := httptest.NewRequest(http.MethodGet, "/pages/search?q=abc", nil)

	w := httptest.NewRecorder()
	h.SearchPages(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", w.Code)
	}
}

func TestSearchPages_ServiceError(t *testing.T) {
	mock := &MockPageService{
		SearchPagesFn: func(_ context.Context, _ uuid.UUID, _ string, _ int) ([]model.PageSearchResult, error) {
			return nil, fmt.Errorf("database unavailable")
		},
	}
	h := handler.NewPageHandler(mock)

	req := httptest.NewRequest(http.MethodGet, "/pages/search?q=abc", nil)
	req = injectUserID(req, uuid.New())

	w := httptest.NewRecorder()
	h.SearchPages(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected status 500, got %d", w.Code)
	}
}

// ── PUT /pages/{id}/content (SaveContent) ───────────────────

func TestSaveContent_Success(t *testing.T) {
	userID := uuid.New()
	pageID := uuid.New()

	mock := &MockPageService{
		SaveContentFn: func(_ context.Context, uid, pid uuid.UUID, content json.RawMessage) (*model.Page, error) {
			return &model.Page{
				ID:        pid,
				UserID:    uid,
				Title:     "Page",
				Content:   content,
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			}, nil
		},
	}
	h := handler.NewPageHandler(mock)

	reqBody := `[{"type":"paragraph","content":[{"type":"text","text":"Hello"}]}]`
	req := httptest.NewRequest(http.MethodPut, "/pages/"+pageID.String()+"/content", bytes.NewBufferString(reqBody))
	req.Header.Set("Content-Type", "application/json")
	req.SetPathValue("id", pageID.String())
	req = injectUserID(req, userID)

	w := httptest.NewRecorder()
	h.SaveContent(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d; body: %s", w.Code, w.Body.String())
	}
}

func TestSaveContent_InvalidJSON(t *testing.T) {
	mock := &MockPageService{}
	h := handler.NewPageHandler(mock)

	pageID := uuid.New()
	req := httptest.NewRequest(http.MethodPut, "/pages/"+pageID.String()+"/content", bytes.NewBufferString(`{not valid`))
	req.Header.Set("Content-Type", "application/json")
	req.SetPathValue("id", pageID.String())
	req = injectUserID(req, uuid.New())

	w := httptest.NewRecorder()
	h.SaveContent(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}
}

// ── GET /pages/{id}/content (GetContent) ────────────────────

func TestGetContent_Success(t *testing.T) {
	userID := uuid.New()
	pageID := uuid.New()

	mock := &MockPageService{
		GetContentFn: func(_ context.Context, _, _ uuid.UUID) (json.RawMessage, error) {
			return json.RawMessage(`[{"type":"paragraph"}]`), nil
		},
	}
	h := handler.NewPageHandler(mock)

	req := httptest.NewRequest(http.MethodGet, "/pages/"+pageID.String()+"/content", nil)
	req.SetPathValue("id", pageID.String())
	req = injectUserID(req, userID)

	w := httptest.NewRecorder()
	h.GetContent(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d; body: %s", w.Code, w.Body.String())
	}
}

func TestGetContent_NotFound(t *testing.T) {
	mock := &MockPageService{
		GetContentFn: func(_ context.Context, _, _ uuid.UUID) (json.RawMessage, error) {
			return nil, fmt.Errorf("page not found")
		},
	}
	h := handler.NewPageHandler(mock)

	pageID := uuid.New()
	req := httptest.NewRequest(http.MethodGet, "/pages/"+pageID.String()+"/content", nil)
	req.SetPathValue("id", pageID.String())
	req = injectUserID(req, uuid.New())

	w := httptest.NewRecorder()
	h.GetContent(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d", w.Code)
	}
}

// ── POST /pages/{id}/assets (UploadAsset) ──────────────────

func TestUploadAsset_SuccessImage(t *testing.T) {
	userID := uuid.New()
	pageID := uuid.New()
	uploadDir := t.TempDir()

	mock := &MockPageService{
		GetPageFn: func(_ context.Context, uid, pid uuid.UUID) (*model.Page, error) {
			return &model.Page{ID: pid, UserID: uid, Title: "Page", Content: json.RawMessage(`[]`)}, nil
		},
	}

	h := handler.NewPageHandler(
		mock,
		handler.WithUploadDir(uploadDir),
		handler.WithMaxUploadSizeBytes(1024*1024),
	)

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	_ = writer.WriteField("kind", "image")
	part, err := writer.CreateFormFile("file", "sample.png")
	if err != nil {
		t.Fatalf("failed to create form file: %v", err)
	}
	_, _ = part.Write([]byte{0x89, 'P', 'N', 'G', '\r', '\n', 0x1a, '\n', 0x00, 0x00, 0x00, 0x0D})
	_ = writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/pages/"+pageID.String()+"/assets", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.SetPathValue("id", pageID.String())
	req = injectUserID(req, userID)

	w := httptest.NewRecorder()
	h.UploadAsset(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d; body: %s", w.Code, w.Body.String())
	}

	var envelope struct {
		Data struct {
			URL string `json:"url"`
		} `json:"data"`
		Error *string `json:"error"`
	}
	if err := json.NewDecoder(w.Body).Decode(&envelope); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if envelope.Error != nil {
		t.Fatalf("expected nil error, got %s", *envelope.Error)
	}
	if !strings.HasPrefix(envelope.Data.URL, "/assets/") {
		t.Fatalf("expected public asset URL, got %s", envelope.Data.URL)
	}

	assetRelativePath := strings.TrimPrefix(envelope.Data.URL, "/assets/")
	assetFullPath := filepath.Join(uploadDir, filepath.FromSlash(assetRelativePath))
	if _, err := os.Stat(assetFullPath); err != nil {
		t.Fatalf("expected uploaded file to exist at %s: %v", assetFullPath, err)
	}
}

func TestUploadAsset_InvalidKind(t *testing.T) {
	mock := &MockPageService{
		GetPageFn: func(_ context.Context, uid, pid uuid.UUID) (*model.Page, error) {
			return &model.Page{ID: pid, UserID: uid, Title: "Page", Content: json.RawMessage(`[]`)}, nil
		},
	}
	h := handler.NewPageHandler(mock)

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	_ = writer.WriteField("kind", "video")
	part, _ := writer.CreateFormFile("file", "sample.txt")
	_, _ = part.Write([]byte("hello"))
	_ = writer.Close()

	pageID := uuid.New()
	req := httptest.NewRequest(http.MethodPost, "/pages/"+pageID.String()+"/assets", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.SetPathValue("id", pageID.String())
	req = injectUserID(req, uuid.New())

	w := httptest.NewRecorder()
	h.UploadAsset(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d; body: %s", w.Code, w.Body.String())
	}
}

func TestUploadAsset_UnsupportedFileType(t *testing.T) {
	userID := uuid.New()
	pageID := uuid.New()

	mock := &MockPageService{
		GetPageFn: func(_ context.Context, uid, pid uuid.UUID) (*model.Page, error) {
			return &model.Page{ID: pid, UserID: uid, Title: "Page", Content: json.RawMessage(`[]`)}, nil
		},
	}

	h := handler.NewPageHandler(mock)

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	_ = writer.WriteField("kind", "image")
	part, _ := writer.CreateFormFile("file", "bad.exe")
	_, _ = part.Write([]byte("MZ fake executable"))
	_ = writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/pages/"+pageID.String()+"/assets", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.SetPathValue("id", pageID.String())
	req = injectUserID(req, userID)

	w := httptest.NewRecorder()
	h.UploadAsset(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d; body: %s", w.Code, w.Body.String())
	}
}

func TestUploadAsset_TooLarge(t *testing.T) {
	userID := uuid.New()
	pageID := uuid.New()

	mock := &MockPageService{
		GetPageFn: func(_ context.Context, uid, pid uuid.UUID) (*model.Page, error) {
			return &model.Page{ID: pid, UserID: uid, Title: "Page", Content: json.RawMessage(`[]`)}, nil
		},
	}

	h := handler.NewPageHandler(mock, handler.WithMaxUploadSizeBytes(10))

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	_ = writer.WriteField("kind", "file")
	part, _ := writer.CreateFormFile("file", "large.txt")
	_, _ = part.Write([]byte("this-is-over-10-bytes"))
	_ = writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/pages/"+pageID.String()+"/assets", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.SetPathValue("id", pageID.String())
	req = injectUserID(req, userID)

	w := httptest.NewRecorder()
	h.UploadAsset(w, req)

	if w.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("expected status 413, got %d; body: %s", w.Code, w.Body.String())
	}
}
