document.addEventListener('DOMContentLoaded', async () => {
  const nomeEl = document.getElementById('nomeUsuario');
  if (!nomeEl) return; // página não tem header

  try {
    const res = await fetch('/api/profile', {
      credentials: 'same-origin'
    });

    if (!res.ok) return;

    const data = await res.json();

    // Prioridade: nome > email
    nomeEl.textContent = data.nome || data.email || 'Usuário';

  } catch (err) {
    console.error('Erro ao carregar nome do usuário', err);
  }
});
