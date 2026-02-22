import type { ProfileData } from '../domain/models/profile.model';

const defaults: ProfileData = {
  id: 'user-1',
  email: 'john@example.com',
  username: 'john',
  role: 'USER',
  cvPath: undefined,
  avatarPath: undefined,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export class ProfileBuilder {
  private overrides: Partial<ProfileData> = {};

  static default(): ProfileBuilder {
    return new ProfileBuilder();
  }

  with<K extends keyof ProfileData>(key: K, value: ProfileData[K]): this {
    this.overrides[key] = value;
    return this;
  }

  build(): ProfileData {
    return { ...defaults, ...this.overrides };
  }
}
