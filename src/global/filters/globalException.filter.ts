import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ERROR_CODE } from '../constants/errorCode.const';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorCode: string = ERROR_CODE.INTERNAL_SERVER_ERROR;

    if (exception instanceof HttpException) {
      status = exception.getStatus();

      const res = exception.getResponse();

      message =
        typeof res === 'string'
          ? res
          : (res as any).message || exception.message;

      errorCode = (res as any).errorCode || '';
    }

    response.status(status).json({
      message: 'FAIL',
      error: message,
      errorCode,
      statusCode: status,
      data: null,
    });
  }
}
