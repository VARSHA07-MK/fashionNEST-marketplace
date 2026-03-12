import { Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyAccount from './pages/VerifyAccount';
import CustomerDashboard from './pages/CustomerDashboard';
import RWADashboard from './pages/RWADashboard';
import AdminDashboard from './pages/AdminDashboard';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import { ShoppingBag, User, LogOut } from 'lucide-react';
import BrandLogo from './components/BrandLogo';

function Navbar() {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const primaryLink = user?.role === 'admin' ? '/dashboard' : '/';
  const primaryLabel = user?.role === 'admin' ? 'Dashboard' : 'Home';

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center">
          <BrandLogo compact />
        </Link>

        <div className="flex items-center space-x-4 md:space-x-6">
          {user ? (
            <>
              <Link
                to={primaryLink}
                className="text-sm font-medium text-gray-700 transition-colors hover:text-rose-600"
              >
                {primaryLabel}
              </Link>
              {user.role !== 'admin' ? (
                <Link
                  reloadDocument
                  to="/cart"
                  className="inline-flex items-center gap-2 rounded-full border border-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-rose-200 hover:text-rose-600"
                >
                  <ShoppingBag size={20} />
                  <span className="hidden sm:inline">Bag ({itemCount})</span>
                  <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[11px] font-bold text-white">
                    {itemCount}
                  </span>
                </Link>
              ) : null}
              <div className="hidden items-center space-x-2 text-sm font-medium text-gray-700 sm:flex">
                <User size={18} />
                <span>{user.name}</span>
              </div>
              <button
                onClick={() => {
                  void logout();
                  navigate('/login');
                }}
                className="p-2 text-gray-500 transition-colors hover:text-rose-600"
              >
                <LogOut size={20} />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium text-gray-700 transition-colors hover:text-rose-600">
                Login
              </Link>
              <Link to="/signup" className="rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-700">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function RoleLandingRoute() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'admin') {
    return <AdminDashboard />;
  }

  if (user.role === 'rwa') {
    return <RWADashboard />;
  }

  return <CustomerDashboard />;
}

export default function App() {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const marketplaceRoutes = ['/', '/dashboard', '/customer-dashboard', '/rwa-dashboard'];
  const isMarketplaceRoute = user?.role !== 'admin' && marketplaceRoutes.includes(location.pathname);
  const isAuthRoute = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify-account'].includes(location.pathname);
  const fallbackRoute = !user ? '/login' : user.role === 'admin' ? '/dashboard' : '/';

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <CartProvider>
      <div className={isMarketplaceRoute ? 'min-h-screen bg-[#f4f5f7] font-sans' : isAuthRoute ? 'min-h-screen bg-[#fff8fa] font-sans' : 'min-h-screen bg-gray-50 font-sans'}>
        {!isMarketplaceRoute && !isAuthRoute ? <Navbar /> : null}
        <main key={location.pathname} className={isMarketplaceRoute || isAuthRoute ? '' : 'mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8'}>
          <Routes location={location}>
            <Route path="/" element={<RoleLandingRoute />} />
            <Route path="/dashboard" element={<RoleLandingRoute />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-account" element={<VerifyAccount />} />
            <Route path="/customer-dashboard" element={user?.role === 'customer' ? <CustomerDashboard /> : <RoleLandingRoute />} />
            <Route path="/rwa-dashboard" element={user?.role === 'rwa' ? <RWADashboard /> : <RoleLandingRoute />} />
            <Route path="/admin-dashboard" element={user?.role === 'admin' ? <AdminDashboard /> : <RoleLandingRoute />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="*" element={<Navigate to={fallbackRoute} replace />} />
          </Routes>
        </main>
      </div>
    </CartProvider>
  );
}
