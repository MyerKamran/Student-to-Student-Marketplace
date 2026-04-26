// Small shared helper for all frontend API calls.
// Keeping this in one place makes the project easier to follow.
export async function requestJson(path, options) {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
    ...options,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.error || `Request failed: ${res.status}`);
  return data;
}

