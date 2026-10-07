// ============================================================
// SI-NOMER — Data Lokal, Sinkronisasi & Aksi Instan
// ------------------------------------------------------------
// Seluruh data (nota, barang, riwayat, data master, panduan) disimpan
// di browser: di memori dan di localStorage. Karena itu perpindahan
// menu & halaman langsung tampil tanpa menunggu server.
//
// Server hanya ditanya di latar belakang "apakah ada data baru?"
// (cukup membandingkan nomor versi). Bila ada, data baru diunduh
// sekali lalu tampilan diperbarui otomatis.
//
// Aksi (ajukan, paraf, periksa stok, setujui, berita acara, dll.)
// langsung tampil hasilnya, lalu dikirim ke server di latar belakang.
// Bila server menolak, tampilan dikembalikan seperti semula dan
// pesan kesalahannya ditampilkan.
// ============================================================

const KUNCI_DATA_LOKAL = 'sinomer_data_v1_';
const KUNCI_DRAF_NOTA = 'sinomer_draf_nota_';
const DAFTAR_TABEL = ['nota', 'items', 'log', 'barang', 'bidang', 'pegawai', 'panduan', 'logStok'];
const JEDA_CEK_BERKALA = 60000;   // cek data baru tiap 60 detik selama tab terbuka
const JEDA_CEK_SAAT_PINDAH = 20000; // saat berpindah halaman, cek bila terakhir > 20 detik lalu

const store = {
  versi: '',
  nota: [], items: [], log: [], barang: [], bidang: [], pegawai: [], panduan: [], logStok: [],
  idx: { nota: new Map(), items: new Map(), log: new Map() },
  siap: false,             // data sudah tersedia (dari localStorage atau server)
  terakhirSinkron: 0,
  offline: false,
  sedangSinkron: false,
  pending: new Map(),      // kunci aksi -> { aksi, mulai }
  perluSinkron: false,
  generasi: 0,             // bertambah setiap data lokal diubah oleh aksi

  galatAwal: ''
};

// ---------------- utilitas ----------------
function normTeks(x) { return String(x === undefined || x === null ? '' : x).trim().toLowerCase(); }
function salinDalam(x) { return x === undefined ? undefined : JSON.parse(JSON.stringify(x)); }

// Waktu sekarang dalam WIB, format yang sama dengan server: "yyyy-MM-dd HH:mm:ss"
function sekarangWib() {
  const d = new Date(Date.now() + 7 * 3600 * 1000);
  const p = n => String(n).padStart(2, '0');
  return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate()) + ' ' + p(d.getUTCHours()) + ':' + p(d.getUTCMinutes()) + ':' + p(d.getUTCSeconds());
}

function waktuMs(v) {
  const d = typeof parseTgl === 'function' ? parseTgl(v) : new Date(v);
  return d && !isNaN(d.getTime()) ? d.getTime() : 0;
}

function dariRingkas(t) {
  if (!t || !Array.isArray(t.h) || !Array.isArray(t.r)) return [];
  return t.r.map(row => {
    const o = {};
    t.h.forEach((k, i) => { o[k] = row[i] === undefined || row[i] === null ? '' : row[i]; });
    return o;
  });
}

function keRingkas(list) {
  const h = [];
  const ada = new Set();
  list.forEach(o => Object.keys(o).forEach(k => { if (k[0] !== '_' && !ada.has(k)) { ada.add(k); h.push(k); } }));
  return { h, r: list.map(o => h.map(k => (o[k] === undefined ? '' : o[k]))) };
}

function bangunIndeks() {
  store.idx.nota = new Map(store.nota.map(n => [String(n.NoNota), n]));
  const kelompok = (list) => {
    const m = new Map();
    list.forEach(x => {
      const k = String(x.NoNota);
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(x);
    });
    return m;
  };
  store.idx.items = kelompok(store.items);
  store.idx.log = kelompok(store.log);
}

function kunciDataLokal() { return KUNCI_DATA_LOKAL + normTeks(currentUser && currentUser.email); }

// ---------------- simpan & muat localStorage ----------------
function muatDataLokal() {
  store.siap = false;
  try {
    const raw = localStorage.getItem(kunciDataLokal());
    if (!raw) return false;
    const d = JSON.parse(raw);
    if (!d || !d.data) return false;
    DAFTAR_TABEL.forEach(t => { store[t] = dariRingkas(d.data[t]); });
    store.versi = d.versi || '';
    if (d.versiPdf) store.versiPdf = d.versiPdf;
    bangunIndeks();
    store.siap = true;
    return true;
  } catch (err) {
    return false;
  }
}

