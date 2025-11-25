import { GoogleGenAI } from "@google/genai";
import { GoogleAuth } from "google-auth-library";

const MODEL_NAME = "gemini-2.5-flash";

export async function parseReceipt(
  base64Image: string,
  userGoogleAccessToken: string,
) {
  const auth = new GoogleAuth().fromAPIKey(userGoogleAccessToken);
  const ai = new GoogleGenAI(auth);

  const req = {
    model: MODEL_NAME,
    contents: [
      {
        parts: [
          {
            text: "Analyze the provided receipt image. Extract the transaction date, a short description of the vendor, the total amount, and select the best category from the list. If it is a grocery receipt it's probably 9080 Employee Morale. The default category should be '8190 G&A Office supplies' if unsure.",
          },
          {
            inline_data: {
              mime_type: "image/jpeg",
              data: base64Image,
            },
          },
        ],
      },
    ],
  };

  const response = await ai.models.generateContent(req);
  const text = response.text;
  return text ? JSON.parse(text) : undefined;
}
