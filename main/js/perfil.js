document.addEventListener('DOMContentLoaded', () => {
  carregarPerfil();
  configurarSubmit();
});

/* =========================
   CARREGAR DADOS DO PERFIL
========================= */
async function carregarPerfil() {
  try {
    const res = await fetch('/api/profile', {
      credentials: 'same-origin'
    });

    if (!res.ok) throw new Error('Não autorizado');

    const data = await res.json();

    // ✅ Avatar (agora data já existe)
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
    showModal('Sessão expirada', 'Faça login novamente.', 'error');
    setTimeout(() => window.location.href = '/login', 900);
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

    const data = {
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

    // 🔐 validação: só exige senha atual se for trocar senha
    if (data.novaSenha && !data.senhaAtual) {
      showModal('Atenção', 'Informe a senha atual para alterar a senha.', 'info');
      return;
    }

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(data)
      });

      const result = await res.json();

      if (!res.ok) {
        showModal('Erro', result.error || 'Erro ao atualizar perfil', 'error');
        return;
      }

      if (result.logout) {
        showModal('Atenção', 'Email ou senha alterados. Faça login novamente.', 'info');
        setTimeout(() => window.location.href = '/login', 900);
      } else {
        showModal('Sucesso', 'Perfil atualizado com sucesso.', 'success');
      }

    } catch (err) {
      console.error('Erro ao salvar perfil:', err);
      showModal('Erro', 'Erro de conexão com o servidor.', 'error');
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
        const res = await fetch('/api/profile', {
          method: 'DELETE',
          credentials: 'same-origin'
        });

        const result = await res.json();

        if (!res.ok) {
          showModal('Erro', result.error || 'Erro ao excluir conta', 'error');
          return;
        }

        showModal('Conta excluída', 'Sua conta foi removida com sucesso.', 'success');
        setTimeout(() => window.location.href = '/login', 900);

      } catch (err) {
        console.error(err);
        showModal('Erro', 'Erro de conexão ao excluir conta.', 'error');
      }
    });
  }

  /* =========================
     AVATAR (UPLOAD / REMOVER)
  ========================= */
  const avatarFile = document.getElementById('avatarFile');
  const btnUpload = document.getElementById('btnUploadAvatar');
  const btnRemove = document.getElementById('btnRemoveAvatar');
  const avatarImg = document.getElementById('avatarImg');

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

      const formData = new FormData();
      formData.append('avatar', file);

      try {
        const res = await fetch('/api/profile/avatar', {
          method: 'POST',
          credentials: 'same-origin',
          body: formData
        });

        const result = await res.json();

        if (!res.ok) {
          showModal('Erro', result.error || 'Erro ao enviar foto', 'error');
          return;
        }

        if (avatarImg) avatarImg.src = result.avatar;
        showModal('Sucesso', 'Foto atualizada com sucesso.', 'success');

      } catch (err) {
        console.error(err);
        showModal('Erro', 'Erro de conexão ao enviar foto.', 'error');
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
        const res = await fetch('/api/profile/avatar', {
          method: 'DELETE',
          credentials: 'same-origin'
        });

        const result = await res.json();

        if (!res.ok) {
          showModal('Erro', result.error || 'Erro ao remover foto', 'error');
          return;
        }

        if (avatarImg) avatarImg.src = '/assets/images/avatar.png';
        showModal('Sucesso', 'Foto removida.', 'success');

      } catch (err) {
        console.error(err);
        showModal('Erro', 'Erro de conexão ao remover foto.', 'error');
      }
    });
  }
}
