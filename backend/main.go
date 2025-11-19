package main

import (
	"context"
	// "encoding/json"
	"fmt"
	// "io"
	"log"
	// "net/http"
	// "net/url"
	"os"
	// "slices"
	// "strconv"
	// "strings"
	// "time"

	"github.com/joho/godotenv"
	// "golang.org/x/sync/errgroup"
	// "google.golang.org/api/option"
	"google.golang.org/genai"
)

// func main() {
// 	err := godotenv.Load()
// 	if err != nil {
// 		log.Fatal("Error loading .env file")
// 	}
//
// 	gsaKey := os.Getenv("GSA_API_KEY")
// 	geminiKey := os.Getenv("GEMINI_API_KEY")
//
// 	if gsaKey == "" {
// 		log.Fatal("GSA_API_KEY environment variable not set")
// 	}
// 	if geminiKey == "" {
// 		log.Fatal("GEMINI_API_KEY environment variable not set")
// 	}
//
// 	ctx := context.Background()
// 	// The client gets the API key from the environment variable `GEMINI_API_KEY`.
// 	client, err := genai.NewClient(ctx, nil)
// 	if err != nil {
// 		log.Fatal(err)
// 	}
//
// 	result, err := client.Models.GenerateContent(
// 		ctx,
// 		"gemini-2.5-flash",
// 		genai.Text("Explain how AI works in a few words"),
// 		nil,
// 	)
// 	if err != nil {
// 		log.Fatal(err)
// 	}
// 	fmt.Println(result.Text())
// }

// --- Constants ---

// const (
// 	gsaBaseURL      = "http://api.gsa.gov/travel/perdiem/v2"
// 	geminiModel     = "gemini-2.5-flash"
// 	defaultCategory = "8190 G&A Office supplies"
// 	maxRetries      = 3
// )

// CATEGORIES mimics the TypeScript constant
// var CATEGORIES = []string{
// 	"5400 Direct Travel",
// 	"5450 Direct Lodging",
// 	"5500 Direct Meals and Incidental",
// 	"6120 Fringe Staff Education",
// 	"7336 OVERHEAD COSTS:OH Seminars/Trainings",
// 	"7580 OH Travel",
// 	"7585 OH Business Meals",
// 	"8190 G&A Office supplies",
// 	"8197 G&A Office parking/tolls",
// 	"8207 G&A Conference/Seminar",
// 	"8231 BD Travel",
// 	"8232 BD Meals",
// 	"8320 G&A Travel",
// 	"8321 G&A Business meals",
// 	"8330 G&A Office supplies",
// 	"9080 Employee Morale",
// }

// --- Structs for API Payloads ---

// --- Gemini Structs ---

// ParseReceiptRequest is what we expect from our frontend
// type ParseReceiptRequest struct {
// 	Base64Image string `json:"base64Image"`
// }
//
// // ParsedReceiptData matches the Gemini schema and TS type
// type ParsedReceiptData struct {
// 	Date        string  `json:"date"`
// 	Description string  `json:"description"`
// 	Amount      float64 `json:"amount"`
// 	Category    string  `json:"category"`
// }
//
// // ParseResult matches the TS type
// type ParseResult struct {
// 	Status  string            `json:"status"`
// 	Data    ParsedReceiptData `json:"data"`
// 	Message string            `json:"message,omitempty"`
// }
//
// // defaultParsedData creates the default failure response data
// func defaultParsedData() ParsedReceiptData {
// 	return ParsedReceiptData{
// 		Date:        time.Now().Format("2006-01-02"),
// 		Description: "Manual Entry Required",
// 		Amount:      0.0,
// 		Category:    defaultCategory,
// 	}
// }
//
// --- GSA Structs ---

// PerDiemRates matches the TS type
// type PerDiemRates struct {
// 	LodgingByMonth []LodgingRate `json:"lodgingByMonth"`
// 	MIE            float64       `json:"mie"` // M&IE
// }
//
// // LodgingRate is a sub-struct for PerDiemRates
// type LodgingRate struct {
// 	Month string  `json:"month"`
// 	Value float64 `json:"value"`
// }

