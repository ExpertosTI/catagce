import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Http');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Internal server error';
    let code: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const r = exception.getResponse() as any;
      message = typeof r === 'string' ? r : r?.message || r;
      code = typeof r === 'object' ? r?.error : undefined;
    } else if (exception && typeof exception === 'object') {
      const anyEx = exception as any;
      message = anyEx.message || message;
      code = anyEx.code;
    }

    if (status >= 500) {
      this.logger.error(
        `${req.method} ${req.originalUrl || req.url} → ${status} [${code ?? 'ERROR'}]`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(
        `${req.method} ${req.originalUrl || req.url} → ${status} [${code ?? 'BAD_REQUEST'}] ${
          typeof message === 'string' ? message : JSON.stringify(message)
        }`,
      );
    }

    res.status(status).json({
      statusCode: status,
      error: code,
      message,
      path: req.originalUrl || req.url,
      timestamp: new Date().toISOString(),
    });
  }
}
