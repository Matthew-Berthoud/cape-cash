# cape-cash

## Run Locally

**Prerequisites:** [Node.js](https://formulae.brew.sh/formula/nvm), [Go](https://go.dev/doc/install)

### Backend

1. `cd backend`
2. Set the `GEMINI_API_KEY` in [backend/.env](backend/.env) to your Gemini API key
3. Set the `GSA_API_KEY` in [backend/.env](backend/.env) to your [GSA API key](https://open.gsa.gov/api/perdiem/#user-requirements)
4. `go mod tidy`
5. `go run main.go`

### Frontend

1. Install dependencies: `npm ci`
2. Run the app: `npm run dev`
