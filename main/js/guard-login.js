// main/js/guard-login.js
(function () {
  async function runLoginGuard() {
    const token = localStorage.getItem('keysecurity_token');
    if (!token) return;

    try {
      const res = await fetch('/api/me', {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include'
      });

      if (res.ok) {
        // já logado -> manda pra home
        window.location.replace('/home');
      } else if (res.status === 401) {
        localStorage.removeItem('keysecurity_token');
      }
    } catch (_) {}
  }

  runLoginGuard();
})();