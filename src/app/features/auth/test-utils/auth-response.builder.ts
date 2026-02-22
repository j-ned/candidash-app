import type { AuthResponse } from '../domain/models/auth.model';
import { UserBuilder } from './user.builder';

const defaults: AuthResponse = {
  access_token: 'fake-jwt-token',
  user: UserBuilder.default().build(),
};

export class AuthResponseBuilder {
  private overrides: Partial<AuthResponse> = {};

  static default(): AuthResponseBuilder {
    return new AuthResponseBuilder();
  }

  with<K extends keyof AuthResponse>(key: K, value: AuthResponse[K]): this {
    this.overrides[key] = value;
    return this;
  }

  build(): AuthResponse {
    return { ...defaults, ...this.overrides };
  }
}
