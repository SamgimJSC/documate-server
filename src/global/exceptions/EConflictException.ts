import { HttpStatus } from '@nestjs/common';
import { BaseException } from './baseException';
import { ErrorObject } from '../types/errorObject';

export class EConflictException extends BaseException {
  constructor(error: ErrorObject) {
    super(error, HttpStatus.CONFLICT);
  }
}
