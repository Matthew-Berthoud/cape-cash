package main

import (
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
)

// handlePerDiemProxy acts as a reverse proxy, forwarding the request
// to the external Per Diem API and attaching the GSA_API_KEY.
func (app *AppState) handlePerDiemProxy(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondWithError(w, http.StatusMethodNotAllowed, "Only GET method is allowed")
		return
	}

	target, err := url.Parse(app.gsaBaseURL)
	if err != nil {
		log.Printf("Proxy error: Invalid base URL '%s': %v", app.gsaBaseURL, err)
		respondWithError(w, http.StatusInternalServerError, "Internal server error configuring proxy.")
		return
	}

	proxy := httputil.NewSingleHostReverseProxy(target)

	proxy.Director = func(req *http.Request) {
		req.URL.Scheme = target.Scheme
		req.URL.Host = target.Host
		req.Header.Set("X-API-KEY", app.gsaKey)
		req.URL.RawPath = r.URL.RawPath
		req.URL.RawQuery = r.URL.RawQuery
	}

	proxy.ServeHTTP(w, r)
}
