import { requestJson } from './httpClient';

export async function getAdminOverview() {
  return requestJson('/api/admin/overview');
}

export async function listAdminUsers() {
  return requestJson('/api/admin/users');
}

export async function setAdminUserActive(userId, isActive) {
  return requestJson(`/api/admin/users/${encodeURIComponent(userId)}/block`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
}

export async function removeAdminUser(userId) {
  return requestJson(`/api/admin/users/${encodeURIComponent(userId)}`, { method: 'DELETE' });
}

export async function listAdminProducts() {
  return requestJson('/api/admin/products');
}

export async function removeAdminProduct(productId) {
  return requestJson(`/api/admin/products/${encodeURIComponent(productId)}`, { method: 'DELETE' });
}

