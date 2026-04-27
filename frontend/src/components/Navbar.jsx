// Navbar — fixed top navigation bar with auth-aware links and mobile hamburger menu
import { useEffect, useMemo, useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { Menu, X, Bell, ChevronDown, BookOpen, ShoppingCart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getNotifications } from '../api/notificationsClient';

// Returns initials from full name
function getInitials(name) {
  return name?.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) || 'U';
}

function Navbar() {
  const { isLoggedIn, currentUser, logout } = useAuth();
  const isAdmin = String(currentUser?.role || '').toLowerCase() === 'admin';
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notif, setNotif] = useState({ unreadMessages: 0, openOrders: 0 });

  const notifCount = useMemo(
    () => Number(notif?.unreadMessages || 0) + Number(notif?.openOrders || 0),
    [notif?.openOrders, notif?.unreadMessages]
  );

  useEffect(() => {
    if (!isLoggedIn) {
      setNotif({ unreadMessages: 0, openOrders: 0 });
      return undefined;
    }

    let alive = true;
    async function tick() {
      try {
        const data = await getNotifications();
        if (!alive) return;
        setNotif({
          unreadMessages: Number(data?.unreadMessages || 0),
          openOrders: Number(data?.openOrders || 0),
        });
      } catch {
        // ignore; keep last badge
      }
    }

    void tick();
    const id = window.setInterval(tick, 20000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [isLoggedIn]);

  const navLinkClass = ({ isActive }) =>
    `text-sm font-medium transition-all duration-200 pb-0.5 ${
      isActive
        ? 'text-indigo-600 border-b-2 border-indigo-600'
        : 'text-gray-600 hover:text-indigo-600'
    }`;

  function handleLogout() {
    logout(navigate);
    setDropdownOpen(false);
    setMobileOpen(false);
    setNotifOpen(false);
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-indigo-600">
            <BookOpen size={22} className="text-indigo-600" />
            <span>CampusMarket</span>
          </Link>

          {/* Center nav links — desktop */}
          <div className="hidden md:flex items-center gap-8">
            <NavLink to="/" end className={navLinkClass}>Home</NavLink>
            <NavLink to="/listings" className={navLinkClass}>Listings</NavLink>
            {isLoggedIn && !isAdmin && <NavLink to="/orders" className={navLinkClass}>Orders</NavLink>}
            {!isAdmin && <NavLink to="/sell" className={navLinkClass}>Sell</NavLink>}
            {isLoggedIn && isAdmin && <NavLink to="/admin" className={navLinkClass}>Admin</NavLink>}
          </div>

          {/* Right side — desktop */}
          <div className="hidden md:flex items-center gap-3">
            {!isLoggedIn ? (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-xl border border-indigo-600 text-indigo-600
                    text-sm font-medium hover:bg-indigo-50 transition-all duration-200"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white
                    text-sm font-medium hover:bg-indigo-700 transition-all duration-200"
                >
                  Register
                </Link>
              </>
            ) : (
              <>
                {!isAdmin && (
                  <Link
                    to="/sell"
                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white
                      text-sm font-medium hover:bg-indigo-700 transition-all duration-200"
                  >
                    + Sell
                  </Link>
                )}
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white
                      text-sm font-medium hover:bg-indigo-700 transition-all duration-200"
                  >
                    Admin Panel
                  </Link>
                )}

                {!isAdmin && (
                  <Link
                    to="/cart"
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                    aria-label="Cart"
                  >
                    <ShoppingCart size={18} className="text-gray-600" />
                  </Link>
                )}

                {/* Bell notification */}
                {!isAdmin && <div className="relative">
                  <button
                    type="button"
                    className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
                    onClick={() => setNotifOpen((p) => !p)}
                    aria-label="Notifications"
                  >
                  <Bell size={18} className="text-gray-600" />
                    {notifCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1.5 bg-red-500 text-white text-[10px]
                        rounded-full flex items-center justify-center font-bold shadow">
                        {notifCount > 99 ? '99+' : notifCount}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <div className="text-sm font-bold text-gray-900">Notifications</div>
                        <div className="text-xs text-gray-500">Updates from your messages and orders</div>
                      </div>

                      <div className="p-3 space-y-2">
                        <Link
                          to="/messages"
                          onClick={() => setNotifOpen(false)}
                          className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <span className="text-gray-700">Unread messages</span>
                          <span className="font-bold text-gray-900">{notif.unreadMessages}</span>
                        </Link>
                        <Link
                          to="/orders"
                          onClick={() => setNotifOpen(false)}
                          className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <span className="text-gray-700">Open orders</span>
                          <span className="font-bold text-gray-900">{notif.openOrders}</span>
                        </Link>
                        <div className="pt-2">
                          <Link
                            to="/dashboard"
                            onClick={() => setNotifOpen(false)}
                            className="block w-full text-center py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
                          >
                            View Dashboard
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </div>}

                {/* Avatar dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen((p) => !p)}
                    className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 transition-colors"
                    aria-label="User menu"
                  >
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">
                        {getInitials(currentUser?.name)}
                      </span>
                    </div>
                    <ChevronDown size={14} className="text-gray-500" />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900">{currentUser?.name}</p>
                        <p className="text-xs text-gray-500">{currentUser?.campus}</p>
                      </div>
                      <Link
                        to="/dashboard"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        My Dashboard
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen((p) => !p)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 flex flex-col gap-3">
          <NavLink to="/" end className={navLinkClass} onClick={() => setMobileOpen(false)}>Home</NavLink>
          <NavLink to="/listings" className={navLinkClass} onClick={() => setMobileOpen(false)}>Listings</NavLink>
          {isLoggedIn && (
            !isAdmin && <NavLink to="/orders" className={navLinkClass} onClick={() => setMobileOpen(false)}>Orders</NavLink>
          )}
          {!isAdmin && <NavLink to="/sell" className={navLinkClass} onClick={() => setMobileOpen(false)}>Sell</NavLink>}
          {isLoggedIn && isAdmin && <NavLink to="/admin" className={navLinkClass} onClick={() => setMobileOpen(false)}>Admin</NavLink>}

          {!isLoggedIn ? (
            <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="w-full text-center py-2 rounded-xl border border-indigo-600 text-indigo-600 text-sm font-medium"
              >
                Login
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileOpen(false)}
                className="w-full text-center py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium"
              >
                Register
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
              <div className="text-sm text-gray-700 font-medium">
                Signed in as <span className="text-indigo-600">{currentUser?.name}</span>
              </div>
              {!isAdmin && (
                <Link to="/cart" onClick={() => setMobileOpen(false)}
                  className="text-sm text-gray-700 hover:text-indigo-600 transition-colors">
                  Cart
                </Link>
              )}
              <Link to={isAdmin ? '/admin' : '/dashboard'} onClick={() => setMobileOpen(false)}
                className="text-sm text-gray-700 hover:text-indigo-600 transition-colors">
                {isAdmin ? 'Admin Panel' : 'My Dashboard'}
              </Link>
              <button onClick={handleLogout}
                className="text-left text-sm text-red-600 hover:text-red-700 transition-colors">
                Logout
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

export default Navbar;
