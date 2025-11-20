package main

// const (
// 	gsaBaseURL      = "http://api.gsa.gov/travel/perdiem/v2"
// )

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
