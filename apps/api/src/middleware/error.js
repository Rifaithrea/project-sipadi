import { env } from "../config/env.js";
import { HttpError } from "../utils/http.js";

export function notFound(req, res, next) {
  next(new HttpError(404, `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan`));
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const status = error.status || 500;
  const payload = {
    message: status >= 500 ? "Terjadi kesalahan server" : error.message
  };

  if (error.details) payload.details = error.details;
  if (env.nodeEnv !== "production" && status >= 500) {
    payload.error = error.message;
    payload.stack = error.stack;
  }

  return res.status(status).json(payload);
}
