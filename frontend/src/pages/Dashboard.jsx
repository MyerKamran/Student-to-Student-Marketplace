// Dashboard — protected page showing user stats, listings table, and saved items
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, CheckCircle2, Heart, Pencil, Trash2, X, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { categoryColors, conditionColors } from '../data/mockData';
import ListingCard from '../components/ListingCard';
import { ToastContainer } from '../components/Toast';
import { useFavorites } from '../context/FavoritesContext';

function getInitials(name) {
  return name?.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) || 'U';
}

async function api(path, options) {
  const res = await fetch(path, { credentials: 'include', ...options });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.error || `Request failed: ${res.status}`);
  return data;
}

function Dashboard() {
  const { currentUser, saveProfile } = useAuth();
  const { favorites, removeFavorite } = useFavorites();
  const [activeTab, setActiveTab] = useState('listings');
  const [loadingListings, setLoadingListings] = useState(true);
  const [listings, setListings] = useState([]);
  const [deleteId, setDeleteId] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [profileOpen, setProfileOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    campus: '',
    occupation: 'Student',
    phoneNumber: '',
    bio: '',
  });
  const activeListings = useMemo(() => listings.filter((l) => l.status !== 'sold'), [listings]);
  const soldListings = useMemo(() => listings.filter((l) => l.status === 'sold'), [listings]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingListings(true);
      try {
        const resp = await api('/api/my/products');
        if (!alive) return;
        setListings(resp.rows || []);
      } catch (e) {
        if (!alive) return;
        setListings([]);
        addToast(e.message || 'Failed to load your listings', 'error');
      } finally {
        if (alive) setLoadingListings(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addToast(message, type = 'success') {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  }
  function removeToast(id) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  function openProfileModal() {
    setProfileForm({
      name: currentUser?.name || '',
      campus: currentUser?.campus || '',
      occupation: currentUser?.occupation || 'Student',
      phoneNumber: currentUser?.phoneNumber || '',
      bio: currentUser?.bio || '',
    });
    setProfileOpen(true);
  }

  function onProfileChange(e) {
    const { name, value } = e.target;
    setProfileForm((p) => ({ ...p, [name]: value }));
  }

  async function onSaveProfile() {
    setSavingProfile(true);
    try {
      await saveProfile(profileForm);
      addToast('Profile updated', 'success');
      setProfileOpen(false);
    } catch (e) {
      addToast(e.message || 'Failed to update profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  }

  function confirmDelete(id) { setDeleteId(id); }

  async function handleDelete() {
    try {
      await api(`/api/products/${encodeURIComponent(deleteId)}`, { method: 'DELETE' });
      const resp = await api('/api/my/products');
      setListings(resp.rows || []);
      addToast('Listing deleted successfully', 'info');
    } catch (e) {
      addToast(e.message || 'Failed to delete listing', 'error');
    } finally {
      setDeleteId(null);
    }
  }

  function onRemoveSaved(id) {
    removeFavorite(id);
    addToast('Removed from saved items', 'info');
  }

  const itemsSold = useMemo(
    () => listings.reduce((sum, item) => sum + Number(item.soldQty || 0), 0),
    [listings]
  );
  const totalEarned = useMemo(
    () => listings.reduce((sum, item) => sum + Number(item.earned || 0), 0),
    [listings]
  );

  const stats = useMemo(() => ([
    { label: 'My Listings', value: listings.length, icon: <Package size={20} />, bg: 'bg-purple-50', text: 'text-purple-700' },
    { label: 'Items Sold', value: itemsSold, icon: <CheckCircle2 size={20} />, bg: 'bg-green-50', text: 'text-green-700' },
    { label: 'Saved Items', value: favorites.length, icon: <Heart size={20} />, bg: 'bg-blue-50', text: 'text-blue-700' },
    { label: 'Total Earned', value: `PKR ${totalEarned.toLocaleString()}`, icon: <span className="text-xl font-black">₨</span>, bg: 'bg-indigo-100', text: 'text-indigo-700' },
  ]), [listings.length, itemsSold, favorites.length, totalEarned]);

  return (
    <main className="pt-16 pb-16 page-enter">

      {/* ─── Profile Banner ─── */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-white/20 border-4 border-white flex items-center justify-center flex-shrink-0">
            <span className="text-white text-2xl font-bold">{getInitials(currentUser?.name)}</span>
          </div>
          <div className="text-center sm:text-left flex-1">
            <h1 className="text-2xl font-bold text-white">{currentUser?.name}</h1>
            <p className="text-indigo-200 text-sm">{currentUser?.email}</p>
            <p className="text-indigo-200 text-sm">📍 {currentUser?.campus}</p>
            <p className="text-indigo-100 text-sm mt-1">
              {currentUser?.occupation || 'Student'} {currentUser?.bio ? `· ${currentUser.bio}` : ''}
            </p>
          </div>
          <button
            onClick={openProfileModal}
            className="px-4 py-2 border border-white/50 text-white rounded-xl text-sm font-medium
            hover:bg-white/10 transition-all duration-200">
            Edit Profile
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ─── Stats Row ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 -mt-6 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className={`${stat.bg} rounded-2xl p-5 shadow-sm border border-white flex items-center gap-4`}>
              <div className={`${stat.text}`}>{stat.icon}</div>
              <div>
                <p className={`text-xl font-bold ${stat.text}`}>{stat.value}</p>
                <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ─── Tab Navigation ─── */}
        <div className="flex border-b border-gray-200 mb-6">
          {['listings', 'sold', 'saved'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all duration-200 capitalize
                ${activeTab === tab
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {tab === 'listings' ? 'My Listings' : tab === 'sold' ? 'Sold Items' : 'Saved Items'}
            </button>
          ))}
        </div>

        {/* ─── My Listings Tab ─── */}
        {activeTab === 'listings' && (
          <div>
            <div className="flex justify-end mb-4">
              <Link
                to="/sell"
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium
                  hover:bg-indigo-700 transition-all duration-200"
              >
                <Plus size={16} /> Post New Listing
              </Link>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Item</th>
                      <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Price</th>
                      <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                      <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Condition</th>
                      <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {loadingListings ? (
                      <tr>
                        <td className="px-6 py-6 text-gray-500" colSpan={6}>
                          Loading your listings…
                        </td>
                      </tr>
                    ) : activeListings.length === 0 ? (
                      <tr>
                        <td className="px-6 py-6 text-gray-500" colSpan={6}>
                          You haven’t posted anything yet.
                        </td>
                      </tr>
                    ) : activeListings.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img src={item.image} alt={item.title}
                              className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                            <span className="font-medium text-gray-900 line-clamp-1">{item.title}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 font-semibold text-indigo-600">PKR {item.price.toLocaleString()}</td>
                        <td className="px-4 py-4">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${categoryColors[item.category] || 'bg-gray-100 text-gray-700'}`}>
                            {item.category}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${conditionColors[item.condition] || 'bg-gray-100 text-gray-700'}`}>
                            {item.condition}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full
                            ${item.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'}`}>
                            {item.status === 'active' ? 'Active' : 'Ordered'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/sell/${encodeURIComponent(item.id)}/edit`}
                              className="p-2 rounded-lg hover:bg-indigo-50 text-indigo-600 transition-colors"
                              aria-label="Edit listing"
                            >
                              <Pencil size={14} />
                            </Link>
                            <button
                              onClick={() => confirmDelete(item.id)}
                              className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                              aria-label="Delete listing"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── Sold Items Tab ─── */}
        {activeTab === 'sold' && (
          <div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Item</th>
                      <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Price</th>
                      <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sold Qty</th>
                      <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Earned</th>
                      <th className="text-left px-4 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {loadingListings ? (
                      <tr>
                        <td className="px-6 py-6 text-gray-500" colSpan={5}>Loading sold items…</td>
                      </tr>
                    ) : soldListings.length === 0 ? (
                      <tr>
                        <td className="px-6 py-6 text-gray-500" colSpan={5}>No sold items yet.</td>
                      </tr>
                    ) : soldListings.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img src={item.image} alt={item.title} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                            <span className="font-medium text-gray-900 line-clamp-1">{item.title}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 font-semibold text-indigo-600">PKR {item.price.toLocaleString()}</td>
                        <td className="px-4 py-4 text-gray-700">{item.soldQty}</td>
                        <td className="px-4 py-4 font-semibold text-green-700">PKR {Number(item.earned || 0).toLocaleString()}</td>
                        <td className="px-4 py-4">
                          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-200 text-gray-700">
                            Sold
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── Saved Items Tab ─── */}
        {activeTab === 'saved' && (
          <div>
            {favorites.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Heart size={48} className="text-gray-300 mb-4" />
                <h3 className="text-lg font-bold text-gray-700 mb-2">No saved items yet</h3>
                <p className="text-gray-400 text-sm mb-6">Items you save will appear here</p>
                <Link to="/listings"
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-all">
                  Browse Listings
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {favorites.map((item) => (
                  <div key={item.id} className="relative">
                    <button
                      onClick={() => onRemoveSaved(item.id)}
                      className="absolute top-3 left-3 z-10 bg-white rounded-full p-1.5 shadow-sm
                        hover:bg-red-50 text-gray-500 hover:text-red-500 transition-all duration-200"
                      aria-label="Remove from saved"
                    >
                      <X size={14} />
                    </button>
                    <ListingCard {...item} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Delete Confirmation Modal ─── */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Listing?</h3>
            <p className="text-gray-500 text-sm mb-6">
              Are you sure you want to delete this listing? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium
                  hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium
                  hover:bg-red-700 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {profileOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Edit Profile</h3>
            <div className="space-y-3">
              <input
                name="name"
                value={profileForm.name}
                onChange={onProfileChange}
                placeholder="Full name"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm"
              />
              <input
                name="campus"
                value={profileForm.campus}
                onChange={onProfileChange}
                placeholder="Campus"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm"
              />
              <input
                name="occupation"
                value={profileForm.occupation}
                onChange={onProfileChange}
                placeholder="Occupation"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm"
              />
              <input
                name="phoneNumber"
                value={profileForm.phoneNumber}
                onChange={onProfileChange}
                placeholder="Phone number"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm"
              />
              <textarea
                name="bio"
                value={profileForm.bio}
                onChange={onProfileChange}
                rows={3}
                placeholder="Bio"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm resize-none"
              />
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setProfileOpen(false)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium"
              >
                Cancel
              </button>
              <button
                disabled={savingProfile}
                onClick={() => void onSaveProfile()}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium disabled:opacity-70"
              >
                {savingProfile ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </main>
  );
}

export default Dashboard;
