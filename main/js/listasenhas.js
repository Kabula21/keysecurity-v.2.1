let currentGroupId = null;

// Estado de listagem
let allGroups = [];         // tudo vindo da API
let filteredGroups = [];    // após filtro
let currentPage = 1;
const pageSize = 10;        // ✅ 10 acordeões por página
const maxPageButtons = 10;  // ✅ no máximo 10 botões numéricos

/* =========================
   AUTH + FETCH HELPER (JWT)
========================= */
function getToken() {
  return localStorage.getItem('keysecurity_token');
}

async function apiFetch(url, options = {}) {
  const token = getToken();

  const headers = new Headers(options.headers || {});

  // Só seta Content-Type quando tiver body JSON (não FormData)
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
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
    if (typeof showModal === 'function') {
      showModal('Sessão expirada', 'Faça login novamente.', 'error');
      setTimeout(() => (window.location.href = '/login'), 900);
    } else {
      window.location.href = '/login';
    }
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

document.addEventListener('DOMContentLoaded', () => {
  bindAcoesUI();
  configurarModalGrupo();
  configurarModalItem();
  configurarBusca();
  carregarSenhas(); // carrega tudo e renderiza
});

/* =========================
   BUSCA (FILTRO)
========================= */
function configurarBusca() {
  const input = document.getElementById('searchInput');
  if (!input) return;

  const debounce = (fn, ms) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  };

  input.addEventListener('input', debounce(() => {
    currentPage = 1; // ao buscar, volta para primeira página
    aplicarFiltroEPaginar();
  }, 250));
}

function aplicarFiltroEPaginar() {
  const q = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();

  if (!q) {
    filteredGroups = [...allGroups];
  } else {
    filteredGroups = allGroups.filter(g => {
      // busca no grupo
      const inGroup =
        (g.name || '').toLowerCase().includes(q) ||
        (g.type || '').toLowerCase().includes(q);

      // busca nos itens do grupo (opcional, mas muito útil)
      const inItems = (g.items || []).some(it => {
        return (
          (it.username || '').toLowerCase().includes(q) ||
          (it.email || '').toLowerCase().includes(q) ||
          (it.note || '').toLowerCase().includes(q)
        );
      });

      return inGroup || inItems;
    });
  }

  renderPaginaAtual();
  renderPaginacao();
  atualizarContador();
}

