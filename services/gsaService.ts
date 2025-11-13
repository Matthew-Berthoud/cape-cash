import { Trip, PerDiemRates } from "../types";

const BASE_URL = "https://api.gsa.gov/travel/perdiem/v2/rates";

function getFiscalYear(dateString: string): number {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-11
  // Fiscal year starts in October (month 9)
  return month >= 9 ? year + 1 : year;
}

async function fetchRates(endpoint: string) {
  const url = `${BASE_URL}/${endpoint}?api_key=${process.env.GSA_API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`GSA API request failed with status ${response.status}`);
  }
  const data = await response.json();
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
  const year = getFiscalYear(startDate);
  let locationQuery: string;

  if (location.zip) {
    locationQuery = `zip/${location.zip}`;
  } else if (location.city && location.state) {
    locationQuery = `city/${encodeURIComponent(location.city)}/state/${location.state}`;
  } else {
    throw new Error("A valid location (City/State or ZIP Code) is required.");
  }

  const lodgingEndpoint = `lodging/bymonth/year/${year}/${locationQuery}`;
  const mieEndpoint = `mie/year/${year}/${locationQuery}`;

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
      (error.message.includes("404") ||
        error.message.includes("No per diem rates"))
    ) {
      throw new Error(
        "Could not find rates for this location. Please check spelling or try a ZIP code.",
      );
    }
    throw error;
  }
}
