import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag, CreditCard } from 'lucide-react';
import { ToastContainer } from '../components/Toast';
import { checkoutCart, getCart, removeCartItem, updateCartItem } from '../api/cartClient';

function Cart() {
  const [loading, setLoading] = useState(true);
  const [cartId, setCartId] = useState(null);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [checkingOut, setCheckingOut] = useState(false);

  function addToast(message, type = 'success') {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  }
  function removeToast(id) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  async function refresh() {
    setLoading(true);
    try {
      const resp = await getCart();
      setCartId(resp.cartId ?? null);
      setItems(resp.items || []);
      setTotal(Number(resp.total || 0));
    } catch (e) {
      addToast(e.message || 'Failed to load cart', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isEmpty = useMemo(() => !items.length, [items.length]);

  async function changeQty(cartItemId, nextQty) {
    try {
      await updateCartItem(cartItemId, nextQty);
      await refresh();
    } catch (e) {
      addToast(e.message || 'Failed to update quantity', 'error');
    }
  }

  async function removeItem(cartItemId) {
    try {
      await removeCartItem(cartItemId);
      await refresh();
      addToast('Removed from cart', 'info');
    } catch (e) {
      addToast(e.message || 'Failed to remove item', 'error');
    }
  }

  async function checkout() {
    setCheckingOut(true);
    try {
      const resp = await checkoutCart();
      addToast(`Order placed! Order #${resp.orderId}`, 'success');
      await refresh();
    } catch (e) {
      addToast(e.message || 'Checkout failed', 'error');
    } finally {
      setCheckingOut(false);
    }
  }

  return (
    <main className="pt-20 pb-16 px-4 page-enter">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingBag size={20} className="text-indigo-600" />
            Cart
          </h1>
          <Link to="/listings" className="text-sm text-indigo-600 font-semibold hover:text-indigo-700">
            Continue shopping
          </Link>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 text-gray-500">Loading cart…</div>
        ) : isEmpty ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <div className="text-gray-900 font-bold text-lg mb-2">Your cart is empty</div>
            <p className="text-sm text-gray-500 mb-6">Browse listings and add items to your cart.</p>
            <Link
              to="/listings"
              className="inline-flex items-center justify-center px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700"
            >
              Browse Listings
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {items.map((it) => (
                <div key={it.cartItemId} className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-4">
                  <img
                    src={it.product?.image}
                    alt={it.product?.title}
                    className="w-24 h-24 rounded-xl object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link to={`/listings/${it.product?.id}`} className="font-semibold text-gray-900 line-clamp-1">
                          {it.product?.title}
                        </Link>
                        <div className="text-xs text-gray-500 mt-1">
                          Seller: <span className="font-medium">{it.product?.sellerName}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          PKR <span className="font-semibold text-gray-800">{Number(it.product?.price || 0).toLocaleString()}</span> each
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void removeItem(it.cartItemId)}
                        className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors flex-shrink-0"
                        aria-label="Remove"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
                          onClick={() => void changeQty(it.cartItemId, Math.max(1, Number(it.quantity) - 1))}
                          aria-label="Decrease quantity"
                        >
                          <Minus size={14} />
                        </button>
                        <div className="w-10 text-center font-semibold text-gray-800">{it.quantity}</div>
                        <button
                          type="button"
                          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
                          onClick={() => void changeQty(it.cartItemId, Number(it.quantity) + 1)}
                          aria-label="Increase quantity"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <div className="text-sm font-bold text-gray-900">
                        PKR {Number(it.lineTotal || 0).toLocaleString()}
                      </div>
                    </div>

                    {!it.product?.isAvailable && (
                      <div className="mt-2 text-xs text-red-600 font-medium">This item is no longer available.</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5 h-fit">
              <div className="text-sm font-bold text-gray-900 mb-4">Order summary</div>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Cart ID</span>
                <span className="font-medium">{cartId ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-600 mt-2">
                <span>Items</span>
                <span className="font-medium">{items.length}</span>
              </div>
              <hr className="my-4 border-gray-100" />
              <div className="flex items-center justify-between text-base font-bold text-gray-900">
                <span>Total</span>
                <span>PKR {Number(total || 0).toLocaleString()}</span>
              </div>
              <button
                type="button"
                disabled={checkingOut}
                onClick={() => void checkout()}
                className="mt-5 w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm
                  hover:bg-indigo-700 active:scale-95 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2"
              >
                <CreditCard size={16} />
                {checkingOut ? 'Placing order…' : 'Checkout'}
              </button>
              <p className="mt-3 text-xs text-gray-400">
                This is a demo checkout (no payment gateway). It will create an order and reduce stock.
              </p>
            </div>
          </div>
        )}
      </div>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </main>
  );
}

export default Cart;

