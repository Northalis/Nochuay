package service

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/Northalis/Nochuay/nochuay-back/internal/model"
)

func TestBuildTree_EmptyList(t *testing.T) {
	result := BuildTree(nil)
	if len(result) != 0 {
		t.Errorf("expected empty tree, got %d nodes", len(result))
	}
}

func TestBuildTree_SingleRoot(t *testing.T) {
	pageA := makePage("Page A", nil)
	result := BuildTree([]model.Page{pageA})

	if len(result) != 1 {
		t.Fatalf("expected 1 root, got %d", len(result))
	}
	if result[0].Title != "Page A" {
		t.Errorf("expected title 'Page A', got '%s'", result[0].Title)
	}
	if result[0].Depth != 0 {
		t.Errorf("expected depth 0, got %d", result[0].Depth)
	}
	if len(result[0].Children) != 0 {
		t.Errorf("expected 0 children, got %d", len(result[0].Children))
	}
}

func TestBuildTree_LinearChain(t *testing.T) {
	// A (root) -> B (child of A) -> C (child of B)
	pageA := makePage("A", nil)
	pageB := makePage("B", &pageA.ID)
	pageC := makePage("C", &pageB.ID)

	result := BuildTree([]model.Page{pageA, pageB, pageC})

	if len(result) != 1 {
		t.Fatalf("expected 1 root, got %d", len(result))
	}

	// A
	nodeA := result[0]
	if nodeA.Title != "A" || nodeA.Depth != 0 {
		t.Errorf("root: expected A at depth 0, got '%s' at depth %d", nodeA.Title, nodeA.Depth)
	}
	if len(nodeA.Children) != 1 {
		t.Fatalf("A: expected 1 child, got %d", len(nodeA.Children))
	}

	// B
	nodeB := nodeA.Children[0]
	if nodeB.Title != "B" || nodeB.Depth != 1 {
		t.Errorf("B: expected depth 1, got '%s' at depth %d", nodeB.Title, nodeB.Depth)
	}
	if len(nodeB.Children) != 1 {
		t.Fatalf("B: expected 1 child, got %d", len(nodeB.Children))
	}

	// C
	nodeC := nodeB.Children[0]
	if nodeC.Title != "C" || nodeC.Depth != 2 {
		t.Errorf("C: expected depth 2, got '%s' at depth %d", nodeC.Title, nodeC.Depth)
	}
	if len(nodeC.Children) != 0 {
		t.Errorf("C: expected 0 children, got %d", len(nodeC.Children))
	}
}

func TestBuildTree_MultipleRoots(t *testing.T) {
	pageA := makePage("A", nil)
	pageB := makePage("B", nil)
	pageC := makePage("C", &pageA.ID)

	result := BuildTree([]model.Page{pageA, pageB, pageC})

	if len(result) != 2 {
		t.Fatalf("expected 2 roots, got %d", len(result))
	}
	if result[0].Title != "A" {
		t.Errorf("first root: expected 'A', got '%s'", result[0].Title)
	}
	if result[1].Title != "B" {
		t.Errorf("second root: expected 'B', got '%s'", result[1].Title)
	}
	if len(result[0].Children) != 1 {
		t.Fatalf("A: expected 1 child, got %d", len(result[0].Children))
	}
	if result[0].Children[0].Title != "C" {
		t.Errorf("A's child: expected 'C', got '%s'", result[0].Children[0].Title)
	}
}

func TestBuildTree_MultipleChildrenSameParent(t *testing.T) {
	pageA := makePage("A", nil)
	pageB := makePage("B", &pageA.ID)
	pageC := makePage("C", &pageA.ID)
	pageD := makePage("D", &pageA.ID)

	result := BuildTree([]model.Page{pageA, pageB, pageC, pageD})

	if len(result) != 1 {
		t.Fatalf("expected 1 root, got %d", len(result))
	}
	if len(result[0].Children) != 3 {
		t.Fatalf("A: expected 3 children, got %d", len(result[0].Children))
	}
	for _, child := range result[0].Children {
		if child.Depth != 1 {
			t.Errorf("child '%s': expected depth 1, got %d", child.Title, child.Depth)
		}
	}
}

func TestBuildTree_DeepNesting(t *testing.T) {
	// 5 levels deep: L0 -> L1 -> L2 -> L3 -> L4
	pages := make([]model.Page, 5)
	pages[0] = makePage("L0", nil)
	for i := 1; i < 5; i++ {
		pages[i] = makePage("L"+string(rune('0'+i)), &pages[i-1].ID)
	}

	result := BuildTree(pages)

	// Walk down the tree verifying depth
	if len(result) != 1 {
		t.Fatalf("expected 1 root, got %d", len(result))
	}

	current := result[0]
	for depth := 0; depth < 5; depth++ {
		if current.Depth != depth {
			t.Errorf("level %d: expected depth %d, got %d", depth, depth, current.Depth)
		}
		if depth < 4 {
			if len(current.Children) != 1 {
				t.Fatalf("level %d: expected 1 child, got %d", depth, len(current.Children))
			}
			current = current.Children[0]
		}
	}
}

func TestBuildTree_ChildrenHaveEmptyChildrenSlice(t *testing.T) {
	pageA := makePage("A", nil)
	result := BuildTree([]model.Page{pageA})

	// Children should be an empty slice, not nil (for clean JSON serialization)
	if result[0].Children == nil {
		t.Error("expected non-nil empty children slice")
	}
}

// makePage is a helper to create a test page.
func makePage(title string, parentID *uuid.UUID) model.Page {
	return model.Page{
		ID:        uuid.New(),
		UserID:    uuid.MustParse("00000000-0000-0000-0000-000000000001"),
		ParentID:  parentID,
		Title:     title,
		Content:   json.RawMessage(`[]`),
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
}
