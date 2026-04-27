// Register page — manual signup (with optional Google on login page)
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ToastContainer } from '../components/Toast';

function Register() {
  const navigate = useNavigate();
  const { registerWithPassword } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [campus, setCampus] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);

  function addToast(message, type = 'info') {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  }

  function removeToast(id) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (password !== confirmPassword) {
      addToast('Passwords do not match.', 'error');
      return;
    }
    setLoading(true);
    try {
      await registerWithPassword({ name, email, campus, password });
      addToast('Account created successfully.', 'success');
      setTimeout(() => navigate('/dashboard'), 700);
    } catch (err) {
      addToast(err.message || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex page-enter">

      {/* ─── Left column — decorative ─── */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700
        flex-col items-center justify-center p-12 text-white">
        <BookOpen size={48} className="mb-6 text-indigo-200" />
        <h2 className="text-4xl font-bold mb-4">Join CampusMarket</h2>
        <p className="text-indigo-200 text-lg text-center max-w-sm">
          Connect with students at your university and trade academic materials easily.
        </p>
        <div className="mt-10 grid grid-cols-2 gap-4 w-full max-w-xs">
          {['Books', 'Notes', 'Electronics', 'Lab Gear'].map((item) => (
            <div key={item} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/20">
              <span className="text-white text-sm font-medium">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Right column — form ─── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white overflow-y-auto">
        <div className="w-full max-w-md">

          <div className="flex items-center gap-2 mb-8">
            <BookOpen size={24} className="text-indigo-600" />
            <span className="font-bold text-xl text-indigo-600">CampusMarket</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">Create your account</h1>
          <p className="text-gray-500 text-sm mb-8">
            Create an account with email and password.
          </p>

          <form className="space-y-3" onSubmit={onSubmit}>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm"
            />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm"
            />
            <input
              type="text"
              value={campus}
              onChange={(e) => setCampus(e.target.value)}
              placeholder="Campus (optional)"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm"
            />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min 6 chars)"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm"
            />
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold
                hover:bg-indigo-700 active:scale-95 transition-all duration-200 disabled:opacity-70"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
            <p className="text-xs text-gray-400">
              You can also use Google login from the login page.
            </p>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-600 font-medium hover:underline">
              Login
            </Link>
          </p>
        </div>
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

export default Register;
