import { SetMetadata } from '@nestjs/common';

export const ERROR_HANDLING_OPTIONS = 'error_handling_options';

export interface ErrorHandlingOptions {
  logError?: boolean;
  logRequest?: boolean;
  logResponse?: boolean;
  includeStack?: boolean;
  customErrorMessage?: string;
  fallbackResponse?: any;
}

export const ErrorHandling = (options: ErrorHandlingOptions = {}) =>
  SetMetadata(ERROR_HANDLING_OPTIONS, {
    logError: true,
    logRequest: false,
    logResponse: false,
    includeStack: process.env.NODE_ENV === 'development',
    customErrorMessage: undefined,
    fallbackResponse: undefined,
    ...options,
  });
