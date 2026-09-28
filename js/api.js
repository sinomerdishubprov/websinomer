// ============================================================
// SI-NOMER — API Helpers (fetch ke Google Apps Script)
// opsi = { diam: true } -> tidak menampilkan toast bila gagal
//        { timeout: ms } -> batas waktu menunggu jawaban server
// ============================================================

function fetchDenganBatas(url, init, ms) {
  if (typeof AbortController === 'undefined') return fetch(url, init);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, Object.assign({}, init, { signal: ctrl.signal })).finally(() => clearTimeout(t));
}

// Pesan kesalahan yang mudah dipahami. err.dariServer = true bila server
// menjawab tetapi menolak permintaan (mis. validasi), false bila koneksi gagal.
function galatRamah(err) {
  if (err && err.dariServer) return err;
  let pesan = (err && err.message) || 'Terjadi kesalahan.';
  if (err && err.name === 'AbortError') pesan = 'Server tidak merespons (waktu habis). Periksa koneksi internet lalu coba lagi.';
  else if (/Failed to fetch|NetworkError|Load failed|network/i.test(pesan)) pesan = 'Tidak dapat terhubung ke server. Periksa koneksi internet lalu coba lagi.';
  const e = new Error(pesan);
  e.dariServer = false;
  return e;
}

async function bacaJawaban(res) {
  const json = await res.json();
  if (!json.success) {
    const e = new Error(json.message || 'Terjadi kesalahan.');
    e.dariServer = true;
    throw e;
  }
  return json;
}

async function apiGet(action, params, opsi) {
  opsi = opsi || {};
  const qs = new URLSearchParams({ action, ...(params || {}) }).toString();
  try {
    const res = await fetchDenganBatas(`${GAS_URL}?${qs}`, {}, opsi.timeout || 60000);
    return await bacaJawaban(res);
  } catch (err) {
    const e = galatRamah(err);
    if (!opsi.diam) showToast(e.message, 'error', 6000);
    throw e;
  }
}

async function apiPost(action, data, opsi) {
  opsi = opsi || {};
  try {
    const res = await fetchDenganBatas(GAS_URL, {
      method: 'POST',
      // WAJIB text/plain agar tidak memicu CORS preflight yang diblok GAS
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, data: data || {} })
    }, opsi.timeout || 120000);
    return await bacaJawaban(res);
  } catch (err) {
    const e = galatRamah(err);
    if (!opsi.diam) showToast(e.message, 'error', 6000);
    throw e;
  }
}

// Konversi File -> base64 (untuk upload file PDF panduan)
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function showToast(message, type = 'success', durasi) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.className = `toast toast-${type} show`;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), durasi || (type === 'error' ? 5000 : 3200));
}
