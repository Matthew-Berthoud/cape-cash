import { parseReceipt } from "./gemini";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET as string;

const userGoogleTokens = new Map<
  string,
  { accessToken: string; refreshToken?: string; expiry: Date }
>();

interface AuthRequest extends Request {
  user?: { email: string };
}

const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("Authorization header required");
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).send("Bearer token required");
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { email: string };
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).send("Unauthorized: Invalid token");
  }
};

app.post("/api/v1/auth/google", async (req: Request, res: Response) => {
  const { accessToken } = req.body;
  if (!accessToken) {
    return res.status(400).send("Invalid request body");
  }

  try {
    const client = new OAuth2Client();
    const ticket = await client.verifyIdToken({
      idToken: accessToken,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(401).send("Google token validation failed");
    }

    if (!payload.email.endsWith("@blackcape.io")) {
      return res
        .status(401)
        .send("Unauthorized: Email domain not allowed. Must be @blackcape.io");
    }

    const expirationTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const token = jwt.sign({ email: payload.email }, JWT_SECRET, {
      expiresIn: "24h",
    });

    userGoogleTokens.set(payload.email, {
      accessToken,
      expiry: expirationTime,
    });

    res.json({ token, email: payload.email });
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to connect to Google for token validation");
  }
});

app.post(
  "/api/v1/parse-receipt",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    const userEmail = req.user?.email;
    if (!userEmail) {
      return res
        .status(500)
        .send("Internal server error: user context missing");
    }

    const userTokens = userGoogleTokens.get(userEmail);
    if (!userTokens) {
      return res
        .status(401)
        .send(
          "Google access token not found for user. Please re-authenticate.",
        );
    }

    const { base64Image } = req.body;
    if (!base64Image) {
      return res.status(400).send("Missing 'base64Image' in request");
    }

    try {
      const parsedData = await parseReceipt(
        base64Image,
        userTokens.accessToken,
      );
      res.json({
        status: "success",
        message: "Receipt parsed with user's Google token.",
        user: userEmail,
        data: parsedData,
      });
    } catch (err) {
      console.error(err);
      res.status(500).send("Failed to parse receipt");
    }
  },
);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
