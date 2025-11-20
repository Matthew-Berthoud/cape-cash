import { Trip, PerDiemRates, LodgingRate } from "../types";

// The Proxy Endpoint
const PROXY_BASE_URL = "http://localhost:8080/api/v1/per-diem";

// --- Internal Types for Raw GSA API Response ---
interface GSARateDetail {
  month: string;
  value: string | number; // GSA sometimes returns strings "96"
}

interface GSAStandardRate {
  zip: string;
  city: string;
  state: string;
  standardRate: string;
  meals: string | number; // M&IE Total
  rate: GSARateDetail[]; // Lodging breakdown
}

interface GSAResponse {
  rates?: GSAStandardRate[];
  error?: {
    message: string;
  };
}

/**
 * fetchPerDiemRates
 * 1. Calculates the fiscal year from startDate.
 * 2. Constructs the GSA API endpoint path (Zip or City/State).
 * 3. Calls the local Proxy, which forwards to GSA.
 * 4. Transforms the raw GSA JSON into our App's PerDiemRates format.
 */
export async function fetchPerDiemRates(
  startDate: string,
  location: Trip["location"],
): Promise<PerDiemRates> {
  // 1. Get Year
  const year = getYearFromDate(startDate);
  if (!year) {
    throw new Error("Invalid Start Date");
  }

  // 2. Build GSA Path
  // The proxy is at /api/v1/per-diem. We append the GSA path logic here.
  // GSA API Pattern: rates/zip/{zip}/year/{year} OR rates/city/{city}/state/{state}/year/{year}

  let gsaPath = "";

  if (location.zip) {
    gsaPath = `rates/zip/${encodeURIComponent(location.zip)}/year/${year}`;
  } else if (location.city && location.state) {
    const cityEncoded = encodeURIComponent(location.city);
    const stateEncoded = encodeURIComponent(location.state);
    gsaPath = `rates/city/${cityEncoded}/state/${stateEncoded}/year/${year}`;
  } else {
    throw new Error("Location must have either a Zip Code or City & State.");
  }

  // 3. Fetch via Proxy
  // Note: We treat the proxy base as the root, appending the GSA path.
  // Ensure your backend proxy handles the path forwarding correctly.
  const fullUrl = `${PROXY_BASE_URL}/${gsaPath}`;

  try {
    const response = await fetch(fullUrl);

    if (!response.ok) {
      // Handle HTTP errors (404, 500, etc)
      if (response.status === 404) {
        throw new Error("Rates not found for this location/year.");
      }
      throw new Error(`Server Error: ${response.statusText}`);
    }

    const rawData: GSAResponse = await response.json();

    // 4. Process Data
    return processGSAResponse(rawData);
  } catch (error) {
    console.error("GSA Fetch Error:", error);
    if (error instanceof Error) throw error;
    throw new Error("Unknown error occurred fetching rates");
  }
}

/**
 * Transforms raw GSA JSON into our clean PerDiemRates object.
 */
function processGSAResponse(data: GSAResponse): PerDiemRates {
  // Check if GSA returned a specific error message inside JSON
  if (data.error) {
    throw new Error(data.error.message);
  }

  // Validate we actually got rates
  if (!data.rates || data.rates.length === 0) {
    throw new Error("No rates found for this location.");
  }

  const primaryRate = data.rates[0];

  // 1. Extract M&IE (Meals)
  // GSA returns this as a string sometimes (e.g. "69")
  const mieValue = Number(primaryRate.meals);
  if (isNaN(mieValue)) {
    throw new Error(`Invalid M&IE value received: ${primaryRate.meals}`);
  }

  // 2. Extract Lodging by Month
  const lodgingByMonth: LodgingRate[] = (primaryRate.rate || []).map((r) => ({
    month: r.month, // GSA returns "1", "2", etc.
    value: Number(r.value),
  }));

  return {
    mie: mieValue,
    lodgingByMonth: lodgingByMonth,
  };
}

// Utility to grab year from YYYY-MM-DD
function getYearFromDate(dateString: string): number {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return 0;
  return d.getFullYear();
}