let _timerSimpanLokal = null;
function simpanDataLokal() {
  clearTimeout(_timerSimpanLokal);
  _timerSimpanLokal = setTimeout(() => {
    // Hanya data yang sudah dikonfirmasi server yang disimpan permanen
    if (!currentUser || !store.siap || store.pending.size) return;
    try {
      const data = {};
      DAFTAR_TABEL.forEach(t => { data[t] = keRingkas(store[t]); });
      localStorage.setItem(kunciDataLokal(), JSON.stringify({ versi: store.versi, versiPdf: store.versiPdf || '', disimpan: Date.now(), data }));
    } catch (err) { /* penyimpanan penuh / tidak tersedia: aplikasi tetap jalan dari memori */ }
  }, 400);
}

function hapusDataLokal(email) {
  try { localStorage.removeItem(KUNCI_DATA_LOKAL + normTeks(email)); } catch (err) { /* abaikan */ }
  if (typeof hapusPdfTersimpan === 'function') hapusPdfTersimpan();
}

function kosongkanStore() {
  DAFTAR_TABEL.forEach(t => { store[t] = []; });
  store.versi = '';
  store.siap = false;
  store.pending.clear();
  store.perluSinkron = false;
  store.terakhirSinkron = 0;
  store.galatAwal = '';
  bangunIndeks();
}

function terapkanDataServer(versi, data) {
  DAFTAR_TABEL.forEach(t => { if (data[t]) store[t] = dariRingkas(data[t]); });
  if (data.meta && data.meta.versiPdf) store.versiPdf = String(data.meta.versiPdf);
  store.versi = versi || '';
  store.siap = true;
  store.galatAwal = '';
  bangunIndeks();
  perbaruiSesiDariPegawai();
  simpanDataLokal();
}

// Bila Admin mengubah nama/role/bidang pengguna yang sedang login, sesi ikut diperbarui
function perbaruiSesiDariPegawai() {
  if (!currentUser) return;
  const p = store.pegawai.find(x => normTeks(x.Email) === normTeks(currentUser.email));
  if (!p) return;
  const baru = { nama: p.Nama, nip: String(p.NIP || ''), role: p.Role, bidangKode: p.BidangKode };
  let berubah = false;
  Object.keys(baru).forEach(k => {
    if (baru[k] !== undefined && baru[k] !== '' && String(currentUser[k]) !== String(baru[k])) { currentUser[k] = baru[k]; berubah = true; }
  });
  if (berubah) {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser)); } catch (err) { /* abaikan */ }
  }
}

// ---------------- sinkronisasi latar belakang ----------------
let _janjiSinkron = null;
let _timerSinkronTunda = null;

function sinkronkan(opsi) {
  opsi = opsi || {};
  if (!currentUser) return Promise.resolve();
  if (store.pending.size) { store.perluSinkron = true; return Promise.resolve(); }
  if (_janjiSinkron) return _janjiSinkron;
  store.sedangSinkron = true;
  store.sinkronLama = false;
  aturIndikatorSinkron();
  // "Memperbarui…" baru tampil bila pemeriksaan lebih dari 1 detik (pemeriksaan cepat tidak berkedip)
  const timerIndikator = setTimeout(() => { store.sinkronLama = true; aturIndikatorSinkron(); }, 1000);
  const generasiAwal = store.generasi;
  const emailAwal = normTeks(currentUser.email);
  _janjiSinkron = (async () => {
    let berhasil = false;
    try {
      const res = await apiGet('getBootstrap', {
        email: currentUser.email,
        versi: opsi.paksa ? '' : (store.siap ? store.versi : ''),
        paksa: opsi.paksa ? '1' : ''
      }, { diam: true, timeout: 45000 });
      if (!currentUser || normTeks(currentUser.email) !== emailAwal) return false; // sudah keluar / ganti akun
      store.terakhirSinkron = Date.now();
      store.offline = false;
      berhasil = true;
      if (!res.sama && res.data) {
        if (store.pending.size) {
          store.perluSinkron = true; // tunggu aksi yang sedang dikirim selesai dulu
        } else if (store.generasi !== generasiAwal) {
          jadwalkanSinkron(300);     // ada aksi selesai selama menunggu: data ini sudah usang, ambil lagi
        } else {
          terapkanDataServer(res.versi, res.data);
          renderUlangAman();
          if (typeof jadwalkanPdfAntrean === 'function') jadwalkanPdfAntrean();
        }
      }
      if (opsi.umumkan) showToast('Data sudah yang terbaru.');
    } catch (err) {
      store.offline = true;
      if (!store.siap) {
        store.galatAwal = err.message;
        renderUlangAman();
      } else if (opsi.umumkan) {
        showToast('Gagal memuat data terbaru: ' + err.message, 'error', 6000);
      }
    } finally {
      clearTimeout(timerIndikator);
      store.sedangSinkron = false;
      store.sinkronLama = false;
      _janjiSinkron = null;
      aturIndikatorSinkron();
    }
    return berhasil;
  })();
  return _janjiSinkron;
}

