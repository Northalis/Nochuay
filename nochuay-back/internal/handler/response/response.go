package response

import (
	"encoding/json"
	"net/http"
)

// Response is the standardized API response wrapper.
type Response struct {
	Data  any    `json:"data"`
	Error *string `json:"error"`
}

// JSON sends a successful JSON response.
func JSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(Response{
		Data:  data,
		Error: nil,
	})
}

// Error sends an error JSON response.
func Error(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(Response{
		Data:  nil,
		Error: &message,
	})
}
