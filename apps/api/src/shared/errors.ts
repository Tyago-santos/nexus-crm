export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const notFound = (entity: string) => new AppError(404, "NOT_FOUND", `${entity} não encontrado`);
export const forbidden = (message = "Você não tem permissão para esta ação") =>
  new AppError(403, "FORBIDDEN", message);
export const unauthorized = (message = "Sessão inválida ou expirada") =>
  new AppError(401, "UNAUTHORIZED", message);
export const conflict = (message: string, details?: unknown) =>
  new AppError(409, "CONFLICT", message, details);
