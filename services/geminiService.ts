import { GoogleGenAI, Type } from "@google/genai";
import { CATEGORIES } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: receiptSchema,
      },
    });

    const jsonString = response.text;
    const parsedJson = JSON.parse(jsonString);

    // Validate that the returned category is one of the allowed ones
    if (!CATEGORIES.includes(parsedJson.category)) {
      parsedJson.category = "8190 G&A Office supplies"; // Default if Gemini hallucinates a category
    }

    console.log({ parsedJson });
    return parsedJson;
  } catch (error) {
    console.error("Error parsing receipt with Gemini:", error);
    throw new Error(
      "Failed to parse receipt. Please check your API key and network connection.",
    );
  }
}

