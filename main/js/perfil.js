document.addEventListener('DOMContentLoaded', () => {
  // ordem importante: configurar handlers primeiro, depois carregar
  configurarSubmit();
  carregarPerfil();
});

/* =========================
   HELPERS (JWT + FETCH)
========================= */
function getToken() {
  return localStorage.getItem('keysecurity_token');
}

async function apiFetch(url, options = {}) {
  const token = getToken();

  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include'
  });

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
    throw new Error(data.error || `Erro HTTP ${res.status}`);
  }
  return data;
}

/* =========================
   DOM HELPERS
========================= */
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

function setSelectSmart(selectEl, value) {
  if (!selectEl) return;

  const target = norm(value);
  if (!target) {
    selectEl.value = '';
    return;
  }

  // tenta bater por value
  selectEl.value = target;
  if (norm(selectEl.value).toLowerCase() === target.toLowerCase()) return;

  // tenta por value (case-insensitive)
  const optByValue = [...selectEl.options].find(
    o => norm(o.value).toLowerCase() === target.toLowerCase()
  );
  if (optByValue) {
    selectEl.value = optByValue.value;
    return;
  }

  // tenta por texto do option
  const optByText = [...selectEl.options].find(
    o => norm(o.text).toLowerCase() === target.toLowerCase()
  );
  if (optByText) {
    selectEl.value = optByText.value;
    return;
  }

  selectEl.value = '';
}

function toISODate(v) {
  const s = norm(v);
  if (!s) return '';
  if (s.includes('T')) return s.split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return s;
}

/* =========================
   WAIT HELPERS (IBGE)
========================= */
function waitForStatesLoaded(selectEl, timeoutMs = 7000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      if (!selectEl) return resolve(false);

      const hasRealOptions =
        selectEl.options.length > 1 &&
        [...selectEl.options].some(o => norm(o.value) !== '');

      if (hasRealOptions) return resolve(true);
      if (Date.now() - start > timeoutMs) return resolve(false);

      setTimeout(tick, 120);
    };
    tick();
  });
}

function waitForCitiesLoaded(selectEl, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      if (!selectEl) return resolve(false);

      const hasRealOptions =
        selectEl.options.length > 1 &&
        [...selectEl.options].some(o => norm(o.value) !== '' || norm(o.text) !== '');

      // importante: precisa ter mais de 1 opção (placeholder + cidades)
      if (hasRealOptions) return resolve(true);
      if (Date.now() - start > timeoutMs) return resolve(false);

      setTimeout(tick, 120);
    };
    tick();
  });
}