function jadwalkanSinkron(ms) {
  clearTimeout(_timerSinkronTunda);
  _timerSinkronTunda = setTimeout(() => sinkronkan(), ms);
}

function cekDataBaruBilaPerlu(jeda) {
  if (!currentUser) return;
  if (Date.now() - store.terakhirSinkron > jeda) sinkronkan();
}

setInterval(() => {
  if (currentUser && (typeof document === 'undefined' || document.visibilityState !== 'hidden')) sinkronkan();
}, JEDA_CEK_BERKALA);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') cekDataBaruBilaPerlu(15000); });
window.addEventListener('focus', () => cekDataBaruBilaPerlu(15000));
window.addEventListener('online', () => { if (currentUser) sinkronkan(); });
window.addEventListener('beforeunload', (e) => {
  if (store.pending.size) { e.preventDefault(); e.returnValue = ''; }
});

// ---------------- indikator di bilah atas ----------------
function aturIndikatorSinkron() {
  const el = typeof document !== 'undefined' && document.getElementById('syncPill');
  if (!el) return;
  let kelas, teks, judul;
  const sinkronLama = store.sedangSinkron && store.sinkronLama;
  if (store.pending.size) { kelas = 'sync-simpan'; teks = '⏳ Menyimpan…'; judul = 'Perubahan sedang dikirim ke server'; }
  else if (sinkronLama) { kelas = 'sync-jalan'; teks = '⟳ Memperbarui…'; judul = 'Memeriksa data terbaru'; }
  else if (store.offline) { kelas = 'sync-offline'; teks = '⚠ Offline'; judul = 'Tidak terhubung ke server. Klik untuk mencoba lagi.'; }
  else { kelas = 'sync-ok'; teks = '✓ Tersinkron'; judul = 'Data sudah terbaru. Klik untuk memuat ulang dari server.'; }
  el.className = 'sync-pill ' + kelas;
  el.innerHTML = '<span class="sync-teks">' + teks + '</span>';
  el.title = judul;
}

// ---------------- kueri data (sama dengan aturan di server) ----------------
function kodeBidangAtasanMengetahui(email) {
  return store.bidang.filter(b => normTeks(b.AtasanMengetahuiEmail) === normTeks(email)).map(b => String(b.KodeBidang).trim());
}

// Nota yang relevan untuk pengguna (dasar dashboard)
function notaRelevanSaya() {
  const role = currentUser.role;
  if (role === 'Admin' || role === 'Atasan Menyetujui' || role === 'Perlengkapan') return store.nota.slice();
  if (role === 'Pemohon') return store.nota.filter(n => normTeks(n.PemohonEmail) === normTeks(currentUser.email));
  if (role === 'Atasan Mengetahui') {
    const kode = kodeBidangAtasanMengetahui(currentUser.email);
    return store.nota.filter(n => kode.includes(String(n.BidangKode).trim()));
  }
  return [];
}

function urutkanTerbaru(list, kolom) {
  return list.map(n => [waktuMs(n[kolom || 'CreatedAt']), n]).sort((a, b) => b[0] - a[0]).map(x => x[1]);
}

// Daftar nota untuk halaman daftar (filter status + pencarian)
function daftarNotaSaya(status, cari) {
  let list = notaRelevanSaya();
  if (currentUser.role === 'Perlengkapan') list = list.filter(n => n.Status !== 'Diajukan'); // mulai dari tahap Diketahui
  if (status && status !== 'Semua') list = list.filter(n => n.Status === status);
  const q = normTeks(cari);
  if (q) {
    list = list.filter(n => normTeks(n.NoNota).includes(q) || normTeks(n.PemohonNama).includes(q) || normTeks(n.BidangNama).includes(q)
      || (store.idx.items.get(String(n.NoNota)) || []).some(i => normTeks(i.NamaBarang).includes(q)));
  }
  return urutkanTerbaru(list);
}

