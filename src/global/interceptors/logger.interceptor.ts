import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

@Injectable()
export class LoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, originalUrl } = req;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const res = context.switchToHttp().getResponse();
        const statusCode = res.statusCode;
        const duration = Date.now() - start;

        this.logger.verbose(
          `${method} ${originalUrl} ${statusCode} - ${duration}ms`,
        );
      }),

      catchError((err) => {
        const duration = Date.now() - start;

        this.logger.error(
          `${method} ${originalUrl} - ${duration}ms`,
          err.stack,
        );

        return throwError(() => err);
      }),
    );
  }
}