// gsaResponse is used to unmarshal the raw GSA API responses
// type gsaResponse struct {
// 	Rates []struct {
// 		Rate []struct {
// 			Month string `json:"month"`
// 			Value string `json:"value"` // GSA returns value as string
// 		} `json:"rate"`
// 	} `json:"rates"`
// 	Error *struct {
// 		Message string `json:"message"`
// 	} `json:"error"`
// }

// --- Global App State ---

// AppState holds our API keys and clients
// type AppState struct {
// 	gsaKey       string
// 	geminiKey    string
// 	gsaClient    *http.Client
// 	geminiClient *genai.GenerativeModel
// }

// --- Main Function ---

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

	ctx := context.Background()
	// The client gets the API key from the environment variable `GEMINI_API_KEY`.
	client, err := genai.NewClient(ctx, nil)
	if err != nil {
		log.Fatal(err)
	}

	bytes, err := os.ReadFile("/Users/matthewberthoud/Downloads/receipts/cooking_class_10.20.25.png")
	if err != nil {
		log.Fatal(err)
	}

	parts := []*genai.Part{
		genai.NewPartFromBytes(bytes, "image/jpeg"),
		genai.NewPartFromText("What is this receipt for, and how much was spent total?"),
	}
	contents := []*genai.Content{
		genai.NewContentFromParts(parts, genai.RoleUser),
	}

	result, err := client.Models.GenerateContent(
		ctx,
		"gemini-2.5-flash",
		contents,
		nil,
	)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println(result.Text())

	// // Configure the model with the JSON schema
	// model := client.GenerativeModel(geminiModel)
	// model.GenerationConfig.ResponseMIMEType = "application/json"
	// model.GenerationConfig.ResponseSchema = buildReceiptSchema()
	//
	// // 3. Create AppState
	// app := &AppState{
	// 	gsaKey:       gsaKey,
	// 	geminiKey:    geminiKey,
	// 	gsaClient:    &http.Client{Timeout: 15 * time.Second},
	// 	geminiClient: model,
	// }
	//
	// // 4. Setup Routes
	// mux := http.NewServeMux()
	// mux.HandleFunc("/api/v1/parse-receipt", app.handleParseReceipt)
	// mux.HandleFunc("/api/v1/per-diem", app.handlePerDiem)
	//
	// // Use a middleware for CORS
	// handler := enableCORS(mux)
	//
	// // 5. Start Server
	// port := os.Getenv("PORT")
	// if port == "" {
	// 	port = "8080"
	// }
	// log.Printf("Starting server on port %s...", port)
	// if err := http.ListenAndServe(":"+port, handler); err != nil {
	// 	log.Fatalf("Server failed to start: %v", err)
	// }
}

