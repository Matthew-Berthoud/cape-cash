import { Trip, PerDiemRates } from "../types";

// Your new Go backend URL
const API_BASE_URL = "http://localhost:8080/api/v1";

/**
 * Calls your Go backend to fetch per diem rates.
 * The backend handles the GSA API calls and error parsing.
 */
export async function fetchPerDiemRates(
  startDate: string,
  location: Trip["location"],
): Promise<PerDiemRates> {
  // 1. Build the query parameters for our Go backend
  const params = new URLSearchParams({
    startDate: startDate,
  });
  if (location.zip) {
    params.set("zip", location.zip);
  } else if (location.city && location.state) {
    params.set("city", location.city);
    params.set("state", location.state);
  } else {
    // This check is still valid, as the backend expects one or the other
    throw new Error("A valid location (City/State or ZIP Code) is required.");
  }

  try {
    // 2. Make a single GET request to your backend endpoint
    const response = await fetch(
      `${API_BASE_URL}/per-diem?${params.toString()}`,
    );

    const data = await response.json();

    if (!response.ok) {
      // 3. If the response is not ok, the 'data' object will be
      // { "error": "..." } from our Go backend. Throw this error.
      throw new Error(data.error || "Failed to fetch per diem rates");
    }

    // 4. On success, the Go backend returns the PerDiemRates object directly
    return data as PerDiemRates;
  } catch (error) {
    console.error("Failed to fetch per diem rates from backend:", error);
    // Re-throw the error (which now contains the friendly message
    // from our Go backend, like "Could not find rates...")
    // so the UI component can catch it and display it.
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("An unknown error occurred while fetching per diem rates");
  }
}
