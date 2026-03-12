import React, { createContext, useContext, useEffect, useState } from 'react';

export interface SavedAddress {
  id: number;
  address_id: number;
  recipient_name: string;
  phone_number: string;
  house_number: string;
  street: string;
  area: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  latitude?: number | null;
  longitude?: number | null;
  address_type: string;
  is_default: boolean;
  location_label: string;
  full_address: string;
}

interface User {
  id: number;
  user_id?: string;
  name: string;
  email: string;
  phone?: string;
  role: 'customer' | 'rwa' | 'admin';
  effective_role?: 'customer' | 'rwa_coordinator' | 'rwa_resident' | 'admin';
  society_name?: string;
  community_role?: 'customer' | 'coordinator' | 'resident' | 'admin';
  apartment_block?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  defaultAddress: SavedAddress | null;
  login: (token: string, user: User, defaultAddress?: SavedAddress | null) => void;
  logout: () => Promise<void>;
  isLoading: boolean;
  refreshSession: () => Promise<void>;
  setDefaultAddress: React.Dispatch<React.SetStateAction<SavedAddress | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [defaultAddress, setDefaultAddress] = useState<SavedAddress | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearStoredSession = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const parseStoredUser = (): User | null => {
    const savedUser = localStorage.getItem('user');
    if (!savedUser) return null;

    try {
      return JSON.parse(savedUser) as User;
    } catch {
      clearStoredSession();
      return null;
    }
  };

  const refreshSession = async () => {
    const savedToken = localStorage.getItem('token');
    const parsedUser = parseStoredUser();

    if (savedToken && parsedUser && !user) {
      setToken(savedToken);
      setUser(parsedUser);
    }

    if (!savedToken) {
      setIsLoading(false);
      return;
    }

    if (!parsedUser) {
      setToken(null);
      setUser(null);
      setDefaultAddress(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${savedToken}` },
        credentials: 'include',
      });

      if (!response.ok) {
        clearStoredSession();
        setToken(null);
        setUser(null);
        setDefaultAddress(null);
        setIsLoading(false);
        return;
      }

      const data = await response.json().catch(() => ({}));
      const nextUser = data.user || parsedUser;
      setToken(savedToken);
      setUser(nextUser);
      setDefaultAddress(data.defaultAddress || null);
      localStorage.setItem('user', JSON.stringify(nextUser));
    } catch {
      clearStoredSession();
      setToken(null);
      setUser(null);
      setDefaultAddress(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshSession();
  }, []);

  const login = (newToken: string, newUser: User, nextDefaultAddress?: SavedAddress | null) => {
    setToken(newToken);
    setUser(newUser);
    setDefaultAddress(nextDefaultAddress || null);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        });
      }
    } catch {
      // Best effort logout so local cleanup still happens.
    } finally {
      setToken(null);
      setUser(null);
      setDefaultAddress(null);
      clearStoredSession();
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, defaultAddress, login, logout, isLoading, refreshSession, setDefaultAddress }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}