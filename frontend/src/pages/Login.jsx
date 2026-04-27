// Login page — two-column layout with Google login and toast feedback
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ToastContainer } from '../components/Toast';

function Login() {
  const { loginWithGoogle, loginWithPassword, completeGooglePasswordSetup } = useAuth();
  const navigate = useNavigate();

  const googleBtnRef = useRef(null);
  const [toasts, setToasts] = useState([]);
  const [googleReady, setGoogleReady] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingManual, setLoadingManual] = useState(false);
  const [googleToken, setGoogleToken] = useState('');
  const [needsGooglePassword, setNeedsGooglePassword] = useState(false);
  const [googlePassword, setGooglePassword] = useState('');
  const [loadingGooglePassword, setLoadingGooglePassword] = useState(false);

  function addToast(message, type = 'info') {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  }

  function removeToast(id) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      addToast('Missing VITE_GOOGLE_CLIENT_ID in your root .env.', 'error');
      return;
    }

    const g = window.google;
    if (!g?.accounts?.id) {
      addToast('Google login script not loaded. Refresh the page.', 'error');
      return;
    }

    try {
      g.accounts.id.initialize({
        client_id: clientId,
        callback: async (resp) => {
          try {
            const result = await loginWithGoogle(resp.credential);
            if (result?.requiresPasswordSetup) {
              setGoogleToken(resp.credential);
              setNeedsGooglePassword(true);
              addToast('Set a password for this Google account to continue.', 'info');
              return;
            }
            addToast('Logged in successfully. Redirecting...', 'success');
            setTimeout(() => navigate('/dashboard'), 800);
          } catch (e) {
            addToast(e.message || 'Login failed', 'error');
          }
        },
      });

      if (googleBtnRef.current) {
        g.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          width: 360,
          text: 'continue_with',
        });
        setGoogleReady(true);
      }
    } catch (e) {
      addToast(e.message || 'Failed to init Google login', 'error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleGuest() {
    addToast('Browsing as guest. Some features are restricted.', 'info');
    setTimeout(() => navigate('/'), 1000);
  }

  async function handleManualLogin(e) {
    e.preventDefault();
    setLoadingManual(true);
    try {
      await loginWithPassword(email, password);
      addToast('Logged in successfully. Redirecting...', 'success');
      setTimeout(() => navigate('/dashboard'), 700);
    } catch (e2) {
      addToast(e2.message || 'Manual login failed', 'error');
    } finally {
      setLoadingManual(false);
    }
  }

  async function handleGooglePasswordSetup(e) {
    e.preventDefault();
    setLoadingGooglePassword(true);
    try {
      const result = await completeGooglePasswordSetup(googleToken, googlePassword);
      if (result?.requiresPasswordSetup) {
        addToast('Password must be at least 6 characters.', 'error');
        return;
      }
      addToast('Password set. Logged in successfully.', 'success');
      setNeedsGooglePassword(false);
      setTimeout(() => navigate('/dashboard'), 700);
    } catch (e2) {
      addToast(e2.message || 'Failed to set password', 'error');
    } finally {
      setLoadingGooglePassword(false);
    }
  }

  return (
    <div className="min-h-screen flex page-enter">

      {/* ─── Left column — decorative ─── */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700
        flex-col items-center justify-center p-12 text-white">
        <BookOpen size={48} className="mb-6 text-indigo-200" />
        <h2 className="text-4xl font-bold mb-4">Welcome Back!</h2>
        <p className="text-indigo-200 text-lg mb-10 text-center max-w-sm">
          Login to access your campus marketplace
        </p>

        {/* Floating mock listing cards */}
        <div className="space-y-3 w-full max-w-xs">
          {['Calculus by Thomas — PKR 800', 'Data Structures Notes — PKR 300', 'Arduino Starter Kit — PKR 2500'].map((item) => (
            <div key={item} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <p className="text-white text-sm font-medium">{item}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Right column — form ─── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-md">

          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <BookOpen size={24} className="text-indigo-600" />
            <span className="font-bold text-xl text-indigo-600">CampusMarket</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">Login to your account</h1>
          <p className="text-gray-500 text-sm mb-8">
            Login with email/password or Google.
          </p>

          <div className="space-y-5">
            <form className="space-y-3" onSubmit={handleManualLogin}>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm"
              />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm"
              />
              <button
                type="submit"
                disabled={loadingManual}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm
                  hover:bg-indigo-700 active:scale-95 transition-all duration-200 disabled:opacity-70"
              >
                {loadingManual ? 'Logging in...' : 'Login'}
              </button>
            </form>

            <div
              ref={googleBtnRef}
              className="w-full flex justify-center"
              aria-label="Google sign-in button"
            />
            {!googleReady && (
              <p className="text-xs text-gray-400 text-center">
                Loading Google sign-in…
              </p>
            )}

            {needsGooglePassword && (
              <form onSubmit={handleGooglePasswordSetup} className="space-y-3 p-4 rounded-xl border border-gray-200 bg-gray-50">
                <p className="text-xs text-gray-600">
                  First Google login detected. Please set your account password.
                </p>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={googlePassword}
                  onChange={(e) => setGooglePassword(e.target.value)}
                  placeholder="Set password (min 6 chars)"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm"
                />
                <button
                  type="submit"
                  disabled={loadingGooglePassword}
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm
                    hover:bg-indigo-700 active:scale-95 transition-all duration-200 disabled:opacity-70"
                >
                  {loadingGooglePassword ? 'Saving...' : 'Save Password & Continue'}
                </button>
              </form>
            )}

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">or</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Guest */}
            <button
              type="button"
              onClick={handleGuest}
              className="w-full py-3 border border-gray-200 text-gray-700 rounded-xl font-medium text-sm
                hover:bg-gray-50 active:scale-95 transition-all duration-200"
            >
              Continue as Guest
            </button>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-indigo-600 font-medium hover:underline">
              Register here
            </Link>
          </p>
        </div>
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

export default Login;
