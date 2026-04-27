// ListingDetail — detailed single listing view with seller card, similar listings
import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Star, Heart, MessageCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import { conditionColors, categoryColors } from '../data/mockData';
import ListingCard from '../components/ListingCard';
import { ToastContainer } from '../components/Toast';
import { getProduct, listProducts } from '../api/productsClient';
import { addToCart } from '../api/cartClient';
import { sendMessage } from '../api/messagesClient';
import MessageModal from '../components/MessageModal';
import { listReviews, upsertReview } from '../api/reviewsClient';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';

function getInitials(name) {
  return name?.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '??';
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' });
}

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={14}
          className={star <= Math.floor(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
        />
      ))}
      <span className="text-xs text-gray-500 ml-1">{rating}</span>
    </div>
  );
}

function ListingDetail() {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [similar, setSimilar] = useState([]);
  const [messageOpen, setMessageOpen] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewSummary, setReviewSummary] = useState({ avgRating: 0, count: 0 });
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

  const isMyListing = useMemo(
    () => Boolean(listing?.sellerId) && Boolean(currentUser?.id) && String(listing.sellerId) === String(currentUser.id),
    [listing?.sellerId, currentUser?.id]
  );
  const isOrderedLocked = Boolean(listing?.isOrdered) || Number(listing?.stockQty || 0) <= 0;

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      setLoading(true);
      setNotFound(false);
      try {
        const resp = await getProduct(id);
        if (!alive) return;
        setListing(resp.row || null);
        setNotFound(!resp.row);
        setActiveImage(0);

        try {
          const rr = await listReviews(id);
          if (!alive) return;
          setReviews(rr.rows || []);
          setReviewSummary(rr.summary || { avgRating: 0, count: 0 });
        } catch {
          // reviews optional (table might not exist yet)
          if (!alive) return;
          setReviews([]);
          setReviewSummary({ avgRating: 0, count: 0 });
        }

        const cat = resp.row?.category;
        if (cat) {
          try {
            const simResp = await listProducts({ category: cat, limit: 50 });
            if (!alive) return;
            setSimilar((simResp.rows || []).filter((p) => String(p.id) !== String(id)).slice(0, 3));
          } catch {
            if (!alive) return;
            setSimilar([]);
          }
        } else {
          setSimilar([]);
        }
      } catch {
        try {
          const fallbackResp = await listProducts({ limit: 500 });
          if (!alive) return;
          const fallback = (fallbackResp.rows || []).find((p) => String(p.id) === String(id)) || null;
          setListing(fallback);
          setNotFound(!fallback);
          setActiveImage(0);
          setSimilar([]);
        } catch {
          if (!alive) return;
          setListing(null);
          setNotFound(true);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  function addToast(message, type = 'success') {
    const toastId = Date.now();
    setToasts((prev) => [...prev, { id: toastId, message, type }]);
  }

  function removeToast(toastId) {
    setToasts((prev) => prev.filter((t) => t.id !== toastId));
  }

  function toggleSave() {
    const next = toggleFavorite({
      id: listing.id,
      image: listing.image,
      title: listing.title,
      price: listing.price,
      condition: listing.condition,
      category: listing.category,
      sellerName: listing.sellerName,
      campus: listing.campus,
      date: listing.date,
    });
    setIsSaved(next);
    addToast(next ? 'Listing saved!' : 'Removed from saved items', next ? 'success' : 'info');
  }

  function messageSeller() {
    if (isMyListing) {
      addToast('This is your listing.', 'info');
      return;
    }
    if (isOrderedLocked) {
      addToast('This item is currently ordered and not interactive.', 'info');
      return;
    }
    const receiverId = listing?.sellerId;
    if (!receiverId) {
      addToast('Seller messaging is not available for this listing yet.', 'info');
      return;
    }
    setMessageOpen(true);
  }

  async function handleAddToCart() {
    if (isMyListing) {
      addToast('You can’t add your own listing to cart.', 'info');
      return;
    }
    if (isOrderedLocked) {
      addToast('This item is currently ordered and cannot be purchased right now.', 'info');
      return;
    }
    try {
      await addToCart(listing.id, 1);
      addToast('Added to cart!', 'success');
    } catch (e) {
      addToast(e.message || 'Failed to add to cart', 'error');
    }
  }

  async function submitReview() {
    setSubmittingReview(true);
    try {
      await upsertReview(listing.id, { rating: Number(reviewForm.rating), comment: reviewForm.comment });
      addToast('Review saved!', 'success');
      const rr = await listReviews(listing.id);
      setReviews(rr.rows || []);
      setReviewSummary(rr.summary || { avgRating: 0, count: 0 });
      setReviewForm({ rating: 5, comment: '' });
    } catch (e) {
      addToast(e.message || 'Failed to save review', 'error');
    } finally {
      setSubmittingReview(false);
    }
  }

  if (loading) {
    return (
      <div className="pt-20 flex flex-col items-center justify-center min-h-screen text-center px-4">
        <span className="text-4xl mb-4">⏳</span>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading listing...</h2>
        <p className="text-gray-500 mb-6">Please wait a moment.</p>
      </div>
    );
  }

  if (notFound || !listing) {
    return (
      <div className="pt-20 flex flex-col items-center justify-center min-h-screen text-center px-4">
        <span className="text-6xl mb-4">🔍</span>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Listing Not Found</h2>
        <p className="text-gray-500 mb-6">This item may have been removed.</p>
        <Link to="/listings" className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold">
          Back to Listings
        </Link>
      </div>
    );
  }

  const thumbnails = Array.isArray(listing.images) && listing.images.length
    ? listing.images
    : [listing.image, listing.image, listing.image];

  const similarToShow = similar;
  const resolvedSaved = isFavorite(listing?.id) || isSaved;

  return (
    <main className="pt-20 pb-16 px-4 page-enter">
      <div className="max-w-7xl mx-auto">

        {/* Back link */}
        <Link to="/listings" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 transition-colors mb-6">
          <ArrowLeft size={16} /> Back to Listings
        </Link>

        {/* Main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* ─── Left column: images ─── */}
          <div className="lg:col-span-3">
            <img
              src={thumbnails[activeImage]}
              alt={listing.title}
              className="w-full h-80 md:h-96 object-cover rounded-2xl shadow-sm"
            />
            <div className="flex gap-3 mt-3">
              {thumbnails.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  className={`flex-1 h-20 rounded-xl overflow-hidden border-2 transition-all duration-200
                    ${activeImage === idx ? 'border-indigo-600' : 'border-gray-200 opacity-70 hover:opacity-100'}`}
                >
                  <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* ─── Right column: details ─── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Badges */}
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${categoryColors[listing.category] || 'bg-gray-100 text-gray-700'}`}>
                {listing.category}
              </span>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${conditionColors[listing.condition] || 'bg-gray-100 text-gray-700'}`}>
                {listing.condition}
              </span>
              {isMyListing && (
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-100 text-indigo-700">
                  Your listing
                </span>
              )}
              {isOrderedLocked && (
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-100 text-amber-700">
                  Ordered
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-gray-900">{listing.title}</h1>

            {/* Price */}
            <p className="text-4xl font-bold text-indigo-600">PKR {listing.price.toLocaleString()}</p>

            <hr className="border-gray-200" />

            {/* Description */}
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">Description</h2>
              <p className="text-gray-600 text-sm leading-relaxed">{listing.description}</p>
            </div>

            <hr className="border-gray-200" />

            {/* Seller card */}
            <div className="rounded-2xl border border-gray-200 p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-lg">{getInitials(listing.sellerName)}</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{listing.sellerName}</p>
                  <div className="flex items-center gap-1 text-gray-500 text-xs">
                    <MapPin size={11} />
                    <span>{listing.campus}</span>
                  </div>
                  <StarRating rating={4.5} />
                </div>
              </div>
              <p className="text-xs text-gray-400">Member since Jan 2024</p>

              <div className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-xl p-3 space-y-1">
                <div>
                  Preferred contact: <span className="font-semibold text-gray-700">{listing.contactPreference || 'In-app Message'}</span>
                </div>
                <div>
                  Email: <span className="font-semibold text-gray-700">{listing.sellerEmail || 'Not provided'}</span>
                </div>
                <div>
                  Phone: <span className="font-semibold text-gray-700">{listing.sellerPhoneNumber || 'Not provided'}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={messageSeller}
                disabled={isMyListing || isOrderedLocked}
                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white
                  rounded-xl font-semibold text-sm hover:bg-indigo-700 active:scale-95 transition-all duration-200
                  disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <MessageCircle size={16} /> Message Seller
              </button>

              <button
                type="button"
                onClick={() => void handleAddToCart()}
                disabled={isMyListing || isOrderedLocked}
                className="w-full flex items-center justify-center gap-2 py-3 border border-gray-200 text-gray-700
                  rounded-xl font-semibold text-sm hover:bg-gray-50 active:scale-95 transition-all duration-200
                  disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Add to Cart
              </button>

              <button
                onClick={toggleSave}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm
                  border transition-all duration-200 active:scale-95
                  ${resolvedSaved
                    ? 'bg-red-50 border-red-200 text-red-600'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
              >
                <Heart size={16} className={resolvedSaved ? 'fill-red-500' : ''} />
                {resolvedSaved ? 'Saved ✓' : 'Save Listing'}
              </button>
            </div>

            {/* Safety tip */}
            <div className="flex gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <AlertTriangle size={18} className="text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-800">
                <span className="font-semibold">Safety Tip:</span> Always meet in a public place on campus for exchanges.
              </p>
            </div>
          </div>
        </div>

        {/* ─── Similar Listings ─── */}
        {similarToShow.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Similar Listings</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {similarToShow.map((item) => <ListingCard key={item.id} {...item} />)}
            </div>
          </section>
        )}

        {/* ─── Reviews ─── */}
        <section className="mt-12">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="text-xl font-bold text-gray-900">Reviews</h2>
            <div className="text-sm text-gray-600">
              <span className="font-bold text-gray-900">{reviewSummary.avgRating.toFixed(1)}</span> / 5.0
              <span className="text-gray-400"> · </span>
              <span>{reviewSummary.count} total</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
              <div className="text-sm font-bold text-gray-900 mb-3">Write a review</div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Rating</label>
              <select
                value={reviewForm.rating}
                onChange={(e) => setReviewForm((p) => ({ ...p, rating: Number(e.target.value) }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm bg-white
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              >
                {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} stars</option>)}
              </select>

              <label className="block text-xs font-semibold text-gray-600 mb-1 mt-4">Comment (optional)</label>
              <textarea
                value={reviewForm.comment}
                onChange={(e) => setReviewForm((p) => ({ ...p, comment: e.target.value }))}
                rows={4}
                placeholder="Share your experience…"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
              />

              <button
                type="button"
                disabled={submittingReview}
                onClick={() => void submitReview()}
                className="mt-4 w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm
                  hover:bg-indigo-700 active:scale-95 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {submittingReview ? 'Saving…' : 'Save review'}
              </button>
              <p className="mt-2 text-xs text-gray-400">
                If reviews don’t load yet, run the SQL in <code className="font-mono">server/migrations/001_reviews.sql</code> on Neon.
              </p>
            </div>

            <div className="lg:col-span-3 space-y-3">
              {reviews.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-6 text-sm text-gray-500">
                  No reviews yet.
                </div>
              ) : reviews.map((r) => (
                <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-gray-900">{r.reviewer?.name || 'Anonymous'}</div>
                    <div className="text-sm font-bold text-gray-900">{r.rating} / 5</div>
                  </div>
                  {r.comment ? (
                    <p className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">{r.comment}</p>
                  ) : (
                    <p className="mt-2 text-sm text-gray-400 italic">No comment.</p>
                  )}
                  <div className="mt-3 text-xs text-gray-400">
                    {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-PK') : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <MessageModal
        open={messageOpen}
        title={`Message ${listing?.sellerName || 'seller'}`}
        initialMessage={`Hi! Is "${listing?.title}" still available?`}
        onClose={() => setMessageOpen(false)}
        onSend={async (content) => {
          if (isMyListing) throw new Error('This is your listing.');
          if (isOrderedLocked) throw new Error('This item is currently ordered.');
          await sendMessage({ receiverId: listing?.sellerId, productId: listing?.id, content });
          addToast('Message sent!', 'success');
        }}
      />
    </main>
  );
}

export default ListingDetail;