function hitungDashboard() {
  const role = currentUser.role;
  const relevan = notaRelevanSaya();
  const kini = new Date();
  const bulanIni = relevan.filter(n => {
    const d = new Date(waktuMs(n.Tanggal));
    return waktuMs(n.Tanggal) && d.getMonth() === kini.getMonth() && d.getFullYear() === kini.getFullYear();
  });
  const stageCount = {};
  TAHAP.forEach(t => { stageCount[t.status] = 0; });
  relevan.forEach(n => { if (stageCount.hasOwnProperty(n.Status)) stageCount[n.Status]++; });

  let butuhTindakan;
  if (role === 'Atasan Mengetahui') butuhTindakan = relevan.filter(n => n.Status === 'Diajukan').length;
  else if (role === 'Perlengkapan') butuhTindakan = store.nota.filter(n => n.Status === 'Diketahui' || n.Status === 'Diproses').length;
  else if (role === 'Atasan Menyetujui') butuhTindakan = store.nota.filter(n => n.Status === ST_DIPERIKSA).length;
  else if (role === 'Pemohon') butuhTindakan = relevan.filter(n => n.Status === 'Diproses').length;
  else butuhTindakan = relevan.filter(n => n.Status === 'Ditolak').length;

  const selesai = relevan.filter(n => n.Status === 'Selesai').length;
  return {
    stats: {
      totalNotaBulanIni: bulanIni.length,
      selesaiBulanIni: bulanIni.filter(n => n.Status === 'Selesai').length,
      butuhTindakan: butuhTindakan,
      realisasiPersen: relevan.length ? Math.round((selesai / relevan.length) * 1000) / 10 : 0
    },
    stageCount: stageCount,
    notaTerbaru: urutkanTerbaru(relevan).slice(0, 5)
  };
}

function hitungLaporan() {
  const list = store.nota;
  const statusCount = {};
  list.forEach(n => { statusCount[n.Status] = (statusCount[n.Status] || 0) + 1; });
  const ada = new Set(list.map(n => String(n.NoNota)));
  const jumlah = {};
  store.items.forEach(i => {
    if (!ada.has(String(i.NoNota))) return;
    jumlah[i.NamaBarang] = (jumlah[i.NamaBarang] || 0) + Number(i.JumlahDiminta || 0);
  });
  const barangTerbanyak = Object.entries(jumlah).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([nama, j]) => ({ nama, jumlah: j }));
  return { totalNota: list.length, statusCount, barangTerbanyak, daftarNota: urutkanTerbaru(list, 'Tanggal') };
}

// ---------------- stok barang (aturan sama dengan server, MasterData.gs) ----------------
// Stok     = jumlah di gudang (kosong = belum diatur, permintaan tidak dibatasi)
// Dipesan  = jumlah pada nota yang masih berjalan (sebelum Selesai / Ditolak)
// Tersedia = Stok - Dipesan  -> batas maksimal permintaan
const STATUS_NOTA_BERJALAN = ['Diajukan', 'Diketahui', 'Stok Barang Sudah Diperiksa', 'Diproses'];
const BATAS_RIWAYAT_STOK = 300;

function nilaiStok(v) {
  if (v === undefined || v === null || String(v).trim() === '') return null;
  const n = Number(v);
  return isFinite(n) ? Math.max(0, Math.floor(n)) : null;
}

// Map: nama barang (huruf kecil) -> jumlah dipesan di nota berjalan
function hitungStokDipesan(kecualiNoNota) {
  const hasil = new Map();
  store.items.forEach(it => {
    const no = String(it.NoNota);
    if (kecualiNoNota && no === String(kecualiNoNota)) return;
    const n = store.idx.nota.get(no);
    if (!n || !STATUS_NOTA_BERJALAN.includes(n.Status)) return;
    const sudahDiperiksa = String(it.StatusItem || '').trim() !== '';
    const jumlah = Number(sudahDiperiksa ? it.JumlahDisetujui : it.JumlahDiminta) || 0;
    const k = normTeks(it.NamaBarang);
    hasil.set(k, (hasil.get(k) || 0) + jumlah);
  });
  return hasil;
}

// Map: nama barang (huruf kecil) -> { barang, stok (null = belum diatur), dipesan, tersedia }
function petaStokBarang(kecualiNoNota) {
  const dipesan = hitungStokDipesan(kecualiNoNota);
  const peta = new Map();
  store.barang.forEach(b => {
    const k = normTeks(b.NamaBarang);
    if (!k || peta.has(k)) return;
    const stok = nilaiStok(b.Stok);
    const d = dipesan.get(k) || 0;
    peta.set(k, { barang: b, stok, dipesan: d, tersedia: stok === null ? null : Math.max(0, stok - d) });
  });
  return peta;
}

function riwayatStokLokal(kunci, entri) {
  store.logStok.push(Object.assign({ Waktu: sekarangWib(), NoNota: '', Oleh: currentUser.nama, Keterangan: '', _lokal: kunci }, entri));
}

