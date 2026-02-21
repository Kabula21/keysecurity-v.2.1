document.addEventListener('DOMContentLoaded', () => {
  carregarPerfil();
  configurarSubmit();
});

/* =========================
   HELPERS (JWT + FETCH)
========================= */
function getToken() {
  return localStorage.getItem('keysecurity_token'); // vem do login.js
}

async function apiFetch(url, options = {}) {
  const token = getToken();

  const headers = new Headers(options.headers || {});
  // Só define JSON se não for FormData
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include' // ok pra cookie no futuro, não atrapalha Bearer
  });

  // Se deslogou/expirou
  if (res.status === 401) {
    localStorage.removeItem('keysecurity_token');
    throw new Error('401');
  }

  return res;
}

async function apiJson(url, options = {}) {
  const res = await apiFetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error || `Erro HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

/* =========================
   CARREGAR DADOS DO PERFIL
========================= */
async function carregarPerfil() {
  try {
    const data = await apiJson('/api/profile', { method: 'GET' });

    // Avatar
    const avatarImg = document.getElementById('avatarImg');
    if (avatarImg) {
      avatarImg.src = data.avatar || '/assets/images/avatar.png';
    }

    // Campos principais
    document.querySelector('input[type="email"]').value = data.email ?? '';
    document.querySelector('input[placeholder="Nome"]').value = data.nome ?? '';
    document.querySelector('input[placeholder="Sobrenome"]').value = data.sobrenome ?? '';
    document.querySelector('select').value = data.genero ?? '';
    document.querySelector('input[type="date"]').value =
      data.data_nascimento ? String(data.data_nascimento).split('T')[0] : '';

    // Campos com name/id
    const cepInput = document.querySelector('input[name="cep"]');
    if (cepInput) cepInput.value = data.cep ?? '';

    const enderecoInput = document.querySelector('input[name="endereco"]');
    if (enderecoInput) enderecoInput.value = data.endereco ?? '';

    const complementoInput = document.querySelector('input[name="complemento"]');
    if (complementoInput) complementoInput.value = data.complemento ?? '';

    const paisSelect = document.getElementById('pais');
    if (paisSelect) paisSelect.value = data.pais ?? '';

    // Estado / Cidade (compatível com ibge.js)
    const estadoSelect = document.getElementById('estado');
    const cidadeSelect = document.getElementById('cidade');

    if (estadoSelect) {
      estadoSelect.value = data.estado ?? '';
      estadoSelect.dispatchEvent(new Event('change'));
    }

    if (cidadeSelect) {
      cidadeSelect.disabled = false;
      setTimeout(() => {
        cidadeSelect.value = data.cidade ?? '';
      }, 300);
    }

  } catch (err) {
    console.error('Erro ao carregar perfil:', err);

    if (String(err.message) === '401') {
      showModal('Sessão expirada', 'Faça login novamente.', 'error');
      setTimeout(() => window.location.href = '/login', 900);
      return;
    }

    showModal('Erro', err.message || 'Erro ao carregar perfil', 'error');
  }
}

/* =========================
   SUBMIT DO FORMULÁRIO + AÇÕES
========================= */
function configurarSubmit() {
  const form = document.querySelector('form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // garante que cidade não esteja disabled ao ler valor
    const cidadeEl = document.getElementById('cidade');
    if (cidadeEl) cidadeEl.disabled = false;

    const senhaAtual = (document.getElementById('senhaAtual')?.value ?? '').trim();
    const novaSenha = (document.getElementById('novaSenha')?.value ?? '').trim();

    const payload = {
      email: document.querySelector('input[type="email"]').value.trim(),
      senhaAtual,
      novaSenha,
      nome: document.querySelector('input[placeholder="Nome"]').value.trim(),
      sobrenome: document.querySelector('input[placeholder="Sobrenome"]').value.trim(),
      genero: document.querySelector('select').value,
      data_nascimento: document.querySelector('input[type="date"]').value,

      cep: document.querySelector('input[name="cep"]')?.value ?? null,
      endereco: document.querySelector('input[name="endereco"]')?.value ?? null,
      pais: document.getElementById('pais')?.value ?? null,
      estado: document.getElementById('estado')?.value ?? null,
      cidade: document.getElementById('cidade')?.value ?? null,
      complemento: document.querySelector('input[name="complemento"]')?.value ?? null
    };

    // validação: só exige senha atual se for trocar senha
    if (payload.novaSenha && !payload.senhaAtual) {
      showModal('Atenção', 'Informe a senha atual para alterar a senha.', 'info');
      return;
    }

    try {
      await apiJson('/api/profile', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      showModal('Sucesso', 'Perfil atualizado com sucesso.', 'success');

    } catch (err) {
      console.error('Erro ao salvar perfil:', err);

      if (String(err.message) === '401') {
        showModal('Sessão expirada', 'Faça login novamente.', 'error');
        setTimeout(() => window.location.href = '/login', 900);
        return;
      }

      showModal('Erro', err.message || 'Erro ao atualizar perfil', 'error');
    }
  });

  /* =========================
     EXCLUIR CONTA
  ========================= */
  const btnExcluir = document.getElementById('btnExcluirConta');
  if (btnExcluir) {
    btnExcluir.addEventListener('click', async () => {
      const ok = await confirmModal(
        'Excluir conta',
        'Deseja mesmo excluir essa conta? Essa ação não pode ser desfeita.',
        'error',
        'Excluir',
        'Cancelar'
      );

      if (!ok) return;

      try {
        await apiJson('/api/profile', { method: 'DELETE' });

        // limpa token e volta pro login
        localStorage.removeItem('keysecurity_token');
        showModal('Conta excluída', 'Sua conta foi removida com sucesso.', 'success');
        setTimeout(() => window.location.href = '/login', 900);

      } catch (err) {
        console.error(err);

        if (String(err.message) === '401') {
          showModal('Sessão expirada', 'Faça login novamente.', 'error');
          setTimeout(() => window.location.href = '/login', 900);
          return;
        }

        showModal('Erro', err.message || 'Erro ao excluir conta', 'error');
      }
    });
  }

  /* =========================
     AVATAR (UPLOAD / REMOVER)
     Serverless-friendly: envia dataUrl em JSON
  ========================= */
  const avatarFile = document.getElementById('avatarFile');
  const btnUpload = document.getElementById('btnUploadAvatar');
  const btnRemove = document.getElementById('btnRemoveAvatar');
  const avatarImg = document.getElementById('avatarImg');

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  if (btnUpload && avatarFile) {
    btnUpload.addEventListener('click', () => avatarFile.click());

    avatarFile.addEventListener('change', async () => {
      const file = avatarFile.files?.[0];
      if (!file) return;

      if (file.size > 2 * 1024 * 1024) {
        showModal('Erro', 'A imagem deve ter no máximo 2MB.', 'error');
        avatarFile.value = '';
        return;
      }

      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
        showModal('Erro', 'Formato inválido. Use PNG, JPG ou WEBP.', 'error');
        avatarFile.value = '';
        return;
      }

      try {
        const dataUrl = await fileToDataUrl(file);

        const result = await apiJson('/api/profile/avatar', {
          method: 'PUT',
          body: JSON.stringify({ dataUrl })
        });

        if (avatarImg) avatarImg.src = result.avatar;
        showModal('Sucesso', 'Foto atualizada com sucesso.', 'success');

      } catch (err) {
        console.error(err);

        if (String(err.message) === '401') {
          showModal('Sessão expirada', 'Faça login novamente.', 'error');
          setTimeout(() => window.location.href = '/login', 900);
          return;
        }

        showModal('Erro', err.message || 'Erro ao enviar foto.', 'error');
      } finally {
        avatarFile.value = '';
      }
    });
  }

  if (btnRemove) {
    btnRemove.addEventListener('click', async () => {
      const ok = await confirmModal(
        'Remover foto',
        'Deseja remover a foto de perfil?',
        'info',
        'Remover',
        'Cancelar'
      );
      if (!ok) return;

      try {
        await apiJson('/api/profile/avatar', { method: 'DELETE' });

        if (avatarImg) avatarImg.src = '/assets/images/avatar.png';
        showModal('Sucesso', 'Foto removida.', 'success');

      } catch (err) {
        console.error(err);

        if (String(err.message) === '401') {
          showModal('Sessão expirada', 'Faça login novamente.', 'error');
          setTimeout(() => window.location.href = '/login', 900);
          return;
        }

        showModal('Erro', err.message || 'Erro ao remover foto.', 'error');
      }
    });
  }
}