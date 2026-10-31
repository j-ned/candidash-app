import { toAdminUsers } from './admin.adapter';

describe('toAdminUsers', () => {
  it('turns API dates into Date objects and keeps the rest', () => {
    // Given
    const raw = [
      {
        id: 'u1',
        email: 'camille@example.com',
        username: null,
        role: 'USER',
        totpEnabled: true,
        createdAt: '2026-10-01T10:00:00.000Z',
        applicationsCount: 3,
        lastActivityAt: null,
      },
    ];

    // When
    const [user] = toAdminUsers(raw);

    // Then
    expect(user.createdAt).toEqual(new Date('2026-10-01T10:00:00.000Z'));
    expect(user.lastActivityAt).toBeNull();
    expect(user.applicationsCount).toBe(3);
  });
});
