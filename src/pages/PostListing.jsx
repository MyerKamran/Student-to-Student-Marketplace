// PostListing — protected page for creating a new listing
import { useState } from 'react';
import { Camera, Tag, FileText, DollarSign, Phone } from 'lucide-react';
import { ToastContainer } from '../components/Toast';
import { createProduct } from '../api/productsClient';

const CATEGORIES = ['Books', 'Notes', 'Electronics', 'Stationery', 'Lab Equipment', 'Other'];
const CONDITIONS = ['New', 'Like New', 'Good', 'Fair', 'Poor'];
const CONTACT_OPTIONS = ['In-app Message', 'WhatsApp', 'Email'];

const EMPTY_FORM = {
  title: '', description: '', category: 'Books', condition: 'New',
  price: '', imageUrl: '', contact: 'In-app Message',
};

function PostListing() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [toasts, setToasts] = useState([]);

  function addToast(message, type = 'success') {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  }

  function removeToast(id) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    (async () => {
      setSubmitting(true);
      try {
        await createProduct({
          title: form.title,
          description: form.description,
          category: form.category,
          condition: form.condition,
          price: form.price,
          imageUrl: form.imageUrl,
          contactPreference: form.contact,
          // campus can be derived from user later; allowing optional field from DB trigger/user profile
        });
        addToast('Your listing has been posted successfully!', 'success');
        setForm(EMPTY_FORM);
      } catch (err) {
        addToast(err.message || 'Failed to post listing', 'error');
      } finally {
        setSubmitting(false);
      }
    })();
  }

  return (
    <main className="pt-24 pb-16 px-4 page-enter">
      <div className="max-w-2xl mx-auto">

        {/* Page header */}
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Post a New Listing</h1>
        <p className="text-gray-500 mb-8">Fill in the details below to list your item for fellow students</p>

        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">

            {/* ─── Section 1: Basic Info ─── */}
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">
                <FileText size={16} className="text-indigo-500" /> Basic Info
              </h2>

              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Item Title *</label>
                  <input
                    name="title"
                    type="text"
                    value={form.title}
                    onChange={handleChange}
                    placeholder="e.g. Calculus by Thomas 12th Edition"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm
                      focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Describe your item — condition, edition, any marks or damage..."
                    required
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm
                      focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200 resize-none"
                  />
                </div>

                {/* Category + Condition */}
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

                {/* Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (PKR) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">PKR</span>
                    <input
                      name="price"
                      type="number"
                      min="0"
                      value={form.price}
                      onChange={handleChange}
                      placeholder="e.g. 800"
                      required
                      className="w-full pl-14 pr-4 py-3 rounded-xl border border-gray-200 text-sm
                        focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
                    />
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* ─── Section 2: Photo ─── */}
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">
                <Camera size={16} className="text-indigo-500" /> Photo
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                <input
                  name="imageUrl"
                  type="url"
                  value={form.imageUrl}
                  onChange={handleChange}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm
                    focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
                />
              </div>

              {/* Image preview */}
              <div className="mt-3 rounded-xl border-2 border-dashed border-gray-200 overflow-hidden h-40
                flex items-center justify-center bg-gray-50">
                {form.imageUrl ? (
                  <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center text-gray-400">
                    <Camera size={32} className="mb-2" />
                    <span className="text-sm">Image preview</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                💡 Tip: Use a clear photo of the actual item to attract more buyers
              </p>
            </div>

            <hr className="border-gray-100" />

            {/* ─── Section 3: Contact ─── */}
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">
                <Phone size={16} className="text-indigo-500" /> Contact Preference
              </h2>
              <select
                name="contact"
                value={form.contact}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              >
                {CONTACT_OPTIONS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold
                hover:bg-indigo-700 active:scale-95 transition-all duration-200
                disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Posting...
                </>
              ) : (
                'Post Listing'
              )}
            </button>
          </div>
        </form>
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </main>
  );
}

export default PostListing;