function pegawaiDenganEmail(email) {
  return store.pegawai.find(p => normTeks(p.Email) === normTeks(email)) || null;
}

function detailNotaLokal(noNota) {
  const n = store.idx.nota.get(String(noNota));
  if (!n) return null;
  const pemohon = pegawaiDenganEmail(n.PemohonEmail);
  const saya = pegawaiDenganEmail(currentUser.email);
  return {
    nota: n,
    items: store.idx.items.get(String(noNota)) || [],
    log: store.idx.log.get(String(noNota)) || [],
    pemohonJabatan: pemohon ? (pemohon.Jabatan || '') : '',
    viewer: saya ? { nama: saya.Nama, nip: saya.NIP, jabatan: saya.Jabatan || '' } : { nama: currentUser.nama, nip: currentUser.nip, jabatan: '' }
  };
}

function sedangDisimpan(noNota) { return store.pending.has(String(noNota)); }
function notaSementara(noNota) { return String(noNota).indexOf('SEMENTARA-') === 0; }

// ---------------- aksi instan (optimistic UI) ----------------
let _nomorAksi = 0;

// tambahan = tabel lain yang ikut diubah aksi pada satu nota (mis. stok barang saat serah terima)
function ambilSnapshot(kunci, tabel, tambahan) {
  if (tabel) {
    const s = {};
    tabel.forEach(t => { s[t] = salinDalam(store[t]); });
    return { tabel: s };
  }
  const no = String(kunci);
  const snap = {
    nota: salinDalam(store.idx.nota.get(no)),
    items: salinDalam(store.idx.items.get(no) || []),
    log: salinDalam(store.idx.log.get(no) || [])
  };
  if (tambahan && tambahan.length) {
    snap.tambahan = {};
    tambahan.forEach(t => { snap.tambahan[t] = salinDalam(store[t]); });
  }
  return snap;
}

function pulihkanSnapshot(kunci, snap) {
  if (snap.tabel) {
    Object.keys(snap.tabel).forEach(t => { store[t] = snap.tabel[t]; });
  } else {
    if (snap.tambahan) Object.keys(snap.tambahan).forEach(t => { store[t] = snap.tambahan[t]; });
    const no = String(kunci);
    const sisaNota = store.nota.filter(n => String(n.NoNota) !== no);
    const idxAsli = store.nota.findIndex(n => String(n.NoNota) === no);
    if (snap.nota) sisaNota.splice(idxAsli >= 0 ? idxAsli : sisaNota.length, 0, snap.nota);
    store.nota = sisaNota;
    store.items = store.items.filter(i => String(i.NoNota) !== no).concat(snap.items || []);
    store.log = store.log.filter(l => String(l.NoNota) !== no).concat(snap.log || []);
  }
  bangunIndeks();
}

function logLokal(noNota, aksi, keterangan) {
  store.log.push({ Timestamp: sekarangWib(), NoNota: noNota, Aktor: currentUser.nama, Aksi: aksi, Keterangan: keterangan, _lokal: true });
}

// Terapkan data resmi dari server (balasan aksi) ke data lokal
function terapkanPaket(res, kunciLokal) {
  const p = res && res.paket;
  // Nota baru tanpa paket: setidaknya ganti nomor sementara dengan nomor resmi
  if (!p && res && res.noNota && kunciLokal && notaSementara(kunciLokal)) gantiNomorLokal(String(kunciLokal), String(res.noNota));
  if (p) {
    if (p.dihapus) hapusNotaLokal(p.dihapus);
    if (p.noNota) {
      const no = String(p.noNota);
      if (kunciLokal && String(kunciLokal) !== no && notaSementara(kunciLokal)) gantiNomorLokal(String(kunciLokal), no);
      if (p.nota) {
        const i = store.nota.findIndex(n => String(n.NoNota) === no);
        if (i >= 0) store.nota[i] = p.nota; else store.nota.push(p.nota);
      }
      if (p.items) store.items = store.items.filter(it => String(it.NoNota) !== no).concat(p.items);
      if (p.logBaru) store.log = store.log.filter(l => !(l._lokal && String(l.NoNota) === no)).concat(p.logBaru);
    }
    if (p.master) Object.keys(p.master).forEach(j => { if (Array.isArray(p.master[j])) store[j] = p.master[j]; });
    if (p.panduan) store.panduan = p.panduan;
    if (Array.isArray(p.logStokBaru)) {
      store.logStok = store.logStok.filter(l => !(kunciLokal && l._lokal === String(kunciLokal))).concat(p.logStokBaru);
      if (store.logStok.length > BATAS_RIWAYAT_STOK) store.logStok = store.logStok.slice(-BATAS_RIWAYAT_STOK);
    }
  }
  store.generasi++;
  bangunIndeks();
  if (res && res.versi) {
    // Bila versi sebelum aksi = versi di browser DAN data resmi (paket) ikut diterima,
    // data lokal kini persis sama dengan server. Selain itu: unduh ulang data lengkap.
    if (p && res.versiSebelum && res.versiSebelum === store.versi) store.versi = res.versi;
    else store.perluSinkron = true;
  }
}

