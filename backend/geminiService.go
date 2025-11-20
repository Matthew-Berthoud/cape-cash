package main

import (
	"context"
	"encoding/json"
	"fmt"
	// "io"
	// "net/http"
	// "net/url"
	// "slices"
	// "strconv"
	// "strings"
	"time"

	// "golang.org/x/sync/errgroup"
	// "google.golang.org/api/option"
	"google.golang.org/genai"
)

const (
	PROMPT = "Analyze the provided receipt image. Extract the transaction date, a short description of the vendor, the total amount, and select the best category from the list. If it is a grocery receipt it's probably 9080 Employee Morale. The default category should be '8190 G&A Office supplies' if unsure."
	MODEL  = "gemini-2.5-flash"
)

var CATEGORIES = []string{
	"5400 Direct Travel",
	"5450 Direct Lodging",
	"5500 Direct Meals and Incidental",
	"6120 Fringe Staff Education",
	"7336 OVERHEAD COSTS:OH Seminars/Trainings",
	"7580 OH Travel",
	"7585 OH Business Meals",
	"8190 G&A Office supplies",
	"8197 G&A Office parking/tolls",
	"8207 G&A Conference/Seminar",
	"8231 BD Travel",
	"8232 BD Meals",
	"8320 G&A Travel",
	"8321 G&A Business meals",
	"8330 G&A Office supplies",
	"9080 Employee Morale",
}

var DEFAULT_PARSED_DATA = ParsedReceiptData{
	Date:        time.Now().Format(time.DateOnly),
	Description: "",
	Amount:      0.0,
	Category:    "8330 G&A Office supplies",
}

type ParseReceiptRequest struct {
	Base64Image string `json:"base64Image"`
}

type ParsedReceiptData struct {
	Date        string  `json:"date"`
	Description string  `json:"description"`
	Amount      float64 `json:"amount"`
	Category    string  `json:"category"`
}

type ParseResult struct {
	Status  string            `json:"status"`
	Data    ParsedReceiptData `json:"data"`
	Message string            `json:"message,omitempty"`
}

func parseReceipt(ctx context.Context, bytes []byte) (*ParsedReceiptData, error) {

	client, err := genai.NewClient(ctx, nil)
	if err != nil {
		return &DEFAULT_PARSED_DATA, err
	}

	parts := []*genai.Part{
		genai.NewPartFromBytes(bytes, "image/jpeg"),
		genai.NewPartFromText(PROMPT),
	}
	contents := []*genai.Content{
		genai.NewContentFromParts(parts, genai.RoleUser),
	}
	config := &genai.GenerateContentConfig{
		ResponseMIMEType: "application/json",
		ResponseJsonSchema: &genai.Schema{
			Type: genai.TypeObject,
			Properties: map[string]*genai.Schema{
				"date": {
					Type:        genai.TypeString,
					Description: "The date of the transaction in 'YYYY-MM-DD' format. If the year is not present, assume the current year.",
				},
				"description": {
					Type:        genai.TypeString,
					Description: "A concise description of the vendor or purchase (e.g., 'Starbucks Coffee', 'Uber Ride', 'Walmart').",
				},
				"amount": {
					Type:        genai.TypeNumber,
					Description: "The final total amount as a number, without currency symbols or commas.",
				},
				"category": {
					Type:        genai.TypeString,
					Description: "Based on the vendor and items, choose the most appropriate category from the provided list.",
					Enum:        CATEGORIES,
				},
			},
			Required: []string{"date", "description", "amount", "category"},
		},
	}

	result, err := client.Models.GenerateContent(
		ctx,
		MODEL,
		contents,
		config,
	)
	if err != nil {
		return &DEFAULT_PARSED_DATA, err
	}

	var parsedData ParsedReceiptData
	err = json.Unmarshal([]byte(result.Text()), &parsedData)
	if err != nil {
		return &DEFAULT_PARSED_DATA, err
	}

	// TODO: comment out
	fmt.Println("Amount", parsedData.Amount)
	fmt.Println("Category", parsedData.Category)
	fmt.Println("Date", parsedData.Date)
	fmt.Println("Description", parsedData.Description)

	return &parsedData, nil
}

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
