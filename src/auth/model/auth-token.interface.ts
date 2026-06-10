import { CreateAuthTokenDto } from '../dto/createAuthToken.dto';
import { UpdateAuthTokenDto } from '../dto/updateAuthToken.dto';
import { AuthToken } from '../entities/auth-token.entity';

export interface AuthTokenRepository {
  createToken(createAuthTokenDto: CreateAuthTokenDto): Promise<AuthToken>;
  findByTokenId(tokenId: string): Promise<AuthToken | null>;
  findByUserId(userId: string): Promise<AuthToken[]>;
  findByRefreshToken(refreshToken: string): Promise<AuthToken | null>;
  updateToken(
    tokenId: string,
    updateAuthTokenDto: UpdateAuthTokenDto,
  ): Promise<AuthToken | null>;
  deleteByTokenId(tokenId: string): Promise<boolean>;
  deleteByUserId(userId: string): Promise<boolean>;
}
