export function getUserInitials(
  user: { username?: string; email?: string } | null | undefined,
): string {
  if (!user?.username && !user?.email) return 'U';

  const displayName = user.username ?? user.email;
  if (!displayName) return 'U';

  const names = displayName.trim().split(' ');
  if (names.length === 1) return names[0].charAt(0).toUpperCase();

  return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
}
