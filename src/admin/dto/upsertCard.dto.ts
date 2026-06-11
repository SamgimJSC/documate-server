export class UpsertCardDto {
  cardName: string;
  issuer?: string | null;
  benefits?: Record<string, any> | null;
  annualFee?: number | null;
  imgUrl?: string | null;
  sourceUrl?: string | null;
  crawledAt?: Date | null;
}
