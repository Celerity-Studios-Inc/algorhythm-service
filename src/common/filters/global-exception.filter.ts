import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

// Extend Express Request interface to include requestId
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorDetails: any = {};

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;
      const exceptionResponse = exception.getResponse();
      errorDetails = typeof exceptionResponse === 'object' ? exceptionResponse : { message: exceptionResponse };
    } else if (exception instanceof Error) {
      message = exception.message;
      errorDetails = {
        name: exception.name,
        stack: process.env.NODE_ENV === 'development' ? exception.stack : undefined,
      };
    }

    // Enhanced logging for debugging
    this.logger.error(
      `Global Exception: ${status} - ${request.method} ${request.url}`,
      {
        exception: exception instanceof Error ? exception.message : 'Unknown error',
        stack: exception instanceof Error ? exception.stack : undefined,
        request: {
          method: request.method,
          url: request.url,
          headers: request.headers,
          body: request.body,
          query: request.query,
          params: request.params,
        },
        timestamp: new Date().toISOString(),
      }
    );

    // Structured error response
    const errorResponse = {
      success: false,
      error: {
        status,
        message,
        ...errorDetails,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        requestId: request.requestId || 'unknown',
      },
    };

    response.status(status).json(errorResponse);
  }
}
