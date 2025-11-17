import { Trip, PerDiemRates } from "../types";

// 1. CORRECTED: The Base URL from the documentation is .../api/v2
const BASE_URL = "http://api.gsa.gov/travel/perdiem/v2";

function getYear(dateString: string): number {
  const date = new Date(dateString);
  const year = date.getFullYear();
  return year;
}

/**
 * Note: Your GSA_API_KEY must be set in your environment (e.g., in a .env file).
 * For browsers, this requires a build tool (like Vite or Next.js) to expose it.
 */
async function fetchRates(endpoint: string) {
  const url = `${BASE_URL}/${endpoint}`;
  const apiKey = process.env.GSA_API_KEY;

  if (!apiKey) {
    throw new Error("GSA_API_KEY is not defined in environment variables.");
  }

  const response = await fetch(url, {
    headers: {
      "X-API-KEY": apiKey,
    },
  });

  if (!response.ok) {
    // Try to parse error response from API, if any
    try {
      const errorData = await response.json();
      if (errorData?.error?.message) {
        throw new Error(
          `GSA API Error: ${errorData.error.message} (Status: ${response.status})`,
        );
      }
    } catch (e) {
      // Fallback if error response isn't JSON
    }
    throw new Error(`GSA API request failed with status ${response.status}`);
  }

  const data = await response.json();

  // The v2 API nests the error message inside an 'error' object
  if (data.error) {
    throw new Error(`GSA API Error: ${data.error.message}`);
  }

  if (!data.rates || data.rates.length === 0) {
    throw new Error("No per diem rates found for the specified location.");
  }
  return data;
}

export async function fetchPerDiemRates(
  startDate: string,
  location: Trip["location"],
): Promise<PerDiemRates> {
  const year = getYear(startDate);
  let locationQuery: string;

  if (location.zip) {
    locationQuery = `zip/${location.zip}`;
  } else if (location.city && location.state) {
    locationQuery = `city/${encodeURIComponent(location.city)}/state/${encodeURIComponent(location.state)}`;
  } else {
    throw new Error("A valid location (City/State or ZIP Code) is required.");
  }

  const lodgingEndpoint = `rates/${locationQuery}/year/${year}`;
  const mieEndpoint = `rates/conus/mie/${year}`;

  try {
    const [lodgingData, mieData] = await Promise.all([
      fetchRates(lodgingEndpoint),
      fetchRates(mieEndpoint),
    ]);

    const perDiemRates: PerDiemRates = {
      lodgingByMonth: lodgingData.rates[0].rate.map((r: any) => ({
        month: r.month,
        value: Number(r.value),
      })),
      mie: Number(mieData.rates[0].rate[0].value),
    };

    return perDiemRates;
  } catch (error) {
    console.error("Failed to fetch per diem rates:", error);
    if (
      error instanceof Error &&
      (error.message.includes("404") || // Catch generic 404
        error.message.includes("No per diem rates") || // Catch API's 404 message
        error.message.includes("not found")) // Catch other "not found"
    ) {
      throw new Error(
        "Could not find rates for this location. Please check spelling or try a ZIP code.",
      );
    }
    // Re-throw other errors
    throw error;
  }
}
