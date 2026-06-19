import dotenv from "dotenv";

dotenv.config();

const numberFromEnv = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: numberFromEnv(process.env.PORT, 4000),
  databaseUrl: process.env.DATABASE_URL || "postgresql://sipadi:sipadi123@localhost:5432/sipadi",
  jwtSecret: process.env.JWT_SECRET || "sipadi-dev-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  uploadDir: process.env.UPLOAD_DIR || "uploads",
  maxFileSizeMb: numberFromEnv(process.env.MAX_FILE_SIZE_MB, 10)
};
