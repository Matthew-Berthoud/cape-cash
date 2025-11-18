import { ParsedReceiptData, ParseResult } from "@/types";

// Your new Go backend URL
const API_BASE_URL = "http://localhost:8080/api/v1";

// We still keep the default data structure for frontend error handling
const defaultParsedData: ParsedReceiptData = {
  date: new Date().toISOString().split("T")[0], // Today's date
  description: "Manual Entry Required",
  amount: 0.0,
  category: "8190 G&A Office supplies", // Your default category
};

/**
 * Calls your Go backend to parse the receipt.
 * The backend handles the Gemini API call and all retry logic.
 */
export async function parseReceipt(base64Image: string): Promise<ParseResult> {
  try {
    const response = await fetch(`${API_BASE_URL}/parse-receipt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      // The Go backend expects this exact JSON structure
      body: JSON.stringify({ base64Image: base64Image }),
    });

    // Your Go backend is designed to return a ParseResult object
    // on both success (status 200) and failure (status 500)
    const result: ParseResult = await response.json();

    if (!response.ok) {
      // The error message comes from the backend's JSON response
      throw new Error(result.message || "Failed to parse receipt from backend");
    }

    // This is the { status: "success", data: ... } object
    console.log("Successfully parsed receipt via backend:", result.data);
    return result;
  } catch (error) {
    console.error("Error calling backend to parse receipt:", error);
    // Return a standard error response
    return {
      status: "error",
      data: defaultParsedData,
      message: (error as Error).message,
    };
  }
}
