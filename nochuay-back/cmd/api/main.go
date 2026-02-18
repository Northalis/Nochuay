package main

import (
	"log"
	"net/http"

	"nochuay.app/api/internal/config"
	"nochuay.app/api/internal/db"
	"nochuay.app/api/internal/handler"
	"nochuay.app/api/internal/handler/response"
	"nochuay.app/api/internal/middleware"
	"nochuay.app/api/internal/repository"
	"nochuay.app/api/internal/service"
)

func main() {
	// 1. Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	// 2. Connect to database
	pool, err := db.Connect(cfg.DSN())
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer pool.Close()
	log.Println("Connected to database")

	// 3. Initialize layers (Repository -> Service -> Handler)
	userRepo := repository.NewUserRepository(pool)
	pageRepo := repository.NewPageRepository(pool)

	authService := service.NewAuthService(userRepo, cfg.JWTSecret)
	pageService := service.NewPageService(pageRepo)

	authHandler := handler.NewAuthHandler(authService)
	pageHandler := handler.NewPageHandler(pageService)

	// Auth middleware
	authMiddleware := middleware.Auth(authService)

	// 4. Setup router
	mux := http.NewServeMux()

	// Health check
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		response.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	// Auth routes (public)
	mux.HandleFunc("POST /auth/signup", authHandler.Signup)
	mux.HandleFunc("POST /auth/login", authHandler.Login)

	// Page routes (protected)
	mux.Handle("POST /pages", authMiddleware(http.HandlerFunc(pageHandler.CreatePage)))
	mux.Handle("GET /pages/{id}", authMiddleware(http.HandlerFunc(pageHandler.GetPage)))
	mux.Handle("PATCH /pages/{id}", authMiddleware(http.HandlerFunc(pageHandler.UpdatePage)))
	mux.Handle("DELETE /pages/{id}", authMiddleware(http.HandlerFunc(pageHandler.DeletePage)))

	// 5. CORS middleware
	corsHandler := corsMiddleware(mux, cfg.CORSAllowedOrigins)

	// 6. Start server
	log.Printf("Nochuay API server starting on :%s", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, corsHandler); err != nil {
		log.Fatalf("failed to start server: %v", err)
	}
}

// corsMiddleware adds CORS headers to responses.
func corsMiddleware(next http.Handler, allowedOrigins string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", allowedOrigins)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
