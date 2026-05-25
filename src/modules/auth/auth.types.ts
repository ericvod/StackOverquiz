import type { JwtPayload } from "../../shared/types";

export interface SessionClientInfo {
  userAgent?: string;
  ipAddress?: string;
}

export interface TokenSigner {
  sign(payload: Record<string, unknown>): Promise<string>;
  verify(token?: string): Promise<unknown | false>;
}

export interface AccessTokenPayload extends JwtPayload {
  type: "access";
}

export interface RefreshTokenPayload extends JwtPayload {
  type: "refresh";
}
