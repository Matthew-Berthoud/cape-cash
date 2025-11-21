import { PerDiemRates, LodgingRate, MieBreakdown } from "../types";

// Adjust this to match your Go server's address and route
const PROXY_URL = "http://localhost:8080/api/v1/perdiem";

// Types matching the Go Backend Response
interface GoZipResponse {
  rates: {
    rate: {
      zip: string;
      meals: number; // The link to the M&IE table
      months: {
        month: { long: string; value: number }[];
      };
    }[];
  }[];
}

interface GoMieResponse {
  total: number;
  breakfast: number;
  lunch: number;
  dinner: number;
  incidental: number;
}

interface GoCombinedResponse {
  location_data: GoZipResponse;
  meal_rates: GoMieResponse[];
}

export async function fetchPerDiemRates(
  startDate: string,
  zipCode: string,
): Promise<PerDiemRates> {
  const year = new Date(startDate).getFullYear();

  // Construct URL with Query Params
  const url = new URL(PROXY_URL);
  url.searchParams.append("zip_code", zipCode);
  url.searchParams.append("year", year.toString());

  const response = await fetch(url.toString());

  if (!response.ok) {
    if (response.status === 404) throw new Error("Invalid Zip Code or Year.");
    throw new Error(`Server Error: ${response.statusText}`);
  }

  const data: GoCombinedResponse = await response.json();
  return transformResponse(data);
}

function transformResponse(data: GoCombinedResponse): PerDiemRates {
  const locationData = data.location_data?.rates?.[0]?.rate?.[0];

  if (!locationData) {
    throw new Error("No location data found for this Zip Code.");
  }

  // 1. Extract Lodging (Store all months for now)
  const lodging: LodgingRate[] = locationData.months.month.map((m) => ({
    month: m.long,
    value: m.value,
  }));

  // 2. Find matching M&IE rate
  // The Zip response has a 'meals' total (e.g. 64). We find the matching breakdown in meal_rates.
  const mieTotal = locationData.meals;
  const mieBreakdown = data.meal_rates.find((r) => r.total === mieTotal);

  if (!mieBreakdown) {
    throw new Error(`Could not find M&IE breakdown for rate: $${mieTotal}`);
  }

  return {
    lodging,
    mie: {
      total: mieBreakdown.total,
      breakfast: mieBreakdown.breakfast,
      lunch: mieBreakdown.lunch,
      dinner: mieBreakdown.dinner,
      incidental: mieBreakdown.incidental,
    },
  };
}
