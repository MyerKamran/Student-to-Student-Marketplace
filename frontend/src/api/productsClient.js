import { requestJson } from './httpClient';

export async function listProducts(params = {}) {
  const usp = new URLSearchParams();
  if (params.search) usp.set('search', params.search);
  if (params.category) usp.set('category', params.category);
  if (params.condition) usp.set('condition', params.condition);
  if (params.sort) usp.set('sort', params.sort);
  if (params.limit) usp.set('limit', String(params.limit));
  const qs = usp.toString();
  return requestJson(`/api/products${qs ? `?${qs}` : ''}`);
}

export async function getProduct(id) {
  return requestJson(`/api/products/${encodeURIComponent(id)}`);
}

export async function createProduct(payload) {
  return requestJson('/api/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateProduct(id, payload) {
  return requestJson(`/api/products/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

