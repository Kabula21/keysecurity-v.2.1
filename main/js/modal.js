(function () {
  const modal = document.getElementById('ksModal');
  if (!modal) return;

  const box = modal.querySelector('.ks-modal-box');
  const titleEl = document.getElementById('ksModalTitle');
  const msgEl = document.getElementById('ksModalMessage');

  const okBtn = document.getElementById('ksModalOk');
  const cancelBtn = document.getElementById('ksModalCancel');

  let resolver = null;

  function closeModal() {
    modal.classList.add('hidden');
    box.classList.remove('ks-success', 'ks-error', 'ks-info');
    resolver = null;
  }

  function setType(type) {
    box.classList.remove('ks-success', 'ks-error', 'ks-info');
    if (type === 'success') box.classList.add('ks-success');
    else if (type === 'error') box.classList.add('ks-error');
    else box.classList.add('ks-info');
  }

  function showCancel(show) {
    if (!cancelBtn) return;
    cancelBtn.style.display = show ? '' : 'none';
  }

  window.showModal = function (title, message, type = 'info') {
    titleEl.textContent = title || 'Aviso';
    msgEl.textContent = message || '';
    setType(type);

    showCancel(false);
    okBtn.textContent = 'OK';

    modal.classList.remove('hidden');
    okBtn.focus();
  };

  window.confirmModal = function (title, message, type = 'info', okText = 'Sim', cancelText = 'Não') {
    titleEl.textContent = title || 'Confirmar';
    msgEl.textContent = message || '';
    setType(type);

    showCancel(true);
    okBtn.textContent = okText;
    cancelBtn.textContent = cancelText;

    modal.classList.remove('hidden');
    okBtn.focus();

    return new Promise((resolve) => {
      resolver = resolve;
    });
  };

  okBtn.addEventListener('click', () => {
    if (resolver) resolver(true);
    closeModal();
  });

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      if (resolver) resolver(false);
      closeModal();
    });
  }

  modal.addEventListener('click', (e) => {
    if (e.target?.dataset?.close === 'true') {
      if (resolver) resolver(false);
      closeModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('hidden') && e.key === 'Escape') {
      if (resolver) resolver(false);
      closeModal();
    }
  });
})();
