import { ERROR_CODE } from '../constants/errorCode.const';

export interface ErrorObject {
  message: string;
  errorCode: ERROR_CODE;
}
