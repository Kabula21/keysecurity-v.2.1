// main/js/guard.js
(function () {
  async function runGuard() {
    const token = localStorage.getItem('keysecurity_token');
    const path = window.location.pathname;

    // não proteger a tela de login
    if (path === '/login' || path === '/' ) return;

    // sem token -> login
    if (!token) {
      const next = encodeURIComponent(path + window.location.search);
      window.location.replace(`/login?next=${next}`);
      return;
    }

    // valida token no backend
    try {
      const res = await fetch('/api/me', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include'
      });

      if (res.status === 401) {
        localStorage.removeItem('keysecurity_token');
        const next = encodeURIComponent(path + window.location.search);
        window.location.replace(`/login?next=${next}`);
        return;
      }
    } catch (_) {
      // se falhar rede, não derruba a página (opcional)
      // se quiser ser rígido: redireciona também
    }
  }

  // roda o guard o quanto antes
  runGuard();
})();