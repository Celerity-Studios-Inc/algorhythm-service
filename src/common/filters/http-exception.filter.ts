import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // Log the error
    this.logger.error(
      `HTTP Exception: ${status} - ${request.method} ${request.url}`,
      exception.stack
    );

    // Format error response
    const errorResponse = {
      success: false,
      error: {
        status,
        message: exception.message,
        ...(typeof exceptionResponse === 'object' && exceptionResponse),
      },
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      requestId: request.requestId || 'unknown',
    };

    response.status(status).json(errorResponse);
  }
}
