/**
 * Standardized Application Error Model for VISION SCHOOL.
 */

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'DUPLICATE_REGISTRATION'
  | 'LEVEL_CLOSED'
  | 'LEVEL_FULL'
  | 'CAPACITY_CONFLICT'
  | 'CAPACITY_EXCEEDED'
  | 'REGISTRATION_CLOSED'
  | 'DOCUMENT_REQUIRED'
  | 'FILE_INVALID'
  | 'FILE_TOO_LARGE'
  | 'RATE_LIMITED'
  | 'ACADEMIC_YEAR_INACTIVE'
  | 'INTERNAL_ERROR'
  | (string & {});

export interface ErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: ErrorCode;
  public readonly details?: ErrorDetail[];
  public readonly isOperational: boolean;

  constructor(
    message: string,
    errorCode: ErrorCode = 'INTERNAL_ERROR',
    statusCode = 500,
    details?: ErrorDetail[],
    isOperational = true
  ) {
    super(message);
    this.name = 'AppError';
    this.errorCode = errorCode;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;

    Object.setPrototypeOf(this, new.target.prototype);
    if (typeof (Error as any).captureStackTrace === 'function') {
      (Error as any).captureStackTrace(this, this.constructor);
    }
  }

  static badRequest(message: string, details?: ErrorDetail[]): AppError {
    return new AppError(message, 'VALIDATION_ERROR', 400, details);
  }

  static unauthorized(message = 'Authentication required'): AppError {
    return new AppError(message, 'UNAUTHORIZED', 401);
  }

  static forbidden(message = 'Access denied'): AppError {
    return new AppError(message, 'FORBIDDEN', 403);
  }

  static notFound(resource = 'Resource', id?: string): AppError {
    const msg = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
    return new AppError(msg, 'NOT_FOUND', 404);
  }

  static conflict(message: string, errorCode: ErrorCode = 'CAPACITY_CONFLICT'): AppError {
    return new AppError(message, errorCode, 409);
  }

  static duplicate(message = 'Duplicate registration detected'): AppError {
    return new AppError(message, 'DUPLICATE_REGISTRATION', 409);
  }

  static levelFull(levelName: string): AppError {
    return new AppError(
      `Le niveau '${levelName}' a atteint sa capacité maximale pour cette année scolaire.`,
      'LEVEL_FULL',
      409
    );
  }

  static rateLimited(message = 'Too many requests. Please try again later.'): AppError {
    return new AppError(message, 'RATE_LIMITED', 429);
  }

  static internal(message = 'An unexpected server error occurred'): AppError {
    return new AppError(message, 'INTERNAL_ERROR', 500, undefined, false);
  }
}
