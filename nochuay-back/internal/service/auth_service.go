package service

import (
	"context"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"github.com/Northalis/Nochuay/nochuay-back/internal/model"
	"github.com/Northalis/Nochuay/nochuay-back/internal/repository"
)

// AuthService defines the interface for authentication business logic.
type AuthService interface {
	Signup(ctx context.Context, email, password string) (string, *model.User, error)
	Login(ctx context.Context, email, password string) (string, *model.User, error)
	ValidateToken(tokenString string) (uuid.UUID, error)
}

type authService struct {
	userRepo  repository.UserRepository
	jwtSecret []byte
}

// NewAuthService creates a new AuthService.
func NewAuthService(userRepo repository.UserRepository, jwtSecret string) AuthService {
	return &authService{
		userRepo:  userRepo,
		jwtSecret: []byte(jwtSecret),
	}
}

// Signup registers a new user and returns a JWT token.
func (s *authService) Signup(ctx context.Context, email, password string) (string, *model.User, error) {
	// Check if user already exists
	existing, err := s.userRepo.GetUserByEmail(ctx, email)
	if err != nil {
		return "", nil, fmt.Errorf("failed to check existing user: %w", err)
	}
	if existing != nil {
		return "", nil, fmt.Errorf("user with this email already exists")
	}

	// Hash password with bcrypt
	hash, err := hashPassword(password)
	if err != nil {
		return "", nil, fmt.Errorf("failed to hash password: %w", err)
	}

	// Create user
	user, err := s.userRepo.CreateUser(ctx, email, hash)
	if err != nil {
		return "", nil, fmt.Errorf("failed to create user: %w", err)
	}

	// Generate JWT
	token, err := s.generateToken(user.ID)
	if err != nil {
		return "", nil, fmt.Errorf("failed to generate token: %w", err)
	}

	return token, user, nil
}

// Login authenticates a user and returns a JWT token.
func (s *authService) Login(ctx context.Context, email, password string) (string, *model.User, error) {
	user, err := s.userRepo.GetUserByEmail(ctx, email)
	if err != nil {
		return "", nil, fmt.Errorf("failed to find user: %w", err)
	}
	if user == nil {
		return "", nil, fmt.Errorf("invalid email or password")
	}

	// Verify password
	if !verifyPassword(password, user.PasswordHash) {
		return "", nil, fmt.Errorf("invalid email or password")
	}

	// Generate JWT
	token, err := s.generateToken(user.ID)
	if err != nil {
		return "", nil, fmt.Errorf("failed to generate token: %w", err)
	}

	return token, user, nil
}

// ValidateToken parses and validates a JWT, returning the user ID.
func (s *authService) ValidateToken(tokenString string) (uuid.UUID, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return s.jwtSecret, nil
	})
	if err != nil {
		return uuid.Nil, fmt.Errorf("invalid token: %w", err)
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return uuid.Nil, fmt.Errorf("invalid token claims")
	}

	userIDStr, ok := claims["user_id"].(string)
	if !ok {
		return uuid.Nil, fmt.Errorf("user_id not found in token")
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return uuid.Nil, fmt.Errorf("invalid user_id in token: %w", err)
	}

	return userID, nil
}

func (s *authService) generateToken(userID uuid.UUID) (string, error) {
	claims := jwt.MapClaims{
		"user_id": userID.String(),
		"exp":     time.Now().Add(72 * time.Hour).Unix(),
		"iat":     time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}

// --- Bcrypt Password Hashing ---

func hashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("failed to hash password: %w", err)
	}
	return string(hash), nil
}

func verifyPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}
