import { requestJson } from './httpClient';

export async function sendMessage({ receiverId, productId, content }) {
  return requestJson('/api/messages', {
    method: 'POST',
    body: JSON.stringify({ receiverId, productId, content }),
  });
}

export async function listMyMessages() {
  return requestJson('/api/my/messages');
}

export async function markMessageRead(messageId) {
  return requestJson('/api/my/messages/mark-read', {
    method: 'POST',
    body: JSON.stringify({ messageId }),
  });
}

