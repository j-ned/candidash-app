import type { User } from '../domain/models/auth.model';

const defaults: User = {
  id: 'user-1',
  email: 'john@example.com',
  username: 'john',
  role: 'USER',
  totpEnabled: false,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export class UserBuilder {
  private overrides: Partial<User> = {};

  static default(): UserBuilder {
    return new UserBuilder();
  }

  with<K extends keyof User>(key: K, value: User[K]): this {
    this.overrides[key] = value;
    return this;
  }

  build(): User {
    return { ...defaults, ...this.overrides };
  }
}
