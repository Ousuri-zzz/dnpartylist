'use client';

import { createContext, useContext } from 'react';
import { useAuth } from '../hooks/useAuth';
import { DiscordNameDialog } from '@/components/DiscordNameDialog';

interface AuthContextType {
  user: any;
  loading: boolean;
  discordName: string;
  updateDiscordName: (name: string) => Promise<void>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const auth = useAuth();

  const handleDiscordSubmit = async (discordName: string) => {
    try {
      await auth.updateDiscordName(discordName);
      auth.setShowDiscordDialog(false);
    } catch (error) {
      console.error('Error updating Discord name:', error);
    }
  };

  return (
    <AuthContext.Provider value={{
      ...auth,
      signIn: async () => { await auth.login(); },
      signOut: auth.logout
    }}>
      {children}
      <DiscordNameDialog onSubmit={handleDiscordSubmit} />
    </AuthContext.Provider>
  );
} 