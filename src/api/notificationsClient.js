import { requestJson } from './httpClient';

export async function getNotifications() {
  return requestJson('/api/notifications');
}

