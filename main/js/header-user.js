// main/js/header-user.js
document.addEventListener('DOMContentLoaded', async () => {
  const el = document.getElementById('nomeUsuario');
  if (!el) return;

  const token = localStorage.getItem('keysecurity_token');
  if (!token) {
    el.textContent = '...';
    return;
  }

  try {
    const res = await fetch('/api/profile', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include'
    });

    if (res.status === 401) {
      localStorage.removeItem('keysecurity_token');
      el.textContent = '...';
      return;
    }

    const data = await res.json().catch(() => ({}));

    // Aceita tanto PT (nome/sobrenome) quanto EN (first_name/last_name)
    const nome = (data.nome ?? data.first_name ?? '').trim();
    const sobrenome = (data.sobrenome ?? data.last_name ?? '').trim();

    const fullName = [nome, sobrenome].filter(Boolean).join(' ').trim();

    // fallback final: parte do email antes do @
    const email = (data.email ?? '').trim();
    const userFromEmail = email ? email.split('@')[0] : '';

    el.textContent = fullName || userFromEmail || email || 'Usuário';
  } catch (e) {
    console.error('header-user.js:', e);
    el.textContent = '...';
  }
});