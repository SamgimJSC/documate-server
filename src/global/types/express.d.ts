import { User } from '../../users/entities/user.entity';

export type ReqUser = User & { isExpired: boolean };

declare global {
  namespace Express {
    export interface User extends ReqUser {}
  }
}

export {};
