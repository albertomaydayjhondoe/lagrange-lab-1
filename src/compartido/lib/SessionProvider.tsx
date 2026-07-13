import { createContext, useContext, ReactNode } from 'react';
import { useSession, UseSessionReturn } from './useSession';

// Session context type
interface SessionContextType extends UseSessionReturn {}

// Create context
const SessionContext = createContext<SessionContextType | null>(null);

// Provider component
interface SessionProviderProps {
  children: ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const sessionData = useSession();

  return (
    <SessionContext.Provider value={sessionData}>
      {children}
    </SessionContext.Provider>
  );
}

// Hook to use session context
export function useSessionContext(): SessionContextType {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSessionContext must be used within a SessionProvider');
  }
  return context;
}

export default SessionProvider;
