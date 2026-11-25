import type { z } from "zod";
import { AppError } from "./errors";

export function parse<T extends z.ZodTypeAny>(schema: T, value: unknown): z.infer<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new AppError(400, "VALIDATION_ERROR", "Dados inválidos", result.error.flatten());
  }
  return result.data;
}
