import { useEffect, useMemo, useState } from 'react';
import { Shield, Users, Package, UserX, UserCheck, Trash2 } from 'lucide-react';
import { getAdminOverview, listAdminProducts, listAdminUsers, removeAdminProduct, removeAdminUser, setAdminUserActive } from '../api/adminClient';
import { ToastContainer } from '../components/Toast';

function AdminPanel() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState({ users: 0, products: 0 });
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeTab, setActiveTab] = useState('users');
  const [toasts, setToasts] = useState([]);

  const adminUsers = useMemo(() => users.filter((u) => String(u.role || '').toLowerCase() === 'admin').length, [users]);

  function addToast(message, type = 'info') {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  }

  function removeToast(id) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  async function loadAll() {
    setLoading(true);
    try {
      const [o, u, p] = await Promise.all([getAdminOverview(), listAdminUsers(), listAdminProducts()]);
      setOverview({ users: Number(o.users || 0), products: Number(o.products || 0) });
      setUsers(u.rows || []);
      setProducts(p.rows || []);
    } catch (e) {
      addToast(e.message || 'Failed to load admin data', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleBlock(user) {
    try {
      await setAdminUserActive(user.id, !user.isActive);
      addToast(user.isActive ? 'User blocked.' : 'User unblocked.', 'success');
      await loadAll();
    } catch (e) {
      addToast(e.message || 'Action failed', 'error');
    }
  }

  async function handleRemoveUser(user) {
    if (!window.confirm(`Remove user "${user.name}"?`)) return;
    try {
      await removeAdminUser(user.id);
      addToast('User removed.', 'success');
      await loadAll();
    } catch (e) {
      addToast(e.message || 'Failed to remove user', 'error');
    }
  }

  async function handleRemoveProduct(product) {
    if (!window.confirm(`Remove listing "${product.title}"?`)) return;
    try {
      await removeAdminProduct(product.id);
      addToast('Listing removed.', 'success');
      await loadAll();
    } catch (e) {
      addToast(e.message || 'Failed to remove listing', 'error');
    }
  }

  return (
    <main className="pt-20 pb-16 px-4 page-enter">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="text-indigo-600" size={26} />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
            <p className="text-sm text-gray-500">Manage users and listings (messages are intentionally hidden).</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <p className="text-sm text-gray-500">Total Users</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{overview.users}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <p className="text-sm text-gray-500">Total Listings</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{overview.products}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <p className="text-sm text-gray-500">Admin Accounts</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{adminUsers}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold ${activeTab === 'users' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-700'}`}
          >
            <Users size={14} className="inline mr-1" /> Users
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold ${activeTab === 'products' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-700'}`}
          >
            <Package size={14} className="inline mr-1" /> Listings
          </button>
        </div>

        {loading ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 text-sm text-gray-500">Loading admin data...</div>
        ) : activeTab === 'users' ? (
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3">Name</th>
                    <th className="text-left px-4 py-3">Email</th>
                    <th className="text-left px-4 py-3">Role</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t border-gray-100">
                      <td className="px-4 py-3 text-gray-900 font-medium">{u.name}</td>
                      <td className="px-4 py-3 text-gray-700">{u.email}</td>
                      <td className="px-4 py-3 text-gray-700">{u.role}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {u.isActive ? 'Active' : 'Blocked'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void handleBlock(u)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${u.isActive ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}
                          >
                            {u.isActive ? <UserX size={13} className="inline mr-1" /> : <UserCheck size={13} className="inline mr-1" />}
                            {u.isActive ? 'Block' : 'Unblock'}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleRemoveUser(u)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-100 text-red-700"
                          >
                            <Trash2 size={13} className="inline mr-1" /> Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3">Listing</th>
                    <th className="text-left px-4 py-3">Seller</th>
                    <th className="text-left px-4 py-3">Price</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-t border-gray-100">
                      <td className="px-4 py-3 text-gray-900 font-medium">{p.title}</td>
                      <td className="px-4 py-3 text-gray-700">{p.seller?.name || 'Unknown'}</td>
                      <td className="px-4 py-3 text-gray-700">PKR {Number(p.price || 0).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${p.isAvailable ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                          {p.isAvailable ? 'Active' : 'Removed'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => void handleRemoveProduct(p)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-100 text-red-700"
                        >
                          <Trash2 size={13} className="inline mr-1" /> Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </main>
  );
}

export default AdminPanel;