function hapusNotaLokal(noNota) {
  const no = String(noNota);
  store.nota = store.nota.filter(n => String(n.NoNota) !== no);
  store.items = store.items.filter(i => String(i.NoNota) !== no);
  store.log = store.log.filter(l => String(l.NoNota) !== no);
  bangunIndeks();
}

// Nota sementara (baru diajukan) mendapat nomor resmi dari server
function gantiNomorLokal(lama, baru) {
  store.nota.forEach(n => { if (String(n.NoNota) === lama) n.NoNota = baru; });
  store.items.forEach(i => { if (String(i.NoNota) === lama) i.NoNota = baru; });
  store.log.forEach(l => { if (String(l.NoNota) === lama) l.NoNota = baru; });
  const hashLama = '#/detail/' + encodeURIComponent(lama);
  if (location.hash === hashLama) {
    try { history.replaceState(null, '', '#/detail/' + encodeURIComponent(baru)); } catch (err) { location.replace('#/detail/' + encodeURIComponent(baru)); }
  }
}

function selesaiPending() {
  aturIndikatorSinkron();
  if (store.pending.size === 0) {
    simpanDataLokal();
    if (store.perluSinkron) { store.perluSinkron = false; jadwalkanSinkron(300); }
  }
  renderUlangAman();
}

// Jalankan aksi secara instan:
//   ubahLokal()  -> ubah data di browser (langsung tampil)
//   aksi/data    -> dikirim ke server di latar belakang
//   bila server menolak, data dikembalikan seperti semula
// opsi = { kunci, tabel, tambahan, aksi, data, ubahLokal(kunci), pesan, sesudahBerhasil, sesudahGagal, pindahKe }
function kirimInstan(opsi) {
  const kunci = String(opsi.kunci || ('aksi-' + (++_nomorAksi)));
  const snap = ambilSnapshot(kunci, opsi.tabel, opsi.tambahan);
  try {
    opsi.ubahLokal(kunci);
  } catch (err) {
    pulihkanSnapshot(kunci, snap);
    showToast('Terjadi kesalahan tampilan: ' + err.message, 'error');
    return Promise.reject(err);
  }
  bangunIndeks();
  store.generasi++;
  store.pending.set(kunci, { aksi: opsi.aksi, mulai: Date.now() });
  aturIndikatorSinkron();
  if (opsi.pesan) showToast(opsi.pesan);
  if (opsi.pindahKe && location.hash !== opsi.pindahKe) location.hash = opsi.pindahKe;
  else renderUlangAman(true);

  const pemilik = normTeks(currentUser && currentUser.email);
  const masihPemilik = () => !!currentUser && normTeks(currentUser.email) === pemilik;
  return apiPost(opsi.aksi, opsi.data, { diam: true, timeout: 120000 }).then(res => {
    if (!masihPemilik()) return res; // jawaban datang setelah keluar/ganti akun: abaikan
    store.pending.delete(kunci);
    terapkanPaket(res, kunci);
    if (opsi.sesudahBerhasil) opsi.sesudahBerhasil(res);
    selesaiPending();
    return res;
  }, err => {
    if (!masihPemilik()) throw err;
    store.pending.delete(kunci);
    pulihkanSnapshot(kunci, snap);
    // Pengembalian bisa ikut menghapus perubahan lain yang sudah tersimpan
    // (mis. dua aksi Data Master berturut-turut), jadi unduh ulang data lengkap.
    store.versi = '';
    store.perluSinkron = true;
    if (err.dariServer) {
      showToast('Gagal disimpan: ' + err.message + ' Perubahan dibatalkan.', 'error', 7000);
    } else {
      showToast('Koneksi ke server terputus sebelum ada jawaban. Data dimuat ulang untuk memastikan apakah perubahan sudah tersimpan.', 'error', 8000);
    }
    if (opsi.sesudahGagal) opsi.sesudahGagal(err);
    selesaiPending();
    throw err;
  });
}