// // --- CORS Middleware ---
//
// func enableCORS(next http.Handler) http.Handler {
// 	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
// 		// Set CORS headers
// 		w.Header().Set("Access-Control-Allow-Origin", "*") // Be more restrictive in production
// 		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
// 		w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
//
// 		// Handle preflight requests
// 		if r.Method == "OPTIONS" {
// 			w.WriteHeader(http.StatusOK)
// 			return
// 		}
//
// 		// Serve the next handler
// 		next.ServeHTTP(w, r)
// 	})
// }
//
// // --- Gemini Handler & Logic ---
//
// // buildReceiptSchema defines the exact JSON schema for Gemini
// func buildReceiptSchema() *genai.Schema {
// 	return &genai.Schema{
// 		Type: genai.TypeObject,
// 		Properties: map[string]*genai.Schema{
// 			"date": {
// 				Type:        genai.TypeString,
// 				Description: "The date of the transaction in 'YYYY-MM-DD' format. If the year is not present, assume the current year.",
// 			},
// 			"description": {
// 				Type:        genai.TypeString,
// 				Description: "A concise description of the vendor or purchase (e.g., 'Starbucks Coffee', 'Uber Ride', 'Walmart').",
// 			},
// 			"amount": {
// 				Type:        genai.TypeNumber,
// 				Description: "The final total amount as a number, without currency symbols or commas.",
// 			},
// 			"category": {
// 				Type:        genai.TypeString,
// 				Description: "Based on the vendor and items, choose the most appropriate category from the provided list.",
// 				Enum:        CATEGORIES,
// 			},
// 		},
// 		Required: []string{"date", "description", "amount", "category"},
// 	}
// }
//
// func (app *AppState) handleParseReceipt(w http.ResponseWriter, r *http.Request) {
// 	if r.Method != http.MethodPost {
// 		respondWithError(w, http.StatusMethodNotAllowed, "Only POST method is allowed")
// 		return
// 	}
//
// 	// 1. Decode frontend request
// 	var req ParseReceiptRequest
// 	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
// 		respondWithError(w, http.StatusBadRequest, "Invalid request body")
// 		return
// 	}
// 	defer r.Body.Close()
//
// 	if req.Base64Image == "" {
// 		respondWithError(w, http.StatusBadRequest, "Missing 'base64Image' in request")
// 		return
// 	}
//
// 	// 2. Prepare parts for Gemini
// 	imagePart := genai.ImageData("image/jpeg", []byte(req.Base64Image))
// 	textPart := genai.Text("Analyze the provided receipt image. Extract the transaction date, a short description of the vendor, the total amount, and select the best category from the list. If it is a grocery receipt it's probably 9080 Employee Morale. The default category should be '8190 G&A Office supplies' if unsure.")
//
// 	// 3. Call Gemini with retry logic
// 	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second) // 30-sec timeout for all retries
// 	defer cancel()
//
// 	var lastErr error
// 	for attempt := 1; attempt <= maxRetries; attempt++ {
// 		log.Printf("Parsing receipt: Attempt %d of %d...", attempt, maxRetries)
// 		resp, err := app.geminiClient.GenerateContent(ctx, imagePart, textPart)
// 		if err != nil {
// 			lastErr = fmt.Errorf("gemini error on attempt %d: %w", attempt, err)
// 			log.Println(lastErr)
// 			time.Sleep(time.Duration(attempt) * time.Second) // Exponential backoff
// 			continue
// 		}
//
// 		if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
// 			lastErr = fmt.Errorf("gemini returned no content on attempt %d", attempt)
// 			log.Println(lastErr)
// 			continue
// 		}
//
// 		// 4. Parse successful response
// 		var parsedData ParsedReceiptData
//
// 		// ********************
// 		// *** CORRECTED LOGIC ***
// 		// ********************
// 		part := resp.Candidates[0].Content.Parts[0]
//
// 		// The response part should be genai.Text, which holds the JSON string
// 		if text, ok := part.(genai.Text); ok {
// 			// Convert the genai.Text to a string, then to a byte slice for unmarshaling
// 			jsonString := string(text)
// 			if err := json.Unmarshal([]byte(jsonString), &parsedData); err != nil {
// 				// This handles cases where Gemini might return malformed JSON
// 				lastErr = fmt.Errorf("failed to unmarshal JSON string from gemini on attempt %d: %w. JSON: %s", attempt, err, jsonString)
// 				log.Println(lastErr)
// 				continue
// 			}
// 		} else {
// 			// This should not happen if we requested JSON, but good to check
// 			lastErr = fmt.Errorf("gemini response part was not of type genai.Text on attempt %d", attempt)
// 			log.Println(lastErr)
// 			continue
// 		}
//
// 		// 5. Validate category
// 		if !contains(CATEGORIES, parsedData.Category) {
// 			log.Printf("Gemini returned non-standard category: %s. Defaulting.", parsedData.Category)
// 			parsedData.Category = defaultCategory
// 		}
//
// 		log.Println("Successfully parsed receipt")
// 		// 6. Send success response to frontend
// 		respondWithJSON(w, http.StatusOK, ParseResult{
// 			Status: "success",
// 			Data:   parsedData,
// 		})
// 		return
// 	}
//
// 	// 7. All retries failed, send error response to frontend
// 	log.Printf("All retry attempts failed. Last error: %v", lastErr)
// 	respondWithJSON(w, http.StatusInternalServerError, ParseResult{
// 		Status:  "error",
// 		Data:    defaultParsedData(),
// 		Message: fmt.Sprintf("Failed to parse receipt after %d attempts. Last error: %v", maxRetries, lastErr),
// 	})
// }
//
// // --- GSA Handler & Logic ---
//
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
//
// // fetchGSARates is a helper to call the GSA API
// func (app *AppState) fetchGSARates(ctx context.Context, endpoint string, target any) error {
// 	fullURL := fmt.Sprintf("%s/%s", gsaBaseURL, endpoint)
// 	req, err := http.NewRequestWithContext(ctx, http.MethodGet, fullURL, nil)
// 	if err != nil {
// 		return fmt.Errorf("failed to create request for %s: %w", endpoint, err)
// 	}
//
// 	req.Header.Set("X-API-KEY", app.gsaKey)
// 	req.Header.Set("Accept", "application/json")
//
// 	resp, err := app.gsaClient.Do(req)
// 	if err != nil {
// 		return fmt.Errorf("request failed for %s: %w", endpoint, err)
// 	}
// 	defer resp.Body.Close()
//
// 	body, err := io.ReadAll(resp.Body)
// 	if err != nil {
// 		return fmt.Errorf("failed to read response body for %s: %w", endpoint, err)
// 	}
//
// 	if resp.StatusCode != http.StatusOK {
// 		return fmt.Errorf("GSA API error for %s (%d): %s", endpoint, resp.StatusCode, string(body))
// 	}
//
// 	if err := json.Unmarshal(body, target); err != nil {
// 		return fmt.Errorf("failed to parse JSON for %s: %w", endpoint, err)
// 	}
//
// 	// Check for API-level errors nested in the JSON
// 	if v, ok := target.(*gsaResponse); ok && v.Error != nil {
// 		return fmt.Errorf("GSA API returned error: %s", v.Error.Message)
// 	}
//
// 	return nil
// }
//
// // processGSAResponses combines the two GSA calls into our final struct
// func processGSAResponses(lodgingData, mieData gsaResponse) (*PerDiemRates, error) {
// 	if len(lodgingData.Rates) == 0 || len(lodgingData.Rates[0].Rate) == 0 {
// 		return nil, fmt.Errorf("no per diem rates found for the specified location")
// 	}
// 	if len(mieData.Rates) == 0 || len(mieData.Rates[0].Rate) == 0 {
// 		return nil, fmt.Errorf("no M&IE rates found for the year")
// 	}
//
// 	var result PerDiemRates
//
// 	// Process Lodging
// 	for _, r := range lodgingData.Rates[0].Rate {
// 		value, err := strconv.ParseFloat(r.Value, 64)
// 		if err != nil {
// 			return nil, fmt.Errorf("invalid lodging rate value '%s': %w", r.Value, err)
// 		}
// 		result.LodgingByMonth = append(result.LodgingByMonth, LodgingRate{
// 			Month: r.Month,
// 			Value: value,
// 		})
// 	}
//
// 	// Process M&IE
// 	mieValue, err := strconv.ParseFloat(mieData.Rates[0].Rate[0].Value, 64)
// 	if err != nil {
// 		return nil, fmt.Errorf("invalid M&IE rate value '%s': %w", mieData.Rates[0].Rate[0].Value, err)
// 	}
// 	result.MIE = mieValue
//
// 	return &result, nil
// }
//
// // --- Utility Functions ---
//
// // getYear parses a "YYYY-MM-DD" string and returns the year
// func getYear(dateString string) (int, error) {
// 	t, err := time.Parse("2006-01-02", dateString)
// 	if err != nil {
// 		return 0, err
// 	}
// 	return t.Year(), nil
// }
//
// // contains checks if a string is in a slice
// func contains(slice []string, item string) bool {
// 	return slices.Contains(slice, item)
// }
//
// // respondWithError is a JSON error helper
// func respondWithError(w http.ResponseWriter, code int, message string) {
// 	respondWithJSON(w, code, map[string]string{"error": message})
// }
//
// // respondWithJSON is a JSON response helper
// func respondWithJSON(w http.ResponseWriter, code int, payload any) {
// 	response, err := json.Marshal(payload)
// 	if err != nil {
// 		log.Printf("Failed to marshal JSON response: %v", err)
// 		w.WriteHeader(http.StatusInternalServerError)
// 		w.Write([]byte(`{"error": "Internal Server Error"}`))
// 		return
// 	}
// 	w.Header().Set("Content-Type", "application/json")
// 	w.WriteHeader(code)
// 	w.Write(response)
// }
