export interface Receipt {
  id: string;
  base64: string;
  fileName: string;
}

export interface ExpenseItem {
  id: string;
  receiptImageIds: string[];
  date: string;
  category: string;
  project: string;
  description: string;
  amount: number | string; // Can be string during input
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
  Form,
  Preview,
}
