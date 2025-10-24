
'use client';

import { useState, useEffect, createContext, useContext, ReactNode, useCallback, Dispatch, SetStateAction } from 'react';
import { useRouter } from 'next/navigation';
import {
  type Auth,
  type User as SupabaseUser,
  createClientComponentClient,
} from '@supabase/auth-helpers-nextjs';
import { signupUser } from '@/lib/actions';
import { getSupabaseClient_client } from '@/lib/supabase';

export type UserRole = 'customer' | 'staff' | 'admin' | 'superadmin';

export interface User {
  id: string;
  email: string | null;
  username?: string;
  name: string;
  phone?: string;
  role: UserRole;
  photo_url?: string | null;
  password?: string; // Only used for creation, not stored
}

interface AuthContextType {
  user: User | null;
  setUser: Dispatch<SetStateAction<User | null>>;
  loading: boolean;
  login: (identifier: string, password: string, rememberMe?: boolean) => Promise<User>;
  signup: (userData: Omit<User, 'id'>) => Promise<any>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = getSupabaseClient_client();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setLoading(true);
      if (session?.user) {
        const { data: userDoc, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error("Error fetching user from Supabase:", error);
          setUser(null);
        } else if (userDoc) {
          setUser({
            id: userDoc.id,
            name: userDoc.name,
            email: userDoc.email,
            username: userDoc.username,
            role: userDoc.role,
            phone: userDoc.phone,
            photo_url: userDoc.photo_url,
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase, router]);

  const login = useCallback(async (identifier: string, password: string, rememberMe: boolean = true): Promise<User> => {
    let loginEmail = identifier;

    if (!identifier.includes('@')) {
      const { data: userDoc, error } = await supabase
        .from('users')
        .select('email')
        .eq('username', identifier)
        .single();
      
      if (error || !userDoc) {
        throw new Error("No user found with that username.");
      }
      loginEmail = userDoc.email;
    }

    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: password,
    });

    if (loginError || !loginData.user) {
      throw loginError || new Error("Login failed.");
    }
    
    const { data: userDoc, error: userDocError } = await supabase
      .from('users')
      .select('*')
      .eq('id', loginData.user.id)
      .single();
    
    if (userDocError || !userDoc) {
       throw userDocError || new Error("User document not found in database.");
    }
    
    const appUser: User = {
        id: userDoc.id,
        name: userDoc.name,
        email: userDoc.email,
        username: userDoc.username,
        role: userDoc.role,
        phone: userDoc.phone,
        photo_url: userDoc.photo_url,
    };
    
    setUser(appUser);
    return appUser;
  }, [supabase]);

  const signup = useCallback(async (userData: Omit<User, 'id'>) => {
    try {
      const result = await signupUser(userData);
      if (result.success) {
        return result.user;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push('/');
    router.refresh();
  }, [supabase, router]);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
