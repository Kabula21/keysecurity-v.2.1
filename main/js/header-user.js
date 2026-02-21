// main/js/header-user.js
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const token = localStorage.getItem('keysecurity_token');
    if (!token) return;

    const res = await fetch('/api/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include'
    });

    if (res.status === 401) {
      localStorage.removeItem('keysecurity_token');
      window.location.href = '/login';
      return;
    }

    const data = await res.json().catch(() => ({}));
    const u = data.user || {};

    const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ');
    const el =
      document.getElementById('headerUserName') ||
      document.querySelector('.header-user-name') ||
      document.querySelector('[data-header-user-name]');

    if (el) el.textContent = fullName || u.email || 'Usuário';
  } catch (e) {
    console.error('Erro header-user:', e);
  }
});