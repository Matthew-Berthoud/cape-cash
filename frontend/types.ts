export interface Receipt {
  id: string;
  base64: string;
  fileName: string;
}

export interface PerDiemRates {
  lodgingByMonth: { month: string; value: number }[];
  mie: number;
}

export interface Trip {
  id: string;
  project: string;
  purpose: string;
  startDate: string;
  endDate: string;
  location: {
    city?: string;
    state?: string;
    zip?: string;
  };
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
