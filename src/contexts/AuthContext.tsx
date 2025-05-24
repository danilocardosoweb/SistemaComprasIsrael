import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any | null }>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  refreshSession: () => Promise<Session | null>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tokenRefreshAttempted, setTokenRefreshAttempted] = useState(false);

  // Função para renovar a sessão
  const refreshSession = async () => {
    try {
      setTokenRefreshAttempted(true);
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Erro ao renovar sessão:', error);
        // Se não conseguir renovar, limpar a sessão
        if (error.message?.includes('JWT expired') || error.message?.includes('invalid token')) {
          await signOut();
          // Redirecionar para login via window.location para evitar dependência do Next.js router
          window.location.href = '/login';
          return null;
        }
        throw error;
      }
      
      setSession(data.session);
      setUser(data.session?.user || null);
      setIsAuthenticated(!!data.session);
      return data.session;
    } catch (error) {
      console.error('Erro ao renovar sessão:', error);
      return null;
    } finally {
      setTokenRefreshAttempted(false);
    }
  };

  // Função para tratar erros de JWT expirado
  const handleApiError = async (error: any) => {
    if (error && (error.message?.includes('JWT expired') || error.code === 'PGRST301')) {
      if (!tokenRefreshAttempted) {
        console.log('Token expirado, tentando renovar...');
        return await refreshSession();
      }
    }
    return null;
  };

  useEffect(() => {
    // Verificar sessão atual
    const getSession = async () => {
      setLoading(true);
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          const refreshed = await handleApiError(error);
          if (!refreshed) {
            throw error;
          }
          return;
        }
        
        setSession(session);
        setUser(session?.user || null);
        setIsAuthenticated(!!session);
      } catch (error) {
        console.error('Erro ao carregar sessão:', error);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // Configurar listener para mudanças de autenticação
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user || null);
        setIsAuthenticated(!!session);
        setLoading(false);
      }
    );

    return () => {
      // Limpar listener
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  // Função para login
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      return { error };
    }
  };

  // Função para logout
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const value = {
    session,
    user,
    loading,
    signIn,
    signOut,
    isAuthenticated,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
