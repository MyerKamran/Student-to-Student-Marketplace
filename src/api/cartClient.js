import { requestJson } from './httpClient';

export async function getCart() {
  return requestJson('/api/cart');
}

export async function addToCart(productId, quantity = 1) {
  return requestJson('/api/cart/items', {
    method: 'POST',
    body: JSON.stringify({ productId, quantity }),
  });
}

export async function updateCartItem(cartItemId, quantity) {
  return requestJson(`/api/cart/items/${encodeURIComponent(cartItemId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ quantity }),
  });
}

export async function removeCartItem(cartItemId) {
  return requestJson(`/api/cart/items/${encodeURIComponent(cartItemId)}`, {
    method: 'DELETE',
  });
}

export async function checkoutCart() {
  return requestJson('/api/orders/checkout', { method: 'POST' });
}

