'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from '@/lib/api/client';

interface User {
    id: string;
    name: string;
    userSe: string;
    [key: string]: any;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (credentials: any) => Promise<void>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = async () => {
        try {
            const response = await axios.get('/auth/me');
            if (response.data.success) {
                setUser(response.data.user || response.data.principal);
            } else {
                setUser(null);
            }
        } catch (error: any) {
            // 401은 미인증 상태로 정상적인 응답이므로 무시
            if (error.response?.status !== 401) {
                console.error('Auth check error:', error);
            }
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const login = async (credentials: any) => {
        try {
            const response = await axios.post('/auth/login', credentials);
            if (response.data.success) {
                setUser(response.data.user);
            } else {
                throw new Error(response.data.message || 'Login failed');
            }
        } catch (error: any) {
            console.error('Login error:', error.response?.data || error.message);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await axios.post('/auth/logout');
            setUser(null);
        } catch (error) {
            console.error('Logout failed', error);
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, checkAuth }}>
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
