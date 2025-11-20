package main

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"
)

type ParseResult struct {
	Status  string            `json:"status"`
	Data    ParsedReceiptData `json:"data"`
	Message string            `json:"message,omitempty"`
}

type AppState struct {
	ctx       context.Context
	gsaKey    string
	geminiKey string
}

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}
	gsaKey := os.Getenv("GSA_API_KEY")
	geminiKey := os.Getenv("GEMINI_API_KEY")
	if gsaKey == "" {
		log.Fatal("GSA_API_KEY environment variable not set")
	}
	if geminiKey == "" {
		log.Fatal("GEMINI_API_KEY environment variable not set")
	}

	app := AppState{
		ctx:       context.Background(),
		gsaKey:    gsaKey,
		geminiKey: geminiKey,
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/parse-receipt", app.handleParseReceipt)
	// mux.HandleFunc("/api/v1/per-diem", handlePerDiem)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
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

// // --- Gemini Handler & Logic ---
//
// // buildReceiptSchema defines the exact JSON schema for Gemini
//
//	func buildReceiptSchema() *genai.Schema {
//		return &genai.Schema{
//			Type: genai.TypeObject,
//			Properties: map[string]*genai.Schema{
//				"date": {
//					Type:        genai.TypeString,
//					Description: "The date of the transaction in 'YYYY-MM-DD' format. If the year is not present, assume the current year.",
//				},
//				"description": {
//					Type:        genai.TypeString,
//					Description: "A concise description of the vendor or purchase (e.g., 'Starbucks Coffee', 'Uber Ride', 'Walmart').",
//				},
//				"amount": {
//					Type:        genai.TypeNumber,
//					Description: "The final total amount as a number, without currency symbols or commas.",
//				},
//				"category": {
//					Type:        genai.TypeString,
//					Description: "Based on the vendor and items, choose the most appropriate category from the provided list.",
//					Enum:        CATEGORIES,
//				},
//			},
//			Required: []string{"date", "description", "amount", "category"},
//		}
//	}
func (app *AppState) handleParseReceipt(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondWithError(w, http.StatusMethodNotAllowed, "Only POST method is allowed")
		return
	}

	// 1. Decode frontend request
	var req ParseReceiptRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	defer r.Body.Close()

	if req.Base64Image == "" {
		respondWithError(w, http.StatusBadRequest, "Missing 'base64Image' in request")
		return
	}

	base64String := req.Base64Image
	imageBytes, err := base64.StdEncoding.DecodeString(base64String)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Cannot decode base64")
		return
	}

	var parseResult ParseResult
	status := http.StatusOK
	parsedData, err := parseReceipt(app.ctx, imageBytes)
	if err != nil {
		parseResult.Data = DEFAULT_PARSED_DATA
		parseResult.Message = fmt.Sprint(err)
		parseResult.Status = "error"
		status = http.StatusBadRequest
	} else {
		parseResult.Data = *parsedData
		parseResult.Status = "success"
	}
	respondWithJSON(w, status, parseResult)
}

// --- GSA Handler & Logic ---

// func (app *AppState) handlePerDiem(w http.ResponseWriter, r *http.Request) {
// 	if r.Method != http.MethodGet {
// 		respondWithError(w, http.StatusMethodNotAllowed, "Only GET method is allowed")
// 		return
// 	}
//
// 	// 1. Get query parameters
// 	q := r.URL.Query()
// 	startDate := q.Get("startDate")
// 	zip := q.Get("zip")
// 	city := q.Get("city")
// 	state := q.Get("state")
//
// 	if startDate == "" {
// 		respondWithError(w, http.StatusBadRequest, "Missing 'startDate' query parameter")
// 		return
// 	}
//
// 	// 2. Get year from startDate
// 	year, err := getYear(startDate)
// 	if err != nil {
// 		respondWithError(w, http.StatusBadRequest, fmt.Sprintf("Invalid 'startDate': %v", err))
// 		return
// 	}
//
// 	// 3. Build location query
// 	var locationQuery string
// 	if zip != "" {
// 		locationQuery = fmt.Sprintf("zip/%s", url.PathEscape(zip))
// 	} else if city != "" && state != "" {
// 		locationQuery = fmt.Sprintf("city/%s/state/%s", url.PathEscape(city), url.PathEscape(state))
// 	} else {
// 		respondWithError(w, http.StatusBadRequest, "A valid location (City/State or ZIP Code) is required.")
// 		return
// 	}
//
// 	// 4. Define endpoints
// 	lodgingEndpoint := fmt.Sprintf("rates/%s/year/%d", locationQuery, year)
// 	mieEndpoint := fmt.Sprintf("rates/conus/mie/%d", year) // M&IE endpoint
//
// 	// 5. Fetch rates in parallel
// 	var lodgingData gsaResponse
// 	var mieData gsaResponse
//
// 	g, ctx := errgroup.WithContext(r.Context())
//
// 	// Fetch Lodging
// 	g.Go(func() error {
// 		return app.fetchGSARates(ctx, lodgingEndpoint, &lodgingData)
// 	})
//
// 	// Fetch M&IE
// 	g.Go(func() error {
// 		return app.fetchGSARates(ctx, mieEndpoint, &mieData)
// 	})
//
// 	// Wait for both requests to complete
// 	if err := g.Wait(); err != nil {
// 		// Check for specific "not found" errors
// 		if strings.Contains(err.Error(), "404") || strings.Contains(err.Error(), "No per diem rates") {
// 			respondWithError(w, http.StatusNotFound, "Could not find rates for this location. Please check spelling or try a ZIP code.")
// 			return
// 		}
// 		// Other errors
// 		respondWithError(w, http.StatusInternalServerError, fmt.Sprintf("Failed to fetch GSA rates: %v", err))
// 		return
// 	}
//
// 	// 6. Process and combine results
// 	result, err := processGSAResponses(lodgingData, mieData)
// 	if err != nil {
// 		respondWithError(w, http.StatusInternalServerError, fmt.Sprintf("Failed to process GSA data: %v", err))
// 		return
// 	}
//
// 	// 7. Send success response
// 	respondWithJSON(w, http.StatusOK, result)
// }

