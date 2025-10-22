

"use client";

import { createContext, useState, useContext, ReactNode, Dispatch, SetStateAction, useEffect } from 'react';
import type { GlobalSettings } from '@/lib/data';


interface AppContextType {
  isContactFormOpen: boolean;
  setContactFormOpen: Dispatch<SetStateAction<boolean>>;
  settings: GlobalSettings | null;
  setSettings: Dispatch<SetStateAction<GlobalSettings | null>>;
  loading: boolean;
  isSetupComplete: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children, initialSettings, isSetupComplete }: { children: ReactNode, initialSettings: GlobalSettings, isSetupComplete: boolean }) {
  const [isContactFormOpen, setContactFormOpen] = useState(false);
  const [settings, setSettings] = useState<GlobalSettings | null>(initialSettings);
  const [loading, setLoading] = useState(false); // No longer loading from client, data is passed in

  useEffect(() => {
    // If initialSettings change (e.g., on a full page reload with new data), update the state.
    if (initialSettings) {
        setSettings(initialSettings);
    }
  }, [initialSettings]);


  return (
    <AppContext.Provider value={{ isContactFormOpen, setContactFormOpen, settings, setSettings, loading, isSetupComplete }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
