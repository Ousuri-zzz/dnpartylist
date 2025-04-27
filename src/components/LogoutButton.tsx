'use client';

import { useAuthContext } from '../app/providers';

export function LogoutButton() {
  const { signOut } = useAuthContext();

  return (
    <button
      onClick={signOut}
      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
    >
      Logout
    </button>
  );
} 