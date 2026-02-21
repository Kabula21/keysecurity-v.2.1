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

    // normaliza chaves PT/EN
    const view = {
      email: data.email ?? '',
      avatar: data.avatar ?? '',
      nome: data.nome ?? data.first_name ?? '',
      sobrenome: data.sobrenome ?? data.last_name ?? '',
      genero: data.genero ?? data.gender ?? '',
      data_nascimento: data.data_nascimento ?? data.birth_date ?? '',
      cep: data.cep ?? '',
      endereco: data.endereco ?? data.address ?? '',
      pais: data.pais ?? data.country ?? '',
      estado: data.estado ?? data.state ?? '',
      cidade: data.cidade ?? data.city ?? '',
      complemento: data.complemento ?? data.complement ?? ''
    };

    // helpers
    const byId = (id) => document.getElementById(id);

    const pick = (...selectors) => {
      for (const s of selectors) {
        const el = document.querySelector(s);
        if (el) return el;
      }
      return null;
    };

    const norm = (v) => String(v ?? '').trim();

    const setInput = (selectors, value) => {
      const el = pick(...selectors);
      if (el) el.value = value ?? '';
      return el;
    };

    const setSelectSmart = (selectEl, value) => {
      if (!selectEl) return;
      const target = norm(value);
      if (!target) {
        // tenta "Selecione" / vazio
        selectEl.value = '';
        return;
      }

      // 1) tenta casar por value direto
      selectEl.value = target;
      if (norm(selectEl.value).toLowerCase() === target.toLowerCase()) return;

      // 2) tenta casar ignorando case no value
      const optByValue = [...selectEl.options].find(
        o => norm(o.value).toLowerCase() === target.toLowerCase()
      );
      if (optByValue) {
        selectEl.value = optByValue.value;
        return;
      }

      // 3) tenta casar por texto do option
      const optByText = [...selectEl.options].find(
        o => norm(o.text).toLowerCase() === target.toLowerCase()
      );
      if (optByText) {
        selectEl.value = optByText.value;
        return;
      }

      // fallback
      selectEl.value = '';
    };

    const waitForOptions = (selectEl, predicate, timeoutMs = 5000) => {
      return new Promise((resolve) => {
        const start = Date.now();
        const tick = () => {
          if (!selectEl) return resolve(false);
          if ([...selectEl.options].some(predicate)) return resolve(true);
          if (Date.now() - start > timeoutMs) return resolve(false);
          setTimeout(tick, 120);
        };
        tick();
      });
    };

    const toISODate = (v) => {
      const s = norm(v);
      if (!s) return '';
      // se vier ISO já, corta
      if (s.includes('T')) return s.split('T')[0];
      // se vier YYYY-MM-DD já
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      return s; // fallback (não deve acontecer)
    };

    // ===== AVATAR =====
    const avatarImg = byId('avatarImg');
    if (avatarImg) avatarImg.src = view.avatar || '/assets/images/avatar.png';

    // ===== CAMPOS PRINCIPAIS =====
    setInput(['#email', 'input[name="email"]', 'input[type="email"]'], view.email);
    setInput(['#nome', 'input[name="nome"]', 'input[placeholder="Nome"]'], view.nome);
    setInput(['#sobrenome', 'input[name="sobrenome"]', 'input[placeholder="Sobrenome"]'], view.sobrenome);
    setInput(['#data_nascimento', 'input[name="data_nascimento"]', 'form input[type="date"]'], toISODate(view.data_nascimento));

    // Gênero: no seu HTML é o 1º select dentro do form
    const generoEl = pick('#genero', 'select[name="genero"]', 'form select.form-control');
    setSelectSmart(generoEl, view.genero);

    // ===== ENDEREÇO =====
    setInput(['#cep', 'input[name="cep"]'], view.cep);
    setInput(['#endereco', 'input[name="endereco"]'], view.endereco);
    setInput(['#complemento', 'input[name="complemento"]'], view.complemento);

    // País (no HTML é BR)
    const paisSelect = byId('pais');
    if (paisSelect) {
      const p = norm(view.pais);
      if (!p) {
        // mantém default
      } else if (p.toUpperCase() === 'BR' || p.toLowerCase() === 'brasil') {
        paisSelect.value = 'BR';
      } else {
        paisSelect.value = p;
      }
    }

    // ===== ESTADO/CIDADE (IBGE) =====
    const estadoSelect = byId('estado');
    const cidadeSelect = byId('cidade');

    // Mapa Nome -> UF (caso seu DB guarde "Pernambuco" e o select use "PE")
    const UF = {
      "Acre":"AC","Alagoas":"AL","Amapá":"AP","Amazonas":"AM","Bahia":"BA","Ceará":"CE",
      "Distrito Federal":"DF","Espírito Santo":"ES","Goiás":"GO","Maranhão":"MA","Mato Grosso":"MT",
      "Mato Grosso do Sul":"MS","Minas Gerais":"MG","Pará":"PA","Paraíba":"PB","Paraná":"PR",
      "Pernambuco":"PE","Piauí":"PI","Rio de Janeiro":"RJ","Rio Grande do Norte":"RN",
      "Rio Grande do Sul":"RS","Rondônia":"RO","Roraima":"RR","Santa Catarina":"SC","São Paulo":"SP",
      "Sergipe":"SE","Tocantins":"TO"
    };

    if (estadoSelect) {
      // espera o ibge.js popular os estados (ele costuma adicionar várias options)
      await waitForOptions(estadoSelect, o => norm(o.value) !== '', 5000);

      const rawEstado = norm(view.estado);
      const estadoValue =
        rawEstado.length === 2 ? rawEstado.toUpperCase() :
        (UF[rawEstado] || rawEstado);

      setSelectSmart(estadoSelect, estadoValue);

      // IMPORTANTE: como seu perfil.js roda DOMContentLoaded antes do ibge.js (listener),
      // disparamos o change também no próximo tick, garantindo que o listener do ibge já exista.
      estadoSelect.dispatchEvent(new Event('change'));
      setTimeout(() => estadoSelect.dispatchEvent(new Event('change')), 0);

      if (cidadeSelect) {
        cidadeSelect.disabled = false;

        const rawCidade = norm(view.cidade);
        if (rawCidade) {
          // espera o ibge.js popular as cidades depois do change
          await waitForOptions(
            cidadeSelect,
            o => norm(o.value) !== '' || norm(o.text) !== '',
            5000
          );

          // tenta casar cidade por value, senão por texto
          let opt = [...cidadeSelect.options].find(o => norm(o.value).toLowerCase() === rawCidade.toLowerCase());
          if (!opt) opt = [...cidadeSelect.options].find(o => norm(o.text).toLowerCase() === rawCidade.toLowerCase());

          if (opt) cidadeSelect.value = opt.value;
        }
      }
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
      email: document.getElementById('email')?.value.trim(),
      senhaAtual,
      novaSenha,
      nome: document.getElementById('nome')?.value.trim(),
      sobrenome: document.getElementById('sobrenome')?.value.trim(),
      genero: document.getElementById('genero')?.value,
      data_nascimento: document.getElementById('data_nascimento')?.value,

      cep: document.getElementById('cep')?.value ?? null,
      endereco: document.getElementById('endereco')?.value ?? null,
      pais: document.getElementById('pais')?.value ?? null,
      estado: document.getElementById('estado')?.value ?? null,
      cidade: document.getElementById('cidade')?.value ?? null,
      complemento: document.getElementById('complemento')?.value ?? null
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