// Draf nota yang gagal terkirim (supaya isian tidak hilang)
function simpanDrafNota(draf) {
  try { localStorage.setItem(KUNCI_DRAF_NOTA + normTeks(currentUser.email), JSON.stringify(draf)); } catch (err) { /* abaikan */ }
}
function ambilDrafNota() {
  try { return JSON.parse(localStorage.getItem(KUNCI_DRAF_NOTA + normTeks(currentUser.email)) || 'null'); } catch (err) { return null; }
}
function hapusDrafNota() {
  try { localStorage.removeItem(KUNCI_DRAF_NOTA + normTeks(currentUser.email)); } catch (err) { /* abaikan */ }
}

// ---------------- PDF: disiapkan lebih awal & disimpan di browser ----------------
// - Saat detail nota dibuka, PDF disiapkan di latar belakang (siapkanPdfLatar),
//   jadi ketika tombol "Lihat PDF" / "Unduh PDF" diklik biasanya sudah siap.
// - PDF disimpan di memori + IndexedDB browser per isi nota ("tanda"), sehingga
//   membuka PDF yang sama lagi - bahkan setelah halaman dimuat ulang - langsung tampil.
//   Bila isi nota berubah (mis. sudah diparaf), tandanya berubah dan PDF dibuat ulang.
// - Permintaan yang sedang berjalan dipakai bersama (tidak dobel ke server).
const cachePdfNota = new Map();   // noNota -> { tanda, base64, filename }
const pdfSedangDibuat = new Map(); // noNota -> { tanda, janji, latar }
const NAMA_DB_PDF = 'sinomer_pdf';
const BATAS_PDF_TERSIMPAN = 60;
const UMUR_PDF_TERSIMPAN = 14 * 24 * 3600 * 1000; // PDF tersimpan dipakai paling lama 14 hari
// Versi tata letak PDF. Nilai sebenarnya dikirim server (data awal & jawaban PDF);
// ini hanya cadangan bila server belum mengirimnya.
const VERSI_PDF_BROWSER = 'pdf-v6';
let _janjiDbPdf = null;

// Dua tempat: 'pdf' (isi berkas) dan 'meta' (waktu simpan saja, kecil) - untuk membuang yang terlama
function bukaDbPdf() {
  if (_janjiDbPdf) return _janjiDbPdf;
  _janjiDbPdf = new Promise(resolve => {
    try {
      if (typeof indexedDB === 'undefined' || !indexedDB) return resolve(null);
      const req = indexedDB.open(NAMA_DB_PDF, 2);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('pdf')) db.createObjectStore('pdf');
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch (err) { resolve(null); }
  });
  return _janjiDbPdf;
}

function kunciDbPdf(email, noNota) { return normTeks(email) + '|' + String(noNota); }

async function dbPdfAmbil(email, noNota) {
  const db = await bukaDbPdf();
  if (!db) return null;
  return new Promise(resolve => {
    try {
      const req = db.transaction('pdf', 'readonly').objectStore('pdf').get(kunciDbPdf(email, noNota));
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    } catch (err) { resolve(null); }
  });
}

async function dbPdfSimpan(email, noNota, data) {
  const db = await bukaDbPdf();
  if (!db) return;
  try {
    const tx = db.transaction(['pdf', 'meta'], 'readwrite');
    const pdf = tx.objectStore('pdf'), meta = tx.objectStore('meta');
    const kunci = kunciDbPdf(email, noNota);
    const waktu = Date.now();
    pdf.put(Object.assign({ waktu }, data), kunci);
    meta.put(waktu, kunci);
    // simpan paling banyak BATAS_PDF_TERSIMPAN berkas; yang terlama dibuang (hanya membaca data kecil di 'meta')
    const semuaKunci = meta.getAllKeys(), semuaWaktu = meta.getAll();
    semuaWaktu.onsuccess = () => {
      const jumlah = semuaWaktu.result.length;
      if (jumlah <= BATAS_PDF_TERSIMPAN) return;
      semuaWaktu.result.map((w, i) => [w, semuaKunci.result[i]]).sort((a, b) => a[0] - b[0])
        .slice(0, jumlah - BATAS_PDF_TERSIMPAN).forEach(([, k]) => { pdf.delete(k); meta.delete(k); });
    };
  } catch (err) { /* penyimpanan penuh / tidak tersedia: tetap jalan dari memori */ }
}

// Hapus semua PDF tersimpan (dipanggil saat keluar sistem - aman untuk komputer bersama)
function hapusPdfTersimpan() {
  cachePdfNota.clear();
  pdfSedangDibuat.clear();
  bukaDbPdf().then(db => {
    if (!db) return;
    try {
      const tx = db.transaction(['pdf', 'meta'], 'readwrite');
      tx.objectStore('pdf').clear();
      tx.objectStore('meta').clear();
    } catch (err) { /* abaikan */ }
  });
}

