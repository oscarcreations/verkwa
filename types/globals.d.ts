import { Roles } from "./roles";

declare global {
  interface CustomJWTSessionClaims {
    metadata: {
      role?: Roles;
    };
  }
}
