
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { PendingApproval } from './pages/PendingApproval';

import { Navigation } from './components/Navigation';
import { CreateTicket } from './pages/CreateTicket';
import { TicketList } from './pages/TicketList';
import { AdminDashboard } from './pages/AdminDashboard';

// Placeholders for main pages



function App() {
    return (
        <SettingsProvider>
            <AuthProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/pending" element={<PendingApproval />} />

                        <Route element={<ProtectedRoute />}>
                            <Route element={
                                <div className="app-container">
                                    <Navigation />
                                    <main className="app-content">
                                        <Outlet />
                                    </main>
                                </div>
                            }>
                                <Route path="/" element={<TicketList />} />
                                <Route path="/create" element={<CreateTicket />} />
                            </Route>
                        </Route>

                        <Route element={<ProtectedRoute requireAdmin={true} />}>
                            <Route path="/admin" element={
                                <div className="app-container">
                                    <Navigation />
                                    <main className="app-content">
                                        <AdminDashboard />
                                    </main>
                                </div>
                            } />
                        </Route>
                    </Routes>
                </BrowserRouter>
            </AuthProvider>
        </SettingsProvider>
    );
}

export default App;