// // fetchGSARates is a helper to call the GSA API
//
//	func (app *AppState) fetchGSARates(ctx context.Context, endpoint string, target any) error {
//		fullURL := fmt.Sprintf("%s/%s", gsaBaseURL, endpoint)
//		req, err := http.NewRequestWithContext(ctx, http.MethodGet, fullURL, nil)
//		if err != nil {
//			return fmt.Errorf("failed to create request for %s: %w", endpoint, err)
//		}
//
//		req.Header.Set("X-API-KEY", app.gsaKey)
//		req.Header.Set("Accept", "application/json")
//
//		resp, err := app.gsaClient.Do(req)
//		if err != nil {
//			return fmt.Errorf("request failed for %s: %w", endpoint, err)
//		}
//		defer resp.Body.Close()
//
//		body, err := io.ReadAll(resp.Body)
//		if err != nil {
//			return fmt.Errorf("failed to read response body for %s: %w", endpoint, err)
//		}
//
//		if resp.StatusCode != http.StatusOK {
//			return fmt.Errorf("GSA API error for %s (%d): %s", endpoint, resp.StatusCode, string(body))
//		}
//
//		if err := json.Unmarshal(body, target); err != nil {
//			return fmt.Errorf("failed to parse JSON for %s: %w", endpoint, err)
//		}
//
//		// Check for API-level errors nested in the JSON
//		if v, ok := target.(*gsaResponse); ok && v.Error != nil {
//			return fmt.Errorf("GSA API returned error: %s", v.Error.Message)
//		}
//
//		return nil
//	}
//
// // processGSAResponses combines the two GSA calls into our final struct
//
//	func processGSAResponses(lodgingData, mieData gsaResponse) (*PerDiemRates, error) {
//		if len(lodgingData.Rates) == 0 || len(lodgingData.Rates[0].Rate) == 0 {
//			return nil, fmt.Errorf("no per diem rates found for the specified location")
//		}
//		if len(mieData.Rates) == 0 || len(mieData.Rates[0].Rate) == 0 {
//			return nil, fmt.Errorf("no M&IE rates found for the year")
//		}
//
//		var result PerDiemRates
//
//		// Process Lodging
//		for _, r := range lodgingData.Rates[0].Rate {
//			value, err := strconv.ParseFloat(r.Value, 64)
//			if err != nil {
//				return nil, fmt.Errorf("invalid lodging rate value '%s': %w", r.Value, err)
//			}
//			result.LodgingByMonth = append(result.LodgingByMonth, LodgingRate{
//				Month: r.Month,
//				Value: value,
//			})
//		}
//
//		// Process M&IE
//		mieValue, err := strconv.ParseFloat(mieData.Rates[0].Rate[0].Value, 64)
//		if err != nil {
//			return nil, fmt.Errorf("invalid M&IE rate value '%s': %w", mieData.Rates[0].Rate[0].Value, err)
//		}
//		result.MIE = mieValue
//
//		return &result, nil
//	}
//
// // --- Utility Functions ---
//
// // getYear parses a "YYYY-MM-DD" string and returns the year
//
//	func getYear(dateString string) (int, error) {
//		t, err := time.Parse("2006-01-02", dateString)
//		if err != nil {
//			return 0, err
//		}
//		return t.Year(), nil
//	}
//
// // contains checks if a string is in a slice
//
//	func contains(slice []string, item string) bool {
//		return slices.Contains(slice, item)
//	}
//
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