/* =========================
   CARREGAR / RENDER
========================= */
async function carregarSenhas() {
  const container = document.getElementById('accordion-two');
  if (!container) return;

  try {
    allGroups = await apiJson('/api/passwords', { method: 'GET' });
    filteredGroups = [...allGroups];

    const totalPages = Math.max(1, Math.ceil(filteredGroups.length / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;

    renderPaginaAtual();
    renderPaginacao();
    atualizarContador();

  } catch (err) {
    if (String(err.message) === '401') return; // já redireciona no helper

    console.error('Erro ao carregar senhas:', err);
    if (typeof showModal === 'function') {
      showModal('Erro', 'Não foi possível carregar as senhas.', 'error');
    } else {
      alert('Não foi possível carregar as senhas.');
    }
  }
}

function renderPaginaAtual() {
  const container = document.getElementById('accordion-two');
  if (!container) return;

  container.innerHTML = '';

  if (!filteredGroups.length) {
    container.innerHTML = `
      <div class="alert alert-info">
        Nenhum resultado encontrado.
      </div>
    `;
    return;
  }

  const start = (currentPage - 1) * pageSize;
  const pageGroups = filteredGroups.slice(start, start + pageSize);

  pageGroups.forEach((group) => {
    const collapseId = `collapseGroup_${group.id}`;

    container.insertAdjacentHTML('beforeend', `
      <div class="card mb-2" data-group-id="${group.id}">
        <div class="card-header d-flex align-items-center justify-content-between">
          <h5 class="mb-0 collapsed"
            data-toggle="collapse" data-target="#${collapseId}"
            aria-expanded="false" aria-controls="${collapseId}">
            <i class="fa" aria-hidden="true"></i>
            ${escapeHtml(group.name)}
            <small class="text-muted ml-2">${group.type ? '(' + escapeHtml(group.type) + ')' : ''}</small>
          </h5>

          <div class="d-flex">
            <button class="btn btn-sm btn-primary btn-edit-group mr-2"
              type="button"
              data-group-id="${group.id}"
              data-group-name="${escapeAttr(group.name)}"
              data-group-type="${escapeAttr(group.type || '')}"
              title="Editar grupo">
              <i class="icon-pencil"></i>
            </button>

            <button class="btn btn-sm btn-danger btn-delete-group"
              type="button"
              data-group-id="${group.id}"
              title="Excluir grupo">
              <i class="icon-trash"></i>
            </button>
          </div>
        </div>

        <div id="${collapseId}" class="collapse" data-parent="#accordion-two">
          <div class="card-body" id="groupBody_${group.id}">
            ${renderItems(group)}
          </div>
        </div>
      </div>
    `);
  });
}

function atualizarContador() {
  const totalEl = document.getElementById('totalRegistros');
  if (!totalEl) return;

  // contador de registros = total de itens dentro dos grupos filtrados
  const totalItems = filteredGroups.reduce((sum, g) => sum + (g.items?.length || 0), 0);
  totalEl.textContent = `${totalItems} Registros`;
}

function renderItems(group) {
  const items = group.items || [];

  if (!items.length) {
    return `
      <div class="text-muted">Nenhuma conta cadastrada neste grupo.</div>
      <div class="text-right mt-3">
        <button class="btn btn-sm btn-primary btn-add-item" type="button" data-group-id="${group.id}">
          <i class="mdi mdi-plus"></i> Adicionar senha
        </button>
      </div>
    `;
  }

  return `
    ${items.map(item => `
      <div class="border rounded p-3 mb-3" data-item-id="${item.id}">

        <div class="mb-2">
          <small class="text-muted d-block mb-1"><i class="icon-user"></i> Nome de usuário</small>
          <div class="input-group">
            <input type="text" class="form-control bg-light" value="${escapeHtml(item.username || '')}" readonly>
            <div class="input-group-append">
              <button class="btn btn-secondary btn-copy" type="button"
                data-copy="${escapeAttr(item.username || '')}" title="Copiar">
                <i class="icon-docs"></i>
              </button>
            </div>
          </div>
        </div>

        <div class="mb-2">
          <small class="text-muted d-block mb-1"><i class="icon-envelope"></i> E-mail</small>
          <div class="input-group">
            <input type="text" class="form-control bg-light" value="${escapeHtml(item.email || '')}" readonly>
            <div class="input-group-append">
              <button class="btn btn-secondary btn-copy" type="button"
                data-copy="${escapeAttr(item.email || '')}" title="Copiar">
                <i class="icon-docs"></i>
              </button>
            </div>
          </div>
        </div>

        <div class="mb-2">
          <small class="text-muted d-block mb-1"><i class="icon-lock"></i> Senha</small>
          <div class="input-group">
            <input type="password" class="form-control bg-light pwd" value="${escapeHtml(item.password || '')}" readonly>
            <div class="input-group-append">
              <button class="btn btn-secondary btn-toggle" type="button" title="Mostrar/ocultar">
                <i class="icon-eye"></i>
              </button>
              <button class="btn btn-secondary btn-copy" type="button"
                data-copy="${escapeAttr(item.password || '')}" title="Copiar">
                <i class="icon-docs"></i>
              </button>
            </div>
          </div>
        </div>

        <div class="mb-3">
          <small class="text-muted d-block mb-1"><i class="icon-note"></i> Observação</small>
          <div class="form-control bg-light">${escapeHtml(item.note || '—')}</div>
        </div>

        <div class="d-flex justify-content-end">
          <button class="btn btn-primary mr-2 btn-edit-item"
            type="button"
            data-item-id="${item.id}"
            data-item-group-id="${group.id}"
            data-username="${escapeAttr(item.username || '')}"
            data-email="${escapeAttr(item.email || '')}"
            data-password="${escapeAttr(item.password || '')}"
            data-note="${escapeAttr(item.note || '')}" title="Editar Senhas">
            <i class="icon-pencil"></i>
          </button>

          <button class="btn btn-danger btn-delete-item"
            type="button"
            data-item-id="${item.id}" title="Excluir Senhas">
            <i class="icon-trash"></i>
          </button>
        </div>
      </div>
    `).join('')}

    <div class="text-right mt-2">
      <button class="btn btn-sm btn-primary btn-add-item" type="button" data-group-id="${group.id}" title="Adicionar Senha">
        <i class="mdi mdi-plus"></i> Adicionar senha
      </button>
    </div>
  `;
}

/* =========================
   PAGINAÇÃO (max 10 botões)
========================= */
function renderPaginacao() {
  const ul = document.getElementById('pagination');
  if (!ul) return;

  const totalPages = Math.max(1, Math.ceil(filteredGroups.length / pageSize));
  if (currentPage > totalPages) currentPage = totalPages;

  ul.innerHTML = '';

  const addLi = (label, page, disabled = false, active = false, isDots = false) => {
    if (isDots) {
      ul.insertAdjacentHTML('beforeend', `
        <li class="page-item disabled">
          <span class="page-link">...</span>
        </li>
      `);
      return;
    }

    ul.insertAdjacentHTML('beforeend', `
      <li class="page-item ${disabled ? 'disabled' : ''} ${active ? 'active' : ''}">
        <a class="page-link" href="#" data-page="${page}">${label}</a>
      </li>
    `);
  };

  // Anterior
  addLi('Anterior', currentPage - 1, currentPage === 1);

  // Se tiver poucas páginas, mostra todas (até 10)
  if (totalPages <= maxPageButtons) {
    for (let p = 1; p <= totalPages; p++) {
      addLi(String(p), p, false, p === currentPage);
    }
    addLi('Próximo', currentPage + 1, currentPage === totalPages);
    bindPaginationClicks(ul, totalPages);
    return;
  }

  // Sempre mostrar primeira e última
  // Reservamos 2 slots para: [1] e [last]
  // Sobram (maxPageButtons - 2) para a janela do meio
  const windowSize = maxPageButtons - 2; // ex: 8 se max=10

  // define janela central
  let start = currentPage - Math.floor(windowSize / 2);
  let end = currentPage + Math.ceil(windowSize / 2) - 1;

  // Ajuste bordas
  if (start < 2) {
    start = 2;
    end = start + windowSize - 1;
  }
  if (end > totalPages - 1) {
    end = totalPages - 1;
    start = end - windowSize + 1;
    if (start < 2) start = 2;
  }

  // Página 1
  addLi('1', 1, false, currentPage === 1);

  // Reticências esquerda
  if (start > 2) addLi('...', null, true, false, true);

  // Janela do meio
  for (let p = start; p <= end; p++) {
    addLi(String(p), p, false, p === currentPage);
  }

  // Reticências direita
  if (end < totalPages - 1) addLi('...', null, true, false, true);

  // Última página
  addLi(String(totalPages), totalPages, false, currentPage === totalPages);

  // Próximo
  addLi('Próximo', currentPage + 1, currentPage === totalPages);

  bindPaginationClicks(ul, totalPages);
}

function bindPaginationClicks(ul, totalPages) {
  ul.querySelectorAll('a.page-link').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const page = Number(a.getAttribute('data-page'));
      if (!page || page < 1 || page > totalPages || page === currentPage) return;

      currentPage = page;
      renderPaginaAtual();
      renderPaginacao();
      atualizarContador();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

/* =========================
   EVENTOS / AÇÕES
========================= */
function bindAcoesUI() {
  document.addEventListener('click', async (e) => {
    // copiar
    const copyBtn = e.target.closest('.btn-copy');
    if (copyBtn) {
      const text = copyBtn.getAttribute('data-copy') || '';
      await copiarParaClipboard(text);
      if (typeof showModal === 'function') {
        showModal('Copiado', 'Texto copiado para a área de transferência.', 'success');
      }
      return;
    }

    // mostrar/ocultar senha
    const toggleBtn = e.target.closest('.btn-toggle');
    if (toggleBtn) {
      const wrap = toggleBtn.closest('.input-group');
      const input = wrap?.querySelector('input.pwd');
      if (!input) return;
      input.type = input.type === 'password' ? 'text' : 'password';
      return;
    }

    // adicionar item
    const addItemBtn = e.target.closest('.btn-add-item');
    if (addItemBtn) {
      const groupId = addItemBtn.getAttribute('data-group-id');
      abrirModalItem(groupId);
      return;
    }

    // editar grupo
    const editGroupBtn = e.target.closest('.btn-edit-group');
    if (editGroupBtn) {
      abrirModalEditarGrupo(editGroupBtn);
      return;
    }

    // editar item
    const editItemBtn = e.target.closest('.btn-edit-item');
    if (editItemBtn) {
      abrirModalEditarItem(editItemBtn);
      return;
    }

    // excluir item
    const delItemBtn = e.target.closest('.btn-delete-item');
    if (delItemBtn) {
      const itemId = delItemBtn.getAttribute('data-item-id');
      excluirItem(itemId);
      return;
    }

    // excluir grupo
    const delGroupBtn = e.target.closest('.btn-delete-group');
    if (delGroupBtn) {
      const groupId = delGroupBtn.getAttribute('data-group-id');
      excluirGrupo(groupId);
      return;
    }
  });
}

async function copiarParaClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const t = document.createElement('textarea');
    t.value = text;
    document.body.appendChild(t);
    t.select();
    document.execCommand('copy');
    document.body.removeChild(t);
  }
}

/* =========================
   MODAL GRUPO (NOVO + EDITAR)
========================= */
function configurarModalGrupo() {
  const btnSalvar = document.getElementById('btnSalvarGrupo');
  const inputNome = document.getElementById('grupoNome');
  const inputTipo = document.getElementById('grupoTipo');
  const inputId = document.getElementById('grupoId');
  const title = document.getElementById('modalGrupoLabel');

  if (!btnSalvar || !inputNome || !inputId || !title) return;

  btnSalvar.addEventListener('click', async () => {
  const id = (inputId.value || '').trim();
  const name = inputNome.value.trim();
  const type = (inputTipo?.value || '').trim();

  if (!name) {
    if (typeof showModal === 'function') showModal('Atenção', 'Informe o Nome Principal.', 'info');
    return;
  }

  try {
    const method = id ? 'PUT' : 'POST';
    const payload = id
      ? { id: Number(id), name, type }
      : { name, type };

    await apiJson('/api/password-groups', {
      method,
      body: JSON.stringify(payload)
    });

    // limpa e reseta modal
    inputId.value = '';
    inputNome.value = '';
    if (inputTipo) inputTipo.value = '';
    title.textContent = 'Novo Grupo';

    if (window.$) window.$('#modalGrupo').modal('hide');
    if (typeof showModal === 'function') showModal('Sucesso', 'Grupo salvo com sucesso.', 'success');

    carregarSenhas();
  } catch (err) {
    console.error(err);
    if (typeof showModal === 'function') showModal('Erro', err.message || 'Erro de conexão ao salvar grupo.', 'error');
  }
});
}

function abrirModalEditarGrupo(btn) {
  const id = btn.getAttribute('data-group-id');
  const name = btn.getAttribute('data-group-name') || '';
  const type = btn.getAttribute('data-group-type') || '';

  document.getElementById('modalGrupoLabel').textContent = 'Editar Grupo';
  document.getElementById('grupoId').value = id;
  document.getElementById('grupoNome').value = name;
  document.getElementById('grupoTipo').value = type;

  if (window.$) window.$('#modalGrupo').modal('show');
}

/* =========================
   MODAL ITEM (NOVO + EDITAR)
========================= */
function abrirModalItem(groupId) {
  currentGroupId = Number(groupId);

  document.getElementById('itemId').value = ''; // novo
  document.getElementById('itemGroupId').value = String(currentGroupId);

  document.getElementById('itemUsuario').value = '';
  document.getElementById('itemEmail').value = '';
  document.getElementById('itemSenha').value = '';
  document.getElementById('itemObs').value = '';

  document.getElementById('modalItemLabel').textContent = 'Adicionar senha';
  if (window.$) window.$('#modalItem').modal('show');
}

function abrirModalEditarItem(btn) {
  const itemId = btn.getAttribute('data-item-id');
  const groupId = btn.getAttribute('data-item-group-id');

  document.getElementById('itemId').value = itemId;
  document.getElementById('itemGroupId').value = groupId;

  document.getElementById('itemUsuario').value = btn.getAttribute('data-username') || '';
  document.getElementById('itemEmail').value = btn.getAttribute('data-email') || '';
  document.getElementById('itemSenha').value = btn.getAttribute('data-password') || '';
  document.getElementById('itemObs').value = btn.getAttribute('data-note') || '';

  document.getElementById('modalItemLabel').textContent = 'Editar senha';
  if (window.$) window.$('#modalItem').modal('show');
}

function configurarModalItem() {
  const btnSalvar = document.getElementById('btnSalvarItem');
  if (!btnSalvar) return;

  btnSalvar.addEventListener('click', async () => {
  const itemId = (document.getElementById('itemId')?.value || '').trim();
  const groupId = Number(document.getElementById('itemGroupId')?.value || currentGroupId);

  const username = (document.getElementById('itemUsuario')?.value || '').trim();
  const email = (document.getElementById('itemEmail')?.value || '').trim();
  const password = (document.getElementById('itemSenha')?.value || '').trim();
  const note = (document.getElementById('itemObs')?.value || '').trim();

  if (!groupId) {
    if (typeof showModal === 'function') showModal('Erro', 'Grupo inválido.', 'error');
    return;
  }
  if (!password) {
    if (typeof showModal === 'function') showModal('Atenção', 'Informe a senha.', 'info');
    return;
  }

  try {
    const method = itemId ? 'PUT' : 'POST';

    const payload = itemId
      ? { id: Number(itemId), username, email, password, note }
      : { groupId, username, email, password, note };

    await apiJson('/api/password-items', {
      method,
      body: JSON.stringify(payload)
    });

    if (window.$) window.$('#modalItem').modal('hide');
    if (typeof showModal === 'function') showModal('Sucesso', 'Senha salva com sucesso.', 'success');

    carregarSenhas();
  } catch (err) {
    console.error(err);
    if (typeof showModal === 'function') showModal('Erro', err.message || 'Erro de conexão ao salvar senha.', 'error');
  }
});
}

/* =========================
   EXCLUIR ITEM / GRUPO
========================= */
async function excluirItem(itemId) {
  const ok = await confirmModal(
    'Excluir senha',
    'Deseja realmente excluir esta senha? Essa ação não pode ser desfeita.',
    'error',
    'Excluir',
    'Cancelar'
  );

  if (!ok) return;

  try {
  await apiJson(`/api/password-items?id=${encodeURIComponent(itemId)}`, {
    method: 'DELETE'
  });

  if (typeof showModal === 'function') showModal('Sucesso', 'Senha excluída.', 'success');
  carregarSenhas();
} catch (err) {
  console.error(err);
  if (typeof showModal === 'function') showModal('Erro', err.message || 'Erro de conexão ao excluir.', 'error');
}
}

async function excluirGrupo(groupId) {
  const ok = await confirmModal(
    'Excluir grupo',
    'Deseja realmente excluir este grupo? Todas as senhas dentro dele serão removidas.',
    'error',
    'Excluir grupo',
    'Cancelar'
  );

  if (!ok) return;

  try {
  await apiJson(`/api/password-groups?id=${encodeURIComponent(groupId)}`, {
    method: 'DELETE'
  });

  if (typeof showModal === 'function') {
    showModal('Sucesso', 'Grupo excluído com sucesso.', 'success');
  }

  carregarSenhas();
} catch (err) {
  console.error(err);
  if (typeof showModal === 'function') {
    showModal('Erro', err.message || 'Erro de conexão ao excluir grupo.', 'error');
  }
}
}

/* =========================
   ESCAPES
========================= */
function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
function escapeAttr(str) {
  return escapeHtml(str).replaceAll('\n', ' ');
}
