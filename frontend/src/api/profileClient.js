import { requestJson } from './httpClient';

export async function getMyProfile() {
  return requestJson('/api/my/profile');
}

export async function updateMyProfile(payload) {
  return requestJson('/api/my/profile', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

