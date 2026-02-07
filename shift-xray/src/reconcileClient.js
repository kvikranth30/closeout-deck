const API_BASE = import.meta.env.VITE_RECONCILE_API_BASE || 'http://localhost:8000';

export async function reconcileUpload({ facility, worker, gps, messages }) {
  const formData = new FormData();
  formData.append('facility', facility);
  formData.append('worker', worker);
  formData.append('gps', gps);
  formData.append('messages', messages);

  const response = await fetch(`${API_BASE}/api/reconcile/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }

  return response.json();
}
