export type JwtPayload = {
  sub: string; // userId uuid
  iat: number; // 발급시간 UTS
  exp: number; // 만료시간 UTS
};
