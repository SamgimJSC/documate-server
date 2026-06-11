export class CreateCardRecommendationDto {
  userId: string;
  cardId: string;
  reason?: string | null;
  matchScore?: number | null;
}
