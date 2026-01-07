document.getElementById('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!email || !password) {
        showModal('Atenção', 'Informe email e senha');
        return;
    }

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin', // 🔥 ESSENCIAL
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            showModal('Erro', data.error || 'Erro ao fazer login');
            return;
        }

        // Login OK
        window.location.href = '/home';

    } catch (err) {
        console.error('Erro de rede:', err);
        alert('Erro de conexão com o servidor');
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
