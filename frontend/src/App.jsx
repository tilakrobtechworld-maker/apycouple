import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import LandingPage from './pages/LandingPage';
import Login from './pages/AuthPages/Login';
import Register from './pages/AuthPages/Register';
import DashboardLayout from './components/layout/DashboardLayout';
import DashboardHome from './pages/Dashboard/DashboardHome';
import GuestsPage from './pages/Dashboard/GuestsPage';
import EventsPage from './pages/Dashboard/EventsPage';
import RsvpPage from './pages/Dashboard/RsvpPage';
import LogisticsPage from './pages/Dashboard/LogisticsPage';
import MediaPage from './pages/Dashboard/MediaPage';
import GuestbookPage from './pages/Dashboard/GuestbookPage';
import RegistryPage from './pages/Dashboard/RegistryPage';
import TravelPage from './pages/Dashboard/TravelPage';
import WebsiteEditor from './pages/Dashboard/WebsiteEditor';
import CardCreator from './pages/Dashboard/CardCreator';
import NotificationsPage from './pages/Dashboard/NotificationsPage';
import SettingsPage from './pages/Dashboard/SettingsPage';
import CoupleWebsite from './pages/PublicWebsite/CoupleWebsite';
import PublicCard from './pages/PublicCard/PublicCard';
import PublicRsvpForm from './pages/RsvpForm/PublicRsvpForm';

function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

function GuestRoute({ children }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  return !user ? children : <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

          <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<DashboardHome />} />
            <Route path="guests" element={<GuestsPage />} />
            <Route path="events" element={<EventsPage />} />
            <Route path="rsvp" element={<RsvpPage />} />
            <Route path="logistics" element={<LogisticsPage />} />
            <Route path="media" element={<MediaPage />} />
            <Route path="guestbook" element={<GuestbookPage />} />
            <Route path="registry" element={<RegistryPage />} />
            <Route path="travel" element={<TravelPage />} />
            <Route path="website" element={<WebsiteEditor />} />
            <Route path="cards" element={<CardCreator />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route path="/w/:slug" element={<CoupleWebsite />} />
          <Route path="/card/:slug" element={<PublicCard />} />
          <Route path="/rsvp/:token" element={<PublicRsvpForm />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

