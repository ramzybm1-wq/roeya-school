/**
 * Global API Error Handling Middleware.
 * Sanitizes errors and returns standardized JSON envelopes without leaking internals.
 */

import { AppError, createErrorResponse } from '@vision-school/shared';

export interface HttpResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export class ErrorHandlerMiddleware {
  static handle(err: unknown): HttpResponse {
    if (err instanceof AppError) {
      return {
        statusCode: err.statusCode,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createErrorResponse(err.errorCode, err.message, err.details)),
      };
    }

    // Default internal error (never leak raw stack or SQL details to client)
    const fallback = AppError.internal();
    return {
      statusCode: fallback.statusCode,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createErrorResponse(fallback.errorCode, fallback.message)),
    };
  }
}
