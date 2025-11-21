export interface Receipt {
  id: string;
  base64: string;
  fileName: string;
}

export interface LodgingRate {
  month: string;
  value: number;
}

// NEW: Interface to store the full M&IE breakdown (Breakfast, Lunch, etc.)
export interface MieBreakdown {
  total: number;
  breakfast: number;
  lunch: number;
  dinner: number;
  incidental: number;
}

// UPDATED: PerDiemRates now stores LodgingRates and the full M&IE breakdown
export interface PerDiemRates {
  lodging: LodgingRate[]; // Renamed from lodgingByMonth for consistency
  mie: MieBreakdown;
}

// UPDATED: Trip interface simplified to use a single 'zip' property
export interface Trip {
  id: string;
  project: string;
  purpose: string;
  startDate: string;
  endDate: string;
  zip: string; // Simplified: Replaced the 'location' object
  perDiemRates: PerDiemRates | null;
  fetchStatus: "idle" | "loading" | "success" | "error";
  errorMessage?: string;
}

export interface ExpenseItem {
  id: string;
  receiptImageIds: string[];
  date: string;
  category: string;
  project: string;
  description: string;
  amount: number | string; // Can be string during input
  tripId?: string;
}

export type ParsedReceiptData = {
  date: string;
  description: string;
  amount: number;
  category: string;
};

export type ParseResult = {
  status: "success" | "error";
  data: ParsedReceiptData;
  message?: string; // The error message, if any
};

export enum Page {
  Upload,
  Trips,
  Form,
  Preview,
}
