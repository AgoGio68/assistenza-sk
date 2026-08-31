import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
    requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requireAdmin = false }) => {
    const { currentUser, isApproved, isAdmin, loading } = useAuth();

    if (loading) {
        return (
            <div style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
                <div className="spinner" style={{ width: 36, height: 36 }} />
            </div>
        );
    }


    if (!currentUser) {
        // Salva il percorso attuale per il redirect dopo il login
        const currentPath = window.location.pathname + window.location.search;
        if (currentPath !== '/login' && currentPath !== '/') {
            localStorage.setItem('redirectPath', currentPath);
        }
        return <Navigate to="/login" replace />;
    }

    if (!isApproved) {
        // Se l'utente è anonimo, lo mandiamo al login (non ha senso fargli vedere "pending approval")
        if (currentUser.isAnonymous) {
            return <Navigate to="/login" replace />;
        }
        return <Navigate to="/pending" replace />;
    }

    if (requireAdmin && !isAdmin) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};
