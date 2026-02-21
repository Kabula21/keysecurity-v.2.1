document.getElementById('loginForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!email || !password) {
    showModal('Atenção', 'Informe email e senha');
    return;
  }

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },

      // importante: permite cookie (se você habilitar HttpOnly no backend)
      credentials: 'include',

      body: JSON.stringify({ email, password })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      showModal('Erro', data.error || 'Erro ao fazer login');
      return;
    }

    // se o backend retornar token (Bearer), guardamos pra usar nas outras páginas
    if (data.token) {
      localStorage.setItem('keysecurity_token', data.token);
    }

    // Login OK
    window.location.href = '/home';

  } catch (err) {
    console.error('Erro de rede:', err);
    showModal('Erro', 'Erro de conexão com o servidor');
  }
});

function showModal(title, message) {
  const modal = document.getElementById('modal');
  document.getElementById('modalTitle').innerText = title;
  document.getElementById('modalMessage').innerText = message;
  modal.classList.remove('hidden');
}

document.getElementById('modalClose').addEventListener('click', () => {
  document.getElementById('modal').classList.add('hidden');
});