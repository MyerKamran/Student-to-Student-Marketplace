import { requestJson } from './httpClient';

export async function listMyOrders() {
  return requestJson('/api/my/orders');
}

export async function cancelOrder(orderId) {
  return requestJson(`/api/orders/${encodeURIComponent(orderId)}/cancel`, {
    method: 'POST',
  });
}

export async function completeOrder(orderId) {
  return requestJson(`/api/orders/${encodeURIComponent(orderId)}/complete`, {
    method: 'POST',
  });
}

