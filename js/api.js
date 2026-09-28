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
  if (err && (err.dariServer || err.bukanJson)) return err;
  let pesan = (err && err.message) || 'Terjadi kesalahan.';
  if (err && err.name === 'AbortError') pesan = 'Server tidak merespons (waktu habis). Periksa koneksi internet lalu coba lagi.';
  else if (/Failed to fetch|NetworkError|Load failed|network/i.test(pesan)) pesan = 'Tidak dapat terhubung ke server. Periksa koneksi internet lalu coba lagi.';
  const e = new Error(pesan);
  e.dariServer = false;
  e.jaringan = !(err && err.name === 'AbortError');
  return e;
}

// Google kadang membalas dengan halaman error (HTML) walaupun skripnya berjalan
// normal. Ambil teks yang bisa dibaca dari halaman itu untuk pesan kesalahan.
function pesanDariHalaman(html) {
  const judul = ((String(html).match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '').trim();
  const isi = String(html)
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ').trim();
  const ringkas = (isi || judul).slice(0, 180);
  return 'Server Google sedang mengalami gangguan sesaat' + (ringkas ? ' ("' + ringkas + '")' : '') + '. Silakan coba lagi.';
}

async function bacaJawaban(res) {
  const teks = await res.text();
  let json;
  try {
    json = JSON.parse(teks);
  } catch (errParse) {
    const e = new Error(pesanDariHalaman(teks));
    e.dariServer = false;
    e.bukanJson = true;
    throw e;
  }
  if (!json.success) {
    const e = new Error(json.message || 'Terjadi kesalahan.');
    e.dariServer = true;
    throw e;
  }
  return json;
}

// Permintaan baca (GET) aman diulang: bila Google membalas halaman error atau
// koneksi putus sesaat, dicoba sekali lagi otomatis sebelum menampilkan pesan.
async function apiGet(action, params, opsi) {
  opsi = opsi || {};
  const qs = new URLSearchParams({ action, ...(params || {}) }).toString();
  for (let percobaan = 0; ; percobaan++) {
    try {
      const res = await fetchDenganBatas(`${GAS_URL}?${qs}`, {}, opsi.timeout || 60000);
      return await bacaJawaban(res);
    } catch (err) {
      const e = galatRamah(err);
      if (percobaan === 0 && (e.bukanJson || e.jaringan)) {
        await new Promise(r => setTimeout(r, opsi.jedaUlang === undefined ? 1500 : opsi.jedaUlang));
        continue;
      }
      if (!opsi.diam) showToast(e.message, 'error', 6000);
      throw e;
    }
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
