// ============================================================
// SI-NOMER — API Helpers (fetch ke Google Apps Script)
// ============================================================

async function apiGet(action, params) {
  const qs = new URLSearchParams({ action, ...(params || {}) }).toString();
  try {
    const res = await fetch(`${GAS_URL}?${qs}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Terjadi kesalahan.');
    return json;
  } catch (err) {
    showToast(err.message, 'error');
    throw err;
  }
}

async function apiPost(action, data) {
  try {
    const res = await fetch(GAS_URL, {
      method: 'POST',
      // WAJIB text/plain agar tidak memicu CORS preflight yang diblok GAS
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, data: data || {} })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Terjadi kesalahan.');
    return json;
  } catch (err) {
    showToast(err.message, 'error');
    throw err;
  }
}

// Konversi File -> base64 (untuk upload bukti foto)
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function showToast(message, type = 'success') {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.className = `toast toast-${type} show`;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 3200);
}
