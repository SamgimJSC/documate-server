import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorObject } from '../types/errorObject';

export class BaseException extends HttpException {
  constructor(error: ErrorObject, status: HttpStatus) {
    super(error, status);
  }
}
