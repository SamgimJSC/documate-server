import { BiometricChallenge } from '../entities/biometric-challenge.entity';

export interface BiometricChallengeRepository {
  createChallenge(userId: string, challenge: string, expiresAt: Date): Promise<BiometricChallenge>;
  findByChallengeId(challengeId: string): Promise<BiometricChallenge | null>;
  markAsUsed(challengeId: string): Promise<void>;
}
