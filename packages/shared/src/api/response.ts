/**
 * Standardized API Response Envelopes.
 */

import { ErrorCode, ErrorDetail } from '../errors/app-error';

export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
  timestamp: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: PaginationMeta;
  meta?: Record<string, unknown>;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: ErrorDetail[];
  };
  timestamp: string;
}

export function createSuccessResponse<T>(data: T, meta?: Record<string, unknown>): ApiResponse<T> {
  return {
    success: true,
    data,
    meta,
    timestamp: new Date().toISOString(),
  };
}

export function createPaginatedResponse<T>(
  data: T[],
  pagination: PaginationMeta,
  meta?: Record<string, unknown>
): PaginatedResponse<T> {
  return {
    success: true,
    data,
    pagination,
    meta,
    timestamp: new Date().toISOString(),
  };
}

export function createErrorResponse(
  code: ErrorCode,
  message: string,
  details?: ErrorDetail[]
): ApiErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    timestamp: new Date().toISOString(),
  };
}

export const ApiResponse = {
  success: createSuccessResponse,
  error: createErrorResponse,
  paginated: createPaginatedResponse,
};

