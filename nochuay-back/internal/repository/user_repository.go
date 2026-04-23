package repository

import (
	"context"
	"fmt"

	"github.com/Northalis/Nochuay/nochuay-back/internal/model"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// UserRepository defines the interface for user data access.
type UserRepository interface {
	CreateUser(ctx context.Context, email, passwordHash string) (*model.User, error)
	GetUserByEmail(ctx context.Context, email string) (*model.User, error)
	GetUserByID(ctx context.Context, id uuid.UUID) (*model.User, error)
	UpdateUserEmail(ctx context.Context, id uuid.UUID, newEmail string) (*model.User, error)
	UpdateUserPasswordHash(ctx context.Context, id uuid.UUID, passwordHash string) error
}

type userRepository struct {
	pool *pgxpool.Pool
}

// NewUserRepository creates a new UserRepository.
func NewUserRepository(pool *pgxpool.Pool) UserRepository {
	return &userRepository{pool: pool}
}

func (r *userRepository) CreateUser(ctx context.Context, email, passwordHash string) (*model.User, error) {
	var user model.User
	err := r.pool.QueryRow(ctx,
		`INSERT INTO users (email, password_hash) VALUES ($1, $2)
		 RETURNING id, email, password_hash, created_at`,
		email, passwordHash,
	).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}
	return &user, nil
}

func (r *userRepository) GetUserByEmail(ctx context.Context, email string) (*model.User, error) {
	var user model.User
	err := r.pool.QueryRow(ctx,
		`SELECT id, email, password_hash, created_at FROM users WHERE email = $1`,
		email,
	).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil // User not found
		}
		return nil, fmt.Errorf("failed to get user by email: %w", err)
	}
	return &user, nil
}

func (r *userRepository) GetUserByID(ctx context.Context, id uuid.UUID) (*model.User, error) {
	var user model.User
	err := r.pool.QueryRow(ctx,
		`SELECT id, email, password_hash, created_at FROM users WHERE id = $1`,
		id,
	).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get user by id: %w", err)
	}
	return &user, nil
}

func (r *userRepository) UpdateUserEmail(ctx context.Context, id uuid.UUID, newEmail string) (*model.User, error) {
	var user model.User
	err := r.pool.QueryRow(ctx,
		`UPDATE users
		 SET email = $1
		 WHERE id = $2
		 RETURNING id, email, password_hash, created_at`,
		newEmail, id,
	).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to update user email: %w", err)
	}

	return &user, nil
}

func (r *userRepository) UpdateUserPasswordHash(ctx context.Context, id uuid.UUID, passwordHash string) error {
	result, err := r.pool.Exec(ctx,
		`UPDATE users
		 SET password_hash = $1
		 WHERE id = $2`,
		passwordHash, id,
	)
	if err != nil {
		return fmt.Errorf("failed to update user password hash: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("user not found")
	}

	return nil
}
