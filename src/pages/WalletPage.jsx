import { useAuth } from '../context/AuthContext';
import AdminWalletPage from './AdminWalletPage';
import MemberWalletPage from './MemberWalletPage';

/**
 * Same business wallet for everyone.
 * Admin gets management dashboard; member keeps the existing member wallet UI.
 */
export default function WalletPage() {
  const { isAdmin } = useAuth();
  return isAdmin ? <AdminWalletPage /> : <MemberWalletPage />;
}
