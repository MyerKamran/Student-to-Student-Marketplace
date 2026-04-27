import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Camera, FileText, ArrowLeft } from 'lucide-react';
import { ToastContainer } from '../components/Toast';
import { getProduct, updateProduct } from '../api/productsClient';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = ['Books', 'Notes', 'Electronics', 'Stationery', 'Lab Equipment', 'Other'];
const CONDITIONS = ['New', 'Like New', 'Good', 'Fair', 'Poor'];

const EMPTY_FORM = {
  title: '',
  description: '',
  category: 'Books',
  condition: 'New',
  price: '',
  imageUrl: '',
  stockQty: 1,
  isAvailable: true,
};

function EditListing() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isMine, setIsMine] = useState(false);

  const productId = useMemo(() => Number(id), [id]);

  function addToast(message, type = 'success') {
    const tid = Date.now();
    setToasts((prev) => [...prev, { id: tid, message, type }]);
  }
  function removeToast(tid) {
    setToasts((prev) => prev.filter((t) => t.id !== tid));
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const resp = await getProduct(productId);
        if (!alive) return;
        const row = resp.row;
        const mine = Boolean(row?.sellerId) && String(row.sellerId) === String(currentUser?.id);
        setIsMine(mine);
        setForm({
          title: row?.title || '',
          description: row?.description || '',
          category: row?.category || 'Other',
          condition: row?.condition || 'Good',
          price: row?.price ?? '',
          imageUrl: row?.image || '',
          stockQty: 1,
          isAvailable: true,
        });
      } catch (e) {
        addToast(e.message || 'Failed to load listing', 'error');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [productId, currentUser?.id]);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await updateProduct(productId, {
        title: form.title,
        description: form.description,
        category: form.category,
        condition: form.condition,
        price: form.price,
        imageUrl: form.imageUrl,
        stockQty: form.stockQty,
        isAvailable: form.isAvailable,
      });
      addToast('Listing updated!', 'success');
      setTimeout(() => navigate('/dashboard'), 500);
    } catch (err) {
      addToast(err.message || 'Failed to update listing', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="pt-20 pb-16 px-4 page-enter">
      <div className="max-w-2xl mx-auto">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 transition-colors mb-6">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Listing</h1>
        <p className="text-gray-500 mb-8">Update your listing details</p>

        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 text-gray-500">Loading…</div>
        ) : !isMine ? (
          <div className="bg-white rounded-2xl border border-red-100 p-6">
            <div className="text-red-700 font-bold">You can only edit your own listings.</div>
            <p className="text-sm text-gray-500 mt-2">Go back to your dashboard and select one of your listings.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">
                  <FileText size={16} className="text-indigo-500" /> Basic Info
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Item Title *</label>
                    <input
                      name="title"
                      type="text"
                      value={form.title}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm
                        focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      required
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm
                        focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                      <select
                        name="category"
                        value={form.category}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white
                          focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      >
                        {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Condition *</label>
                      <select
                        name="condition"
                        value={form.condition}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white
                          focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      >
                        {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Price (PKR) *</label>
                      <input
                        name="price"
                        type="number"
                        min="0"
                        value={form.price}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm
                          focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Stock Qty</label>
                      <input
                        name="stockQty"
                        type="number"
                        min="0"
                        value={form.stockQty}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm
                          focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
                      />
                    </div>
                  </div>

                  <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                    <input type="checkbox" name="isAvailable" checked={form.isAvailable} onChange={handleChange} />
                    Available for sale
                  </label>
                </div>
              </div>

              <hr className="border-gray-100" />

              <div>
                <h2 className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">
                  <Camera size={16} className="text-indigo-500" /> Photo
                </h2>

                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                <input
                  name="imageUrl"
                  type="url"
                  value={form.imageUrl}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm
                    focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold
                  hover:bg-indigo-700 active:scale-95 transition-all duration-200
                  disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {submitting ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </main>
  );
}

export default EditListing;

