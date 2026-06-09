import { HttpStatus } from '@nestjs/common';
import { BaseException } from './baseException';
import { ErrorObject } from '../types/errorObject';

export class ENotFoundException extends BaseException {
  constructor(error: ErrorObject) {
    super(error, HttpStatus.NOT_FOUND);
  }
}
