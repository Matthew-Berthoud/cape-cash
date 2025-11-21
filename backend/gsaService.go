package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"sync"
)

type PerDiemRequest struct {
	ZipCode string `json:"zip_code"`
	Year    string `json:"year"`
}

type ZipCodeResponse struct {
	Rates []struct {
		Rate []struct {
			Zip    string `json:"zip"`
			City   string `json:"city"`
			County string `json:"county"`
			Months struct {
				Month []struct {
					Long  string `json:"long"`
					Value int    `json:"value"`
				} `json:"month"`
			} `json:"months"`
		} `json:"rate"`
	} `json:"rates"`
}

type MieResponse []struct {
	Total     float64 `json:"total"`
	Breakfast float64 `json:"breakfast"`
	Lunch     float64 `json:"lunch"`
	Dinner    float64 `json:"dinner"`
}

type CombinedResponse struct {
	LocationData *ZipCodeResponse `json:"location_data"`
	MealRates    *MieResponse     `json:"meal_rates"`
}

func (app *AppState) handlePerDiemProxy(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Only GET allowed", http.StatusMethodNotAllowed)
		return
	}

	params := r.URL.Query()
	zipCode := params.Get("zip_code")
	year := params.Get("year")

	if zipCode == "" || year == "" {
		http.Error(w, "Missing zip_code or year query parameter", http.StatusBadRequest)
		return
	}

	var (
		zipData ZipCodeResponse
		mieData MieResponse
		wg      sync.WaitGroup
		errOne  error
		errTwo  error
	)

	zipUrl := app.gsaBaseUrl + "/zip/" + zipCode + "/year/" + year
	mieUrl := app.gsaBaseUrl + "/conus/mie/" + year

	wg.Add(2)
	go func() {
		defer wg.Done()
		errOne = fetchJSON(app.client, zipUrl, app.gsaKey, &zipData)
	}()
	go func() {
		defer wg.Done()
		errTwo = fetchJSON(app.client, mieUrl, app.gsaKey, &mieData)
	}()
	wg.Wait()

	if errOne != nil || errTwo != nil {
		var specificErr error
		if errOne != nil {
			specificErr = fmt.Errorf("zipData fetch error: %w", errOne)
		} else {
			specificErr = fmt.Errorf("mieData fetch error: %w", errTwo)
		}
		http.Error(w, fmt.Sprintf("Failed to fetch upstream data. Error: %s", specificErr), http.StatusBadGateway)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(CombinedResponse{
		LocationData: &zipData,
		MealRates:    &mieData,
	}); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
	}
}

func fetchJSON(client *http.Client, rawURL string, apiKey string, target any) error {
	// 1. Parse the URL and add the API key as a query parameter
	parsedURL, err := url.Parse(rawURL)
	if err != nil {
		return fmt.Errorf("failed to parse URL: %w", err)
	}

	query := parsedURL.Query()
	query.Set("API_KEY", apiKey)
	parsedURL.RawQuery = query.Encode()

	finalURL := parsedURL.String()

	req, err := http.NewRequest(http.MethodGet, finalURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("upstream request failed with status: %d for URL: %s", resp.StatusCode, finalURL)
	}

	return json.NewDecoder(resp.Body).Decode(target)
}
