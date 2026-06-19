import { ZodError } from "zod";
import { createHttpError } from "../utils/http.js";

export function validateBody(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(createHttpError(422, "Validasi input gagal", error.flatten()));
      } else {
        next(error);
      }
    }
  };
}