/* =========================
   CARREGAR PERFIL
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

    // Avatar
    const avatarImg = byId('avatarImg');
    if (avatarImg) avatarImg.src = view.avatar || '/assets/images/avatar.png';

    // Campos básicos
    setInput(['#email', 'input[name="email"]', 'input[type="email"]'], view.email);
    setInput(['#nome', 'input[name="nome"]', 'input[placeholder="Nome"]'], view.nome);
    setInput(['#sobrenome', 'input[name="sobrenome"]', 'input[placeholder="Sobrenome"]'], view.sobrenome);
    setInput(['#data_nascimento', 'input[name="data_nascimento"]', 'form input[type="date"]'], toISODate(view.data_nascimento));

    // Gênero (no seu HTML é o primeiro select dentro do form, mas pode ter id #genero)
    const generoEl = pick('#genero', 'select[name="genero"]', 'form select.form-control');
    setSelectSmart(generoEl, view.genero);

    // Endereço
    setInput(['#cep', 'input[name="cep"]'], view.cep);
    setInput(['#endereco', 'input[name="endereco"]'], view.endereco);
    setInput(['#complemento', 'input[name="complemento"]'], view.complemento);

    // País (no seu HTML é BR)
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

    // Estado/Cidade (IBGE)
    const estadoSelect = byId('estado');
    const cidadeSelect = byId('cidade');

    const UF = {
      "Acre":"AC","Alagoas":"AL","Amapá":"AP","Amazonas":"AM","Bahia":"BA","Ceará":"CE",
      "Distrito Federal":"DF","Espírito Santo":"ES","Goiás":"GO","Maranhão":"MA","Mato Grosso":"MT",
      "Mato Grosso do Sul":"MS","Minas Gerais":"MG","Pará":"PA","Paraíba":"PB","Paraná":"PR",
      "Pernambuco":"PE","Piauí":"PI","Rio de Janeiro":"RJ","Rio Grande do Norte":"RN",
      "Rio Grande do Sul":"RS","Rondônia":"RO","Roraima":"RR","Santa Catarina":"SC","São Paulo":"SP",
      "Sergipe":"SE","Tocantins":"TO"
    };

    if (estadoSelect) {
      // aguarda ibge.js popular estados
      await waitForStatesLoaded(estadoSelect, 7000);

      const rawEstado = norm(view.estado);
      const estadoValue =
        rawEstado.length === 2 ? rawEstado.toUpperCase() :
        (UF[rawEstado] || rawEstado);

      setSelectSmart(estadoSelect, estadoValue);

      // dispara change pra carregar cidades
      estadoSelect.dispatchEvent(new Event('change'));

      if (cidadeSelect) {
        cidadeSelect.disabled = false;

        // espera as cidades carregarem de verdade (não só placeholder)
        const okCities = await waitForCitiesLoaded(cidadeSelect, 8000);

        const rawCidade = norm(view.cidade);
        if (okCities && rawCidade) {
          // casa por value (se DB guarda código) ou por texto (se DB guarda nome)
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
   SUBMIT + AÇÕES
========================= */
function configurarSubmit() {
  const form = document.querySelector('form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const cidadeEl = byId('cidade');
    const estadoEl = byId('estado');

    if (cidadeEl) cidadeEl.disabled = false;

    const senhaAtual = (byId('senhaAtual')?.value ?? '').trim();
    const novaSenha = (byId('novaSenha')?.value ?? '').trim();

    // --- Cidade: salvar como NOME (texto), não como value/código ---
    let cidade = null;
    if (cidadeEl && cidadeEl.selectedIndex >= 0) {
      const val = norm(cidadeEl.value);
      const txt = norm(cidadeEl.options[cidadeEl.selectedIndex]?.text);

      // se ainda está no placeholder, não salva
      if (val && txt && !txt.toLowerCase().includes('selecione')) {
        cidade = txt; // salva nome humano
      }
    }

    // se escolheu estado, exige cidade carregada e selecionada
    const estadoVal = norm(estadoEl?.value);
    if (estadoVal) {
      const loaded = cidadeEl && cidadeEl.options.length > 1;
      if (!loaded) {
        showModal('Atenção', 'Aguarde a lista de cidades carregar e selecione uma cidade.', 'info');
        return;
      }
      if (!cidade) {
        showModal('Atenção', 'Selecione uma cidade válida antes de salvar.', 'info');
        return;
      }
    }

    const payload = {
      email: norm(byId('email')?.value),
      senhaAtual,
      novaSenha,

      nome: norm(byId('nome')?.value) || norm(pick('input[placeholder="Nome"]')?.value),
      sobrenome: norm(byId('sobrenome')?.value) || norm(pick('input[placeholder="Sobrenome"]')?.value),

      // gênero pode estar em #genero ou no primeiro select do form
      genero: norm(byId('genero')?.value) || norm(pick('form select.form-control')?.value),

      data_nascimento: norm(byId('data_nascimento')?.value) || norm(pick('form input[type="date"]')?.value),

      cep: norm(byId('cep')?.value) || null,
      endereco: norm(byId('endereco')?.value) || null,
      pais: norm(byId('pais')?.value) || null,

      estado: estadoVal || null,

      // cidade salva como texto (nome)
      cidade: cidade,

      complemento: norm(byId('complemento')?.value) || null
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

      // recarrega para garantir que refletiu o que salvou
      setTimeout(() => carregarPerfil(), 250);

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
  const btnExcluir = byId('btnExcluirConta');
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
     Serverless-friendly: dataUrl JSON
  ========================= */
  const avatarFile = byId('avatarFile');
  const btnUpload = byId('btnUploadAvatar');
  const btnRemove = byId('btnRemoveAvatar');
  const avatarImg = byId('avatarImg');

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