function tandaPdfNota(noNota) {
  const no = String(noNota);
  const bersih = (o) => { const x = {}; Object.keys(o || {}).sort().forEach(k => { if (k[0] !== '_') x[k] = o[k]; }); return x; };
  const items = (store.idx.items.get(no) || []).map(bersih).sort((a, b) => String(a.ID).localeCompare(String(b.ID)));
  return (store.versiPdf || VERSI_PDF_BROWSER) + JSON.stringify([bersih(store.idx.nota.get(no)), items]);
}

// PDF yang sudah siap untuk isi nota saat ini (tanpa menunggu), atau null
function pdfSiapSekarang(noNota) {
  const ada = cachePdfNota.get(String(noNota));
  return ada && ada.tanda === tandaPdfNota(noNota) ? ada : null;
}

// opsi.latar = true: disiapkan sebelum diklik. Server boleh menjawab "belum ada"
// (mis. batas harian pembuatan PDF latar tercapai); saat diklik, PDF tetap dibuat.
function ambilPdfNota(noNota, opsi) {
  opsi = opsi || {};
  const no = String(noNota);
  const latar = !!opsi.latar;
  const tanda = tandaPdfNota(no);
  const siap = cachePdfNota.get(no);
  if (siap && siap.tanda === tanda) return Promise.resolve(siap);
  const jalan = pdfSedangDibuat.get(no);
  if (jalan && jalan.tanda === tanda) {
    // klik pengguna saat persiapan latar masih berjalan: pakai hasilnya, atau buat sendiri bila server belum membuatnya
    if (jalan.latar && !latar) return jalan.janji.catch(err => { if (err && err.belumAda) return ambilPdfNota(no); throw err; });
    return jalan.janji;
  }

  const pemilik = normTeks(currentUser && currentUser.email);
  const masihPemilik = () => !!currentUser && normTeks(currentUser.email) === pemilik;
  const janji = (async () => {
    const tersimpan = await dbPdfAmbil(pemilik, no);
    if (tersimpan && tersimpan.tanda === tanda && tersimpan.base64 && Date.now() - (tersimpan.waktu || 0) < UMUR_PDF_TERSIMPAN) {
      if (!masihPemilik()) throw new Error('Sesi sudah berakhir.');
      const hasil = { tanda, base64: tersimpan.base64, filename: tersimpan.filename };
      cachePdfNota.set(no, hasil);
      return hasil;
    }
    const params = { noNota: no };
    if (latar) params.latar = '1';
    const pdf = await apiGet('getPdf', params, { diam: true, timeout: 120000 });
    if (!masihPemilik()) throw new Error('Sesi sudah berakhir.');
    if (pdf.belumAda) { const e = new Error('PDF belum dibuat.'); e.belumAda = true; throw e; }
    if (pdf.versiPdf && pdf.versiPdf !== (store.versiPdf || VERSI_PDF_BROWSER)) {
      store.versiPdf = pdf.versiPdf; // tata letak PDF di server sudah diperbarui
    }
    const tandaKini = tandaPdfNota(no);
    const hasil = { tanda: tandaKini, base64: pdf.base64, filename: pdf.filename };
    // QR gagal dimuat (layanan QR gangguan) atau isi nota berubah selama menunggu: jangan disimpan
    const isiSama = tandaKini.slice(tandaKini.indexOf('[')) === tanda.slice(tanda.indexOf('['));
    if (!pdf.sementara && store.idx.nota.get(no) && isiSama) {
      cachePdfNota.set(no, hasil);
      dbPdfSimpan(pemilik, no, hasil);
    }
    return hasil;
  })();
  pdfSedangDibuat.set(no, { tanda, janji, latar });
  const selesai = () => { const j = pdfSedangDibuat.get(no); if (j && j.janji === janji) pdfSedangDibuat.delete(no); };
  janji.then(selesai, selesai);
  return janji;
}

// Siapkan PDF di latar belakang (galat diabaikan; akan dicoba lagi saat tombol diklik)
function siapkanPdfLatar(noNota) {
  const no = String(noNota);
  if (!currentUser || !store.idx.nota.get(no) || notaSementara(no) || sedangDisimpan(no)) return Promise.resolve();
  try { if (navigator.connection && navigator.connection.saveData) return Promise.resolve(); } catch (err) { /* abaikan */ }
  return ambilPdfNota(no, { latar: true }).catch(() => {});
}

// untuk pengujian otomatis
window.__sinomer = { store, sinkronkan, terapkanDataServer, cachePdfNota, pdfSedangDibuat };
window.sinkronkan = sinkronkan;
