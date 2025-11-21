package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"
)

type AppState struct {
	ctx        context.Context
	gsaKey     string
	geminiKey  string
	gsaBaseUrl string
	client     *http.Client
}

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}
	gsaKey := os.Getenv("GSA_API_KEY")
	if gsaKey == "" {
		log.Fatal("GSA_API_KEY environment variable not set")
	}
	geminiKey := os.Getenv("GEMINI_API_KEY")
	if geminiKey == "" {
		log.Fatal("GEMINI_API_KEY environment variable not set")
	}
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	app := AppState{
		ctx:        context.Background(),
		gsaKey:     gsaKey,
		geminiKey:  geminiKey,
		gsaBaseUrl: "https://api.gsa.gov/travel/perdiem/v2/rates",
		client:     &http.Client{},
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/parse-receipt", app.handleParseReceipt)
	mux.HandleFunc("/api/v1/perdiem", app.handlePerDiemProxy)

	log.Printf("Starting server on port %s...", port)
	if err := http.ListenAndServe(":"+port, enableCORS(mux)); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}

func enableCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Set CORS headers
		w.Header().Set("Access-Control-Allow-Origin", "*") // Be more restrictive in production
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")

		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		// Serve the next handler
		next.ServeHTTP(w, r)
	})
}

// respondWithError is a JSON error helper
func respondWithError(w http.ResponseWriter, code int, message string) {
	respondWithJSON(w, code, map[string]string{"error": message})
}

// respondWithJSON is a JSON response helper
func respondWithJSON(w http.ResponseWriter, code int, payload any) {
	response, err := json.Marshal(payload)
	if err != nil {
		log.Printf("Failed to marshal JSON response: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error": "Internal Server Error"}`))
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	w.Write(response)
}
