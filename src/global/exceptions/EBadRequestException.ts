import { HttpStatus } from '@nestjs/common';
import { BaseException } from './baseException';
import { ErrorObject } from '../types/errorObject';

export class EBadRequestException extends BaseException {
  constructor(error: ErrorObject) {
    super(error, HttpStatus.BAD_REQUEST);
  }
}
