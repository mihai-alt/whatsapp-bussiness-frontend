import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { AuthProvider } from './context/AuthContext';
import { NotificationsProvider } from './context/NotificationsContext';
import { WorkspaceRealtimeProvider } from './context/WorkspaceRealtimeContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import { PageLoader } from './components/ui';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const WhatsAppPage = lazy(() => import('./pages/WhatsAppPage'));
const BusinessProfilePage = lazy(() => import('./pages/BusinessProfilePage'));
const TemplatesPage = lazy(() => import('./pages/TemplatesPage'));
const ContactsPage = lazy(() => import('./pages/ContactsPage'));
const GroupsPage = lazy(() => import('./pages/GroupsPage'));
const CampaignsPage = lazy(() => import('./pages/CampaignsPage'));
const NewCampaignPage = lazy(() => import('./pages/NewCampaignPage'));
const CampaignDetailPage = lazy(() => import('./pages/CampaignDetailPage'));
const WalletPage = lazy(() => import('./pages/WalletPage'));
const AdminWalletPage = lazy(() => import('./pages/AdminWalletPage'));
const AdminWalletTransactionsPage = lazy(() => import('./pages/AdminWalletTransactionsPage'));
const AdminWalletRechargesPage = lazy(() => import('./pages/AdminWalletRechargesPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const AuditLogsPage = lazy(() => import('./pages/AuditLogsPage'));

function PageFallback() {
  return (
    <div className="grid min-h-[50vh] place-items-center">
      <PageLoader size="lg" />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <NotificationsProvider>
            <WorkspaceRealtimeProvider>
              <BrowserRouter>
                <Suspense fallback={<PageFallback />}>
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
                        <Route path="audit-logs" element={<AuditLogsPage />} />
                      </Route>
                    </Route>
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </WorkspaceRealtimeProvider>
          </NotificationsProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
