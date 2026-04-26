import { requestJson } from './httpClient';

export async function listReviews(productId) {
  return requestJson(`/api/products/${encodeURIComponent(productId)}/reviews`);
}

export async function upsertReview(productId, { rating, comment }) {
  return requestJson(`/api/products/${encodeURIComponent(productId)}/reviews`, {
    method: 'POST',
    body: JSON.stringify({ rating, comment }),
  });
}

