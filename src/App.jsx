import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { NotificationsProvider } from './context/NotificationsContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import WhatsAppPage from './pages/WhatsAppPage';
import BusinessProfilePage from './pages/BusinessProfilePage';
import TemplatesPage from './pages/TemplatesPage';
import ContactsPage from './pages/ContactsPage';
import GroupsPage from './pages/GroupsPage';
import CampaignsPage from './pages/CampaignsPage';
import NewCampaignPage from './pages/NewCampaignPage';
import CampaignDetailPage from './pages/CampaignDetailPage';
import WalletPage from './pages/WalletPage';
import AdminWalletPage from './pages/AdminWalletPage';
import AdminWalletTransactionsPage from './pages/AdminWalletTransactionsPage';
import AdminWalletRechargesPage from './pages/AdminWalletRechargesPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import UsersPage from './pages/UsersPage';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationsProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="whatsapp" element={<WhatsAppPage />} />
                <Route path="profile" element={<BusinessProfilePage />} />
                <Route path="templates" element={<TemplatesPage />} />
                <Route path="contacts" element={<ContactsPage />} />
                <Route path="groups" element={<GroupsPage />} />
                <Route path="campaigns" element={<CampaignsPage />} />
                <Route path="campaigns/new" element={<NewCampaignPage />} />
                <Route path="campaigns/create" element={<NewCampaignPage />} />
                <Route path="campaigns/:id" element={<CampaignDetailPage />} />
                <Route path="wallet" element={<WalletPage />} />
                <Route path="admin/wallet" element={<AdminWalletPage />} />
                <Route path="admin/wallet/transactions" element={<AdminWalletTransactionsPage />} />
                <Route path="admin/wallet/recharges" element={<AdminWalletRechargesPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="users" element={<UsersPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        </NotificationsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
