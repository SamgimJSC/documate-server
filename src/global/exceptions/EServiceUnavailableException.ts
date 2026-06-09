import { HttpStatus } from '@nestjs/common';
import { BaseException } from './baseException';
import { ErrorObject } from '../types/errorObject';

export class EServiceUnavailableException extends BaseException {
  constructor(error: ErrorObject) {
    super(error, HttpStatus.SERVICE_UNAVAILABLE);
  }
}
