package service

import (
	"testing"
)

func TestHashPassword_ProducesValidHash(t *testing.T) {
	password := "mySecurePassword123"
	hash, err := hashPassword(password)
	if err != nil {
		t.Fatalf("hashPassword returned error: %v", err)
	}
	if hash == "" {
		t.Fatal("hashPassword returned empty hash")
	}
	// Bcrypt hashes always start with "$2a$" or "$2b$"
	if hash[0] != '$' {
		t.Errorf("expected bcrypt hash prefix starting with '$', got '%c'", hash[0])
	}
}

func TestVerifyPassword_CorrectPassword(t *testing.T) {
	password := "testPassword456"
	hash, err := hashPassword(password)
	if err != nil {
		t.Fatalf("hashPassword returned error: %v", err)
	}

	if !verifyPassword(password, hash) {
		t.Error("verifyPassword returned false for correct password")
	}
}

func TestVerifyPassword_WrongPassword(t *testing.T) {
	password := "correctPassword"
	wrongPassword := "wrongPassword"

	hash, err := hashPassword(password)
	if err != nil {
		t.Fatalf("hashPassword returned error: %v", err)
	}

	if verifyPassword(wrongPassword, hash) {
		t.Error("verifyPassword returned true for wrong password")
	}
}

func TestHashPassword_DifferentHashesForSamePassword(t *testing.T) {
	password := "samePassword"
	hash1, err := hashPassword(password)
	if err != nil {
		t.Fatalf("first hashPassword returned error: %v", err)
	}
	hash2, err := hashPassword(password)
	if err != nil {
		t.Fatalf("second hashPassword returned error: %v", err)
	}

	if hash1 == hash2 {
		t.Error("expected different hashes for same password (bcrypt uses random salt), but they are equal")
	}

	// Both hashes should still verify correctly
	if !verifyPassword(password, hash1) {
		t.Error("verifyPassword failed for hash1")
	}
	if !verifyPassword(password, hash2) {
		t.Error("verifyPassword failed for hash2")
	}
}

func TestVerifyPassword_InvalidHash(t *testing.T) {
	if verifyPassword("password", "not-a-valid-hash") {
		t.Error("verifyPassword should return false for invalid hash")
	}
}

func TestVerifyPassword_EmptyPassword(t *testing.T) {
	hash, err := hashPassword("realPassword")
	if err != nil {
		t.Fatalf("hashPassword returned error: %v", err)
	}

	if verifyPassword("", hash) {
		t.Error("verifyPassword should return false for empty password")
	}
}
