import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/utils';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api('/auth/me').then(setUser).catch(() => setUser(null)).finally(() => setLoading(false));
    }, []);

    const login = async (username, password) => {
        const data = await api('/auth/login', { method: 'POST', body: { username, password } });
        setUser(data);
        return data;
    };

    const logout = async () => {
        await api('/auth/logout', { method: 'POST' }).catch(() => {});
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be inside AuthProvider');
    return ctx;
}
