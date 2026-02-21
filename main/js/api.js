export async function apiFetch(url, options = {}) {
  const token = localStorage.getItem('keysecurity_token');

  const headers = {
    ...(options.headers || {}),
    'Content-Type': 'application/json'
  };

  // se existir token, manda Bearer
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include' // não atrapalha e já prepara pro modo cookie
  });

  // se 401, joga pro login
  if (res.status === 401) {
    localStorage.removeItem('keysecurity_token');
    window.location.href = '/login';
    throw new Error('Não autenticado');
  }

  return res;
}