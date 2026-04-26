// App.jsx — root component: wraps app in AuthProvider + BrowserRouter + routes
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { FavoritesProvider } from './context/FavoritesContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import FloatingMessengerButton from './components/FloatingMessengerButton';
import FloatingThemeToggle from './components/FloatingThemeToggle';
import { ThemeProvider } from './context/ThemeContext';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Listings from './pages/Listings';
import ListingDetail from './pages/ListingDetail';
import PostListing from './pages/PostListing';
import Dashboard from './pages/Dashboard';
import Cart from './pages/Cart';
import EditListing from './pages/EditListing';
import Messages from './pages/Messages';
import Orders from './pages/Orders';
import AdminPanel from './pages/AdminPanel';
import NotFound from './pages/NotFound';

// Pages that should NOT show the Footer
const NO_FOOTER_ROUTES = ['/login', '/register'];

function AppLayout() {
  const location = useLocation();
  const showFooter = !NO_FOOTER_ROUTES.includes(location.pathname);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <div className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/listings" element={<Listings />} />
          <Route path="/listings/:id" element={<ListingDetail />} />

          {/* Protected routes */}
          <Route
            path="/sell"
            element={
              <ProtectedRoute disallowAdmin>
                <PostListing />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sell/:id/edit"
            element={
              <ProtectedRoute disallowAdmin>
                <EditListing />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute disallowAdmin>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cart"
            element={
              <ProtectedRoute disallowAdmin>
                <Cart />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages"
            element={
              <ProtectedRoute disallowAdmin>
                <Messages />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute disallowAdmin>
                <Orders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin>
                <AdminPanel />
              </ProtectedRoute>
            }
          />

          {/* 404 catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>

      {showFooter && <Footer />}
      <FloatingThemeToggle />
      <FloatingMessengerButton />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <FavoritesProvider>
          <BrowserRouter>
            <AppLayout />
          </BrowserRouter>
        </FavoritesProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
