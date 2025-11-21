package main

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

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

type ParseReceiptResponse struct {
	Status  string            `json:"status"`
	Data    ParsedReceiptData `json:"data"`
	Message string            `json:"message,omitempty"`
}

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

	var parseResult ParseReceiptResponse
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
	fmt.Println()
	fmt.Println("Amount", parsedData.Amount)
	fmt.Println("Category", parsedData.Category)
	fmt.Println("Date", parsedData.Date)
	fmt.Println("Description", parsedData.Description)

	return &parsedData, nil
}
