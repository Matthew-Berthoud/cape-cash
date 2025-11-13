import { GoogleGenAI, Type } from "@google/genai";
import { CATEGORIES } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Schema remains the same
const receiptSchema = {
  type: Type.OBJECT,
  properties: {
    date: {
      type: Type.STRING,
      description:
        "The date of the transaction in 'YYYY-MM-DD' format. If the year is not present, assume the current year.",
    },
    description: {
      type: Type.STRING,
      description:
        "A concise description of the vendor or purchase (e.g., 'Starbucks Coffee', 'Uber Ride', 'Walmart').",
    },
    amount: {
      type: Type.NUMBER,
      description:
        "The final total amount as a number, without currency symbols or commas.",
    },
    category: {
      type: Type.STRING,
      description: `Based on the vendor and items, choose the most appropriate category from the provided list.`,
      enum: CATEGORIES,
    },
  },
  required: ["date", "description", "amount", "category"],
};

export async function parseReceipt(base64Image: string): Promise<{
  date: string;
  description: string;
  amount: number;
  category: string;
}> {
  const imagePart = {
    inlineData: {
      mimeType: "image/jpeg",
      data: base64Image,
    },
  };

  const textPart = {
    text: `Analyze the provided receipt image. Extract the transaction date, a short description of the vendor, the total amount, and select the best category from the list. If it is a grocery reciept it's probably 9080 Employee Morale. The default category should be '8190 G&A Office supplies' if unsure.`,
  };

  // --- New Retry Logic ---
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Parsing receipt: Attempt ${attempt} of ${maxRetries}...`);

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: { parts: [imagePart, textPart] },
        config: {
          responseMimeType: "application/json",
          responseSchema: receiptSchema,
        },
      });

      const jsonString = response.text;
      const parsedJson = JSON.parse(jsonString); // Validate that the returned category is one of the allowed ones

      if (!CATEGORIES.includes(parsedJson.category)) {
        console.warn(
          `Gemini returned non-standard category: ${parsedJson.category}.Defaulting.`,
        );
        parsedJson.category = "8190 G&A Office supplies"; // Default if Gemini hallucinates a category
      }

      console.log("Successfully parsed receipt:", { parsedJson });
      return parsedJson; // **Success: Return and exit the function**
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);
      lastError = error as Error; // Store the error from the failed attempt

      // Optional: Add a small delay before retrying, especially for network/quota errors
      // if (attempt < maxRetries) {
      //   await new Promise(res => setTimeout(res, 1000)); // wait 1 second
      // }
    }
  }

  // --- End of Retry Logic ---

  // If the loop completes, all retries have failed.
  console.error("All retry attempts failed.");
  throw new Error(
    `Failed to parse receipt after ${maxRetries} attempts. Last error: ${lastError?.message || "Unknown error"}`,
  );
}

