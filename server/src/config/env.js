import "dotenv/config";

export const env = {
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/sheetsense",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  anthropicKey: process.env.ANTHROPIC_API_KEY || "",
  anthropicModel: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB) || 10,
  maxRows: Number(process.env.MAX_ROWS) || 50000,
};
