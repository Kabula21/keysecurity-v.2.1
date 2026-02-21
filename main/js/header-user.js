// main/js/header-user.js
document.addEventListener('DOMContentLoaded', async () => {
  const elNome = document.getElementById('nomeUsuario');
  if (!elNome) return;

  const token = localStorage.getItem('keysecurity_token');

  // Se não tiver token, mantém "..."
  if (!token) {
    elNome.textContent = '...';
    return;
  }

  try {
    const res = await fetch('/api/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      },
      credentials: 'include'
    });

    if (res.status === 401) {
      localStorage.removeItem('keysecurity_token');
      elNome.textContent = '...';
      // opcional: redirecionar
      // window.location.href = '/login';
      return;
    }

    const data = await res.json().catch(() => ({}));
    const u = data.user || {};

    const nomeCompleto = [u.first_name, u.last_name].filter(Boolean).join(' ');
    elNome.textContent = nomeCompleto || u.email || 'Usuário';
  } catch (e) {
    console.error('header-user.js:', e);
    elNome.textContent = '...';
  }
});