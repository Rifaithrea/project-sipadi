export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function createHttpError(status, message, details) {
  return new HttpError(status, message, details);
}

export function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function pagination(query) {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

export function parseOptionalInt(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

export function cleanText(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text.length ? text : null;
}
