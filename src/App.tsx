import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { ActivationProvider } from './contexts/ActivationContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { PendingApproval } from './pages/PendingApproval';

import { Navigation } from './components/Navigation';
import { CreateTicket } from './pages/CreateTicket';
import { TicketList } from './pages/TicketList';
import { AdminDashboard } from './pages/AdminDashboard';
import { Profile } from './pages/Profile';
import { Home as Dashboard } from './pages/Home';
import { CalendarPage } from './pages/CalendarPage';
import { RapportiniPage } from './pages/RapportiniPage';
import { SharedSheet } from './pages/SharedSheet';
import { Installations } from './pages/Installations';
import { Cleanup } from './pages/Cleanup';


function App() {
    return (
        <ActivationProvider>
            <SettingsProvider>
                <LanguageProvider>
                    <AuthProvider>
                        <BrowserRouter>
                            <Routes>
                                <Route path="/login" element={<Login />} />
                                <Route path="/pending" element={<PendingApproval />} />

                                {/* PUBLIC ROUTES WITH NAVIGATION */}
                                <Route
                                    element={
                                        <div className="app-container">
                                            <Navigation />
                                            <main className="app-content">
                                                <Outlet />
                                            </main>
                                        </div>
                                    }
                                >
                                    <Route path="/sheet/ordini" element={<SharedSheet />} />
                                    <Route path="/sheet/:sheetId" element={<SharedSheet />} />

                                </Route>

                                {/* PROTECTED ROUTES */}
                                <Route element={<ProtectedRoute />}>
                                    <Route
                                        element={
                                            <div className="app-container">
                                                <Navigation />
                                                <main className="app-content">
                                                    <Outlet />
                                                </main>
                                            </div>
                                        }
                                    >
                                        <Route path="/" element={<Dashboard />} />
                                        <Route path="/calendar" element={<CalendarPage />} />
                                        <Route path="/tickets" element={<TicketList />} />
                                        <Route path="/create" element={<CreateTicket />} />
                                        <Route path="/profile" element={<Profile />} />

                                        <Route path="/installations" element={<Installations section="sk" />} />
                                        <Route path="/rapportini" element={<RapportiniPage />} />
                                    </Route>

                                    <Route
                                        element={
                                            <div className="app-container">
                                                <Navigation />
                                                <main className="app-content">
                                                    <Outlet />
                                                </main>
                                            </div>
                                        }
                                    >
                                        <Route path="/s2" element={<TicketList section="s2" />} />
                                        <Route path="/s2/installations" element={<Installations section="s2" />} />
                                        <Route path="/s2/create" element={<CreateTicket section="s2" />} />
                                    </Route>
                                </Route>

                                <Route element={<ProtectedRoute requireAdmin={true} />}>
                                    <Route
                                        path="/admin"
                                        element={
                                            <div className="app-container">
                                                <Navigation />
                                                <main className="app-content">
                                                    <AdminDashboard />
                                                </main>
                                            </div>
                                        }
                                    />
                                    <Route path="/cleanup" element={<Cleanup />} />
                                </Route>
                            </Routes>
                        </BrowserRouter>
                    </AuthProvider>
                </LanguageProvider>
            </SettingsProvider>
        </ActivationProvider>
    );
}

export default App;
