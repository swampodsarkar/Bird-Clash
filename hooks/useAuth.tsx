import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../services/firebase';
import type firebase from 'firebase/compat/app';
import type { AuthContextType } from '../types';
import { setupPresence, goOffline } from '../services/friendService';

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<firebase.User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setupPresence(currentUser.uid); // Set up presence on login
      }
      setLoading(false);
    });
    
    const handleBeforeUnload = () => {
        if (auth.currentUser) {
            goOffline(auth.currentUser.uid);
        }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
        unsubscribe();
        if (auth.currentUser) {
            goOffline(auth.currentUser.uid);
        }
        window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
