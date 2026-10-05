// ============================================================
// SI-NOMER — Aplikasi Utama (SPA vanilla JS, hash router)
// ============================================================

const root = document.getElementById('app');

// Alur 5 tahap. "status" = nilai persis yang tersimpan di database,
// "label" = teks pendek untuk tampilan pelacak.
const ST_DIPERIKSA = 'Stok Barang Sudah Diperiksa';
const TAHAP = [
  { status: 'Diajukan', label: 'Diajukan', icon: '📄', ket: 'Pemohon mengajukan nota' },
  { status: 'Diketahui', label: 'Diketahui', icon: '✍️', ket: 'Diparaf Atasan Mengetahui (QR kiri)' },
  { status: ST_DIPERIKSA, label: 'Stok Diperiksa', icon: '📦', ket: 'Perlengkapan memeriksa stok tiap barang' },
  { status: 'Diproses', label: 'Diproses', icon: '🚚', ket: 'Disetujui Sekretaris (QR kanan), barang siap diambil' },
  { status: 'Selesai', label: 'Selesai', icon: '✔️', ket: 'Berita Acara Serah Terima terbit' }
];
const BULAN_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const HARI_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

// Tanggal dari server bisa berupa ISO ("2026-09-15T03:45:54.000Z") atau
// teks "2026-09-15 10:45:54" (WIB). Tampilkan rapi: "15 September 2026, 10:45 WIB".
function parseTgl(v) {
  if (!v) return null;
  let s = v;
  if (typeof s === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(s.trim())) s = s.trim().replace(' ', 'T') + '+07:00';
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
function fmtTgl(v, withTime = true) {
  const d = parseTgl(v);
  if (!d) return v ? String(v) : '-';
  const tgl = d.getDate() + ' ' + BULAN_ID[d.getMonth()] + ' ' + d.getFullYear();
  return withTime ? tgl + ', ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ' WIB' : tgl;
}

const NAV_ITEMS = {
  Admin: [
    ['#/dashboard', '🏠 Dashboard / Beranda'],
    ['#/nota-saya', '📄 Semua Nota'],
    ['#/stok-barang', '🗃️ Stok Barang'],
    ['#/laporan', '📊 Laporan & Rekapitulasi'],
    ['#/data-master', '⚙️ Data Master']
  ],
  Pemohon: [
    ['#/dashboard', '🏠 Dashboard / Beranda'],
    ['#/buat-nota', '➕ Buat Nota Baru'],
    ['#/nota-saya', '📄 Nota Saya'],
    ['#/stok-barang', '🗃️ Stok Barang'],
    ['#/laporan', '📊 Laporan & Rekap']
  ],
  'Atasan Mengetahui': [
    ['#/dashboard', '🏠 Dashboard / Beranda'],
    ['#/menunggu-paraf', '✍️ Menunggu Paraf'],
    ['#/stok-barang', '🗃️ Stok Barang'],
    ['#/laporan', '📊 Laporan & Rekap']
  ],
  'Atasan Menyetujui': [
    ['#/dashboard', '🏠 Dashboard / Beranda'],
    ['#/tinjau-persetujuan', '🔍 Tinjau Persetujuan'],
    ['#/stok-barang', '🗃️ Stok Barang'],
    ['#/laporan', '📊 Laporan & Rekap']
  ],
  Perlengkapan: [
    ['#/dashboard', '🏠 Dashboard / Beranda'],
    ['#/periksa-stok', '📦 Periksa Stok'],
    ['#/serah-terima', '🤝 Serah Terima'],
    ['#/stok-barang', '🗃️ Stok Barang'],
    ['#/data-master', '🗂️ Master Barang'],
    ['#/laporan', '📊 Laporan & Rekap']
  ]
};
// Menu "Panduan" dan "Ganti Password" tersedia untuk SEMUA role, ditambahkan otomatis di akhir.
Object.keys(NAV_ITEMS).forEach(role => {
  NAV_ITEMS[role].push(['#/panduan', '📚 Panduan']);
  NAV_ITEMS[role].push(['#/ganti-password', '🔑 Ganti Password']);
});

function initials(nama) {
  return (nama || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

// Tombol mata — toggle tampil/sembunyi teks password. Dipakai di semua
// field password (login, ganti password, reset password admin).
window.togglePasswordVisibility = function (btn) {
  const input = btn.previousElementSibling;
  if (!input) return;
  if (input.type === 'password') { input.type = 'text'; btn.textContent = '🙈'; }
  else { input.type = 'password'; btn.textContent = '👁️'; }
};

// Ubah nama bidang (HURUF BESAR SEMUA di Master_Bidang) menjadi format
// jabatan rapi: "Kepala Subbagian Keuangan, Perlengkapan, dan PBMD".
// Setara dengan formatJabatanKepalaBidang di backend (PdfQr.gs), supaya
// tampilan web dan PDF konsisten.
function formatJabatanKepalaBidang(namaBidang) {
  if (!namaBidang) return 'Kepala Seksi Terkait';
  const kataSambung = ['dan', 'di', 'ke', 'dari', 'yang', 'dengan', 'untuk', 'atau', 'pada'];
  const words = namaBidang.toLowerCase().split(' ');
  const hasil = words.map((w, idx) => {
    const bersih = w.replace(/[,.]/g, '');
    if (!bersih) return w;
    if (bersih.length <= 5 && !/[aeiou]/i.test(bersih)) return w.toUpperCase();
    if (idx !== 0 && kataSambung.includes(bersih)) return w;
    return w.charAt(0).toUpperCase() + w.slice(1);
  });
  return 'Kepala ' + hasil.join(' ');
}

function statusBadge(status) {
  const map = { Diajukan: 'badge-diajukan', Diketahui: 'badge-diketahui', [ST_DIPERIKSA]: 'badge-diperiksa', Disetujui: 'badge-disetujui', Diproses: 'badge-diproses', Selesai: 'badge-selesai', Ditolak: 'badge-ditolak' };
  return `<span class="badge ${map[status] || ''}">${status}</span>`;
}

// ------------------------------------------------------------
// ROUTER — semua halaman digambar dari data lokal (store), tanpa
// menunggu server. Pemeriksaan data baru berjalan di latar belakang.
// router({ ulang: true }) = gambar ulang halaman yang sama (posisi gulir tetap).
// ------------------------------------------------------------
let _tandaShell = '';
let halamanKotor = false; // pengguna sedang mengisi form di halaman ini
const RUTE_DAFTAR = ['#/nota-saya', '#/menunggu-paraf', '#/tinjau-persetujuan', '#/periksa-stok', '#/serah-terima'];
const filterStatusAktif = {};

function router(opsi) {
  opsi = opsi || {};
  const hash = location.hash || '#/dashboard';
  if (!isLoggedIn() && hash !== '#/login') { location.hash = '#/login'; return; }
  if (isLoggedIn() && hash === '#/login') { location.hash = '#/dashboard'; return; }

  if (hash === '#/login') { _tandaShell = ''; return renderLogin(); }
  if (hash === '#/proses-barang') { location.hash = '#/serah-terima'; return; } // alamat menu lama

  const tanda = [currentUser.email, currentUser.role, currentUser.nama].join('|');
  if (_tandaShell !== tanda || !document.getElementById('page-content')) {
    renderShell();
    _tandaShell = tanda;
  }
  const content = document.getElementById('page-content');
  const posisiGulir = opsi.ulang ? (window.scrollY || 0) : 0;
  if (!opsi.ulang) {
    delete filterStatusAktif[hash];
    cekDataBaruBilaPerlu(JEDA_CEK_SAAT_PINDAH);
  }
  halamanKotor = false;

  if (!store.siap) {
    content.innerHTML = store.galatAwal ? htmlGagalMuat() : htmlKerangka();
    document.getElementById('cobaMuatLagi')?.addEventListener('click', () => { store.galatAwal = ''; router({ ulang: true }); sinkronkan(); });
    highlightActiveNav();
    return;
  }

  try {
    if (hash === '#/dashboard') renderDashboard(content);
    else if (hash === '#/buat-nota') renderBuatNota(content);
    else if (hash === '#/nota-saya') renderNotaList(content, {});
    else if (hash === '#/menunggu-paraf') renderNotaList(content, { status: 'Diajukan', title: 'Menunggu Paraf Saya', actionMode: 'mengetahui' });
    else if (hash === '#/tinjau-persetujuan') renderNotaList(content, { status: ST_DIPERIKSA, title: 'Tinjau Persetujuan' });
    else if (hash === '#/periksa-stok') renderNotaList(content, { status: 'Diketahui', title: 'Periksa Stok Barang' });
    else if (hash === '#/serah-terima') renderNotaList(content, { status: 'Diproses', title: 'Serah Terima Barang' });
    else if (hash.startsWith('#/detail/')) renderDetail(content, decodeURIComponent(hash.split('#/detail/')[1]));
    else if (hash.startsWith('#/edit-nota/')) renderBuatNota(content, decodeURIComponent(hash.split('#/edit-nota/')[1]));
    else if (hash === '#/laporan') renderLaporan(content);
    else if (hash === '#/stok-barang') renderStokBarang(content);
    else if (hash === '#/data-master') renderDataMaster(content);
    else if (hash === '#/ganti-password') renderGantiPassword(content);
    else if (hash === '#/panduan') renderPanduan(content);
    else content.innerHTML = '<div class="empty-state">Halaman tidak ditemukan.</div>';
  } catch (err) {
    content.innerHTML = `<div class="empty-state">Gagal menampilkan halaman: ${esc(err.message)}</div>`;
    if (window.console) console.error(err);
  }

  highlightActiveNav();
  if (!opsi.ulang) {
    content.classList.remove('page-enter');
    void content.offsetWidth; // mulai ulang animasi masuk
    content.classList.add('page-enter');
    gulirKe(0);
  } else {
    gulirKe(posisiGulir);
  }
}

function gulirKe(y) {
  try { if (Math.abs((window.scrollY || 0) - y) > 1) window.scrollTo(0, y); } catch (err) { /* abaikan */ }
}

// Gambar ulang halaman aktif setelah data berubah — kecuali pengguna sedang
// mengisi form (isiannya tidak boleh hilang). paksa = true setelah aksi pengguna sendiri.
function renderUlangAman(paksa) {
  if (!currentUser || !document.getElementById('page-content')) return;
  const hash = location.hash || '#/dashboard';
  if (hash === '#/login') return;
  const masihKerangka = !!document.getElementById('kerangkaMuat') || !!document.getElementById('gagalMuat');
  if (!paksa && !masihKerangka) {
    if (document.getElementById('modalBackdrop')) return;
    if (/^#\/(buat-nota|edit-nota\/|ganti-password)/.test(hash)) return;
    if (halamanKotor) return;
  }
  router({ ulang: true });
}

window.addEventListener('hashchange', () => router());
window.addEventListener('DOMContentLoaded', () => {
  restoreSession();
  if (isLoggedIn()) muatDataLokal(); // tampil seketika dari data tersimpan
  router();
  if (isLoggedIn()) sinkronkan();    // lalu periksa data terbaru di latar belakang
});

function highlightActiveNav() {
  document.querySelectorAll('.nav-item, .mobile-nav a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === location.hash));
}

// Kerangka halaman selama data pertama kali dimuat
function htmlKerangka() {
  const baris = '<div class="skeleton skeleton-line"></div>';
  return `<div id="kerangkaMuat" aria-busy="true">
    <div class="skeleton skeleton-hero"></div>
    <div class="stats-grid">${'<div class="card"><div class="skeleton skeleton-line" style="width:40%;height:22px;"></div><div class="skeleton skeleton-line" style="width:70%;"></div></div>'.repeat(4)}</div>
    <div class="card">${baris.repeat(6)}</div>
    <div class="text-muted" style="text-align:center;font-size:12.5px;margin-top:1rem;">Menyiapkan data untuk pertama kali… berikutnya halaman akan langsung tampil.</div>
  </div>`;
}

function htmlGagalMuat() {
  const backendLama = /tidak dikenal: getBootstrap/.test(store.galatAwal);
  const pesan = backendLama
    ? 'Kode server (Apps Script) belum diperbarui ke versi cepat. Admin perlu memasang file .gs terbaru lalu membuat versi deployment baru.'
    : store.galatAwal;
  return `<div class="card empty-state" id="gagalMuat">
    <div style="font-size:32px;">📡</div>
    <p><b>Data belum bisa dimuat.</b><br>${esc(pesan)}</p>
    <button class="btn btn-primary" id="cobaMuatLagi">Coba Lagi</button>
  </div>`;
}

// ------------------------------------------------------------
// LOGIN
// ------------------------------------------------------------
function renderLogin() {
  root.innerHTML = `
  <div class="login-wrap">
    <div class="login-card">
      <img src="assets/logo.png" class="login-logo" onerror="this.style.display='none'">
      <h2 style="margin:.25rem 0 0;color:var(--primary);">SI-NOMER</h2>
      <div class="text-muted" style="font-size:12.5px;margin-bottom:1.5rem;">Sistem Nota Permintaan Barang<br>Dinas Perhubungan Provinsi Riau</div>
      <form id="loginForm">
        <div class="field" style="text-align:left;">
          <label>Email</label>
          <input type="email" id="loginEmail" placeholder="nama@email-anda.com" required>
        </div>
        <div class="field" style="text-align:left;">
          <label>Kata Sandi</label>
          <div class="password-wrap">
            <input type="password" id="loginPassword" required>
            <button type="button" class="password-toggle" onclick="togglePasswordVisibility(this)" aria-label="Lihat kata sandi">👁️</button>
          </div>
        </div>
        <button class="btn btn-primary btn-block" type="submit" id="loginBtn">Masuk</button>
      </form>
      <div class="text-muted" style="font-size:11.5px;margin-top:1rem;">Login menggunakan email yang telah didaftarkan Admin di Data Master Pegawai.</div>
    </div>
  </div>`;

  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    btn.disabled = true; btn.textContent = 'Memproses...';
    try {
      await doLogin(document.getElementById('loginEmail').value, document.getElementById('loginPassword').value);
      kosongkanStore();
      const boot = window.paketAwalLogin;
      window.paketAwalLogin = null;
      if (boot && boot.data) {
        terapkanDataServer(boot.versi, boot.data); // data ikut terkirim saat login: dashboard langsung tampil
        store.terakhirSinkron = Date.now();
      } else {
        muatDataLokal();
        sinkronkan();
      }
      showToast('Login berhasil, selamat datang!');
      location.hash = '#/dashboard';
    } catch (err) { /* toast sudah tampil dari apiPost */ }
    btn.disabled = false; btn.textContent = 'Masuk';
  });
}

// ------------------------------------------------------------
// SHELL (sidebar + topbar) — digambar sekali, lalu hanya isi halaman
// yang berganti saat berpindah menu.
// ------------------------------------------------------------
function renderShell() {
  const navItems = NAV_ITEMS[currentUser.role] || [];
  root.innerHTML = `
  <div class="app-shell">
    <aside class="sidebar">
      <div class="sidebar-brand">🔷 SI-NOMER <span class="badge-dishub">DISHUB</span></div>
      <div class="nav-group-label">Menu Navigasi</div>
      ${navItems.map(([href, label]) => `<a class="nav-item" href="${href}">${label}</a>`).join('')}
      <div class="sidebar-footer">
        <button class="btn-logout" id="logoutBtn">Keluar Sistem</button>
      </div>
    </aside>
    <div class="main-area">
      <div class="topbar">
        <div class="topbar-search"><span>🔍</span><input placeholder="Cari no. nota atau barang..." id="globalSearch"></div>
        <button type="button" class="sync-pill sync-ok" id="syncPill"><span class="sync-teks">✓ Tersinkron</span></button>
        <div class="topbar-user">
          <div style="text-align:right;">
            <div style="font-weight:600;font-size:13px;">${currentUser.nama}</div>
            <div class="text-muted" style="font-size:11px;">${currentUser.role}</div>
          </div>
          <div class="avatar">${initials(currentUser.nama)}</div>
        </div>
      </div>
      <div class="page-content" id="page-content"></div>
      <div class="mobile-nav">
        ${navItems.slice(0, 3).map(([href, label]) => `<a href="${href}">${label.split(' ')[0]}<span>${label.split(' ').slice(1).join(' ')}</span></a>`).join('')}
        <a href="#" id="mobileMenuBtn">☰<span>Menu</span></a>
      </div>
    </div>
  </div>
  <div class="mobile-drawer-backdrop" id="mobileDrawerBackdrop">
    <div class="mobile-drawer">
      <div class="flex-between" style="padding:1rem 1.25rem;border-bottom:1px solid var(--border-subtle);">
        <div class="sidebar-brand" style="padding:0;">🔷 SI-NOMER</div>
        <button class="btn btn-outline btn-sm" id="closeMobileDrawerBtn">✕</button>
      </div>
      <div style="padding:1rem 0;">
        ${navItems.map(([href, label]) => `<a class="nav-item" href="${href}" onclick="closeMobileDrawer()">${label}</a>`).join('')}
      </div>
      <div style="padding:1rem 1.25rem;border-top:1px solid var(--border-subtle);">
        <button class="btn-logout" id="logoutBtnMobile">Keluar Sistem</button>
      </div>
    </div>
  </div>`;

  const keluar = () => {
    if (store.pending.size && !confirm('Masih ada perubahan yang sedang dikirim ke server. Keluar sekarang?')) return;
    doLogout();
  };
  document.getElementById('logoutBtn').addEventListener('click', keluar);
  document.getElementById('logoutBtnMobile').addEventListener('click', keluar);

  // Pencarian: di halaman daftar nota hasilnya langsung tersaring saat mengetik
  const cari = document.getElementById('globalSearch');
  cari.value = sessionSearchQuery;
  let timerCari = null;
  cari.addEventListener('input', () => {
    clearTimeout(timerCari);
    timerCari = setTimeout(() => {
      sessionSearchQuery = cari.value.trim();
      if (RUTE_DAFTAR.includes(location.hash)) router({ ulang: true });
    }, 200);
  });
  cari.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    clearTimeout(timerCari);
    sessionSearchQuery = cari.value.trim();
    if (RUTE_DAFTAR.includes(location.hash)) router({ ulang: true });
    else if (sessionSearchQuery) location.hash = '#/nota-saya';
  });

  document.getElementById('syncPill').addEventListener('click', () => sinkronkan({ paksa: true, umumkan: true }));
  aturIndikatorSinkron();

  // Tandai halaman "sedang diisi" supaya pembaruan otomatis tidak menghapus isian
  const pc = document.getElementById('page-content');
  // (elemen yang sudah terlepas karena halaman baru saja digambar ulang diabaikan)
  const diHalaman = (e) => e.target && pc.contains(e.target);
  pc.addEventListener('input', (e) => { if (diHalaman(e)) halamanKotor = true; });
  pc.addEventListener('change', (e) => { if (diHalaman(e)) halamanKotor = true; });
  pc.addEventListener('click', (e) => { if (diHalaman(e) && e.target.closest && e.target.closest('.panel-aksi')) halamanKotor = true; });

  document.getElementById('mobileMenuBtn').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('mobileDrawerBackdrop').classList.add('show');
  });
  document.getElementById('closeMobileDrawerBtn').addEventListener('click', closeMobileDrawer);
  document.getElementById('mobileDrawerBackdrop').addEventListener('click', (e) => {
    if (e.target.id === 'mobileDrawerBackdrop') closeMobileDrawer();
  });
}

window.closeMobileDrawer = function () {
  document.getElementById('mobileDrawerBackdrop')?.classList.remove('show');
};
let sessionSearchQuery = '';

function nipSaya() {
  const p = pegawaiDenganEmail(currentUser.email);
  return String((p && p.NIP) || currentUser.nip || '');
}

// ------------------------------------------------------------
// DASHBOARD
// ------------------------------------------------------------
function renderDashboard(content) {
  const res = hitungDashboard();
  const s = res.stats, sc = res.stageCount;
  const subTindakan = {
    'Pemohon': 'Barang siap diambil',
    'Atasan Mengetahui': 'Menunggu paraf Anda',
    'Perlengkapan': 'Periksa stok & serah terima',
    'Atasan Menyetujui': 'Menunggu persetujuan Anda'
  }[currentUser.role] || 'Perlu ditinjau segera';

  content.innerHTML = `
  <div class="hero-card">
    <div class="badges"><span class="pill">● Sistem Aktif</span><span class="pill">Google Workspace Terhubung</span></div>
    <h1>Selamat Datang, ${currentUser.nama} 👋</h1>
    <p>Pantau alur pengajuan nota permintaan barang, paraf digital ber-QR, dan status disposisi logistik Anda secara real-time tanpa hambatan birokrasi.</p>
    ${currentUser.role === 'Pemohon' ? `<a href="#/buat-nota" class="btn btn-primary">➕ Ajukan Nota Baru</a>` : ''}
  </div>

  ${htmlPeringatanStokHabis()}
  <div class="stats-grid">
    <div class="card stat-card"><div class="stat-icon" style="background:var(--pastel-blue);">📋</div><div><div class="stat-value">${s.totalNotaBulanIni}</div><div class="stat-label">NOTA BULAN INI</div><div class="stat-sub">✅ ${s.selesaiBulanIni} Selesai</div></div></div>
    <div class="card stat-card"><div class="stat-icon" style="background:var(--pastel-amber);">❗</div><div><div class="stat-value">${s.butuhTindakan}</div><div class="stat-label">BUTUH TINDAKAN</div><div class="stat-sub">${subTindakan}</div></div></div>
    <div class="card stat-card"><div class="stat-icon" style="background:var(--pastel-green);">🎯</div><div><div class="stat-value">${s.realisasiPersen}%</div><div class="stat-label">REALISASI BARANG</div><div class="stat-sub">Nota diselesaikan tuntas</div></div></div>
    <div class="card stat-card"><div class="stat-icon" style="background:var(--pastel-purple);">⏱️</div><div><div class="stat-value">${res.notaTerbaru.length}</div><div class="stat-label">NOTA TERBARU</div><div class="stat-sub">Ditampilkan di bawah</div></div></div>
  </div>

  <div class="card" style="margin-bottom:1.5rem;">
    <div class="flex-between"><h3 class="section-title" style="margin:0;">📈 Pelacakan Nota Saya</h3><a href="#/nota-saya">Lihat Semua →</a></div>
    <div class="tracker">
      ${TAHAP.map(t => `
        <div class="tracker-step ${(sc[t.status] || 0) > 0 ? 'active' : ''}">
          <div class="tracker-line"></div>
          <div class="tracker-node">${t.icon}</div>
          <div class="tracker-title">${t.label}</div>
          <div class="tracker-count">${sc[t.status] || 0} Nota</div>
        </div>`).join('')}
    </div>
  </div>

  <div class="card">
    <div class="flex-between"><h3 class="section-title" style="margin:0;">Nota Permintaan Terkini</h3><a href="#/nota-saya">Lihat Semua →</a></div>
    ${renderNotaTable(res.notaTerbaru)}
  </div>`;
}

function renderNotaTable(list, opts = {}) {
  if (!list.length) return `<div class="empty-state">Belum ada nota untuk ditampilkan.</div>`;
  const aksi = !!opts.aksiPemohon;
  return `<div class="table-wrap"><table class="data-table">
    <thead><tr><th>No. Nota</th><th>Tanggal</th><th>Bidang</th><th>Pemohon</th><th>Status</th>${aksi ? '<th>Aksi</th>' : ''}</tr></thead>
    <tbody>${list.map(n => {
      const sementara = notaSementara(n.NoNota);
      const simpan = sedangDisimpan(n.NoNota);
      return `
      <tr class="row-link" onclick="location.hash='#/detail/${encodeURIComponent(n.NoNota)}'">
        <td class="no-nota-cell">${sementara ? '<span class="text-muted">⏳ Menunggu nomor…</span>' : esc(n.NoNota)}${simpan && !sementara ? ' <span class="pending-dot" title="Sedang disimpan ke server">⏳</span>' : ''}</td>
        <td>${fmtTgl(n.Tanggal, false)}</td>
        <td>${n.BidangNama}</td>
        <td>${n.PemohonNama}</td>
        <td>${statusBadge(n.Status)}</td>
        ${aksi ? `<td style="white-space:nowrap;" onclick="event.stopPropagation()">${simpan
          ? '<span class="text-muted" style="font-size:12px;">⏳ Menyimpan…</span>'
          : bisaDiubahPemohon(n)
          ? `<a class="btn btn-outline btn-sm" href="#/edit-nota/${encodeURIComponent(n.NoNota)}">✏️ Edit</a>
             <button type="button" class="btn btn-danger btn-sm" onclick="hapusNotaPemohon('${encodeURIComponent(n.NoNota)}')">🗑️ Hapus</button>`
          : '<span class="text-muted" style="font-size:12px;" title="Nota sudah diproses sehingga tidak bisa diubah atau dihapus">🔒 Terkunci</span>'}</td>` : ''}
      </tr>`;
    }).join('')}</tbody></table></div>`;
}

// ------------------------------------------------------------
// BUAT NOTA BARU  &  UBAH NOTA (editNoNota diisi = mode ubah)
// Nota hanya bisa diubah oleh pemohonnya selama status masih Diajukan.
// ------------------------------------------------------------
function renderBuatNota(content, editNoNota) {
  const barangList = store.barang;
  const SATUAN_OPTIONS = ['Pcs', 'Unit', 'Buah', 'Rim', 'Lembar', 'Roll', 'Kotak', 'Set', 'Paket', 'Meter', 'Liter', 'Kg', 'Botol', 'Galon'];
  const detail = editNoNota ? detailNotaLokal(editNoNota) : null;
  if (editNoNota && !detail) {
    content.innerHTML = `<div class="card" style="max-width:560px;"><h2 class="section-title">Nota tidak ditemukan</h2>
      <p>Nota <b>${esc(editNoNota)}</b> tidak ada (mungkin sudah dihapus).</p><a href="#/nota-saya" class="btn btn-outline">← Kembali ke daftar nota</a></div>`;
    return;
  }
  const modeUbah = !!detail;
  const nota = modeUbah ? detail.nota : null;

  if (modeUbah && (!bisaDiubahPemohon(nota) || sedangDisimpan(nota.NoNota))) {
    content.innerHTML = `
    <div class="card" style="max-width:560px;">
      <h2 class="section-title">🔒 Nota tidak bisa diubah</h2>
      <p>Nota <b>${nota.NoNota}</b> berstatus <b>${nota.Status}</b>. Nota hanya bisa diubah atau dihapus oleh pemohonnya selama masih berstatus <b>Diajukan</b>.</p>
      <a href="#/detail/${encodeURIComponent(nota.NoNota)}" class="btn btn-outline">← Kembali ke detail nota</a>
    </div>`;
    return;
  }

  // Isian nota baru yang sebelumnya gagal terkirim dipulihkan
  const draf = !modeUbah ? ambilDrafNota() : null;
  const bidangTerpilih = draf && draf.bidangKode ? String(draf.bidangKode) : String(currentUser.bidangKode);

  const bidangField = modeUbah
    ? `<select id="fBidang" disabled><option value="${nota.BidangKode}">${nota.BidangNama}</option></select>
       <div class="text-muted" style="font-size:11.5px;margin-top:.3rem;">Bidang tidak bisa diganti karena sudah menjadi bagian nomor nota. Jika salah bidang, hapus nota ini lalu buat yang baru.</div>`
    : `<select id="fBidang">${store.bidang.map(b => `<option value="${b.KodeBidang}" ${String(b.KodeBidang) === bidangTerpilih ? 'selected' : ''}>${b.NamaBidang}</option>`).join('')}</select>`;

  content.innerHTML = `
  ${modeUbah ? `<a href="#/detail/${encodeURIComponent(nota.NoNota)}" style="font-size:12.5px;">← Kembali</a>` : ''}
  <h2 class="section-title">${modeUbah ? '✏️ Ubah Nota ' + nota.NoNota : '➕ Ajukan Nota Permintaan Barang'}</h2>
  ${draf && draf.items && draf.items.length ? `<div class="info-banner info-warning" style="display:flex;justify-content:space-between;align-items:center;gap:.75rem;flex-wrap:wrap;">
    <span>📝 Isian nota yang belum terkonfirmasi terkirim sudah dipulihkan. Periksa lalu klik <b>Ajukan Nota</b> lagi — bila ternyata sudah tercatat, sistem tidak membuat nota ganda.</span>
    <button type="button" class="btn btn-outline btn-sm" id="buangDrafBtn">Buang isian</button></div>` : ''}
  <div class="card">
    <div class="grid-2">
      <div class="field"><label>Bidang / Unit Kerja</label>${bidangField}</div>
      <div class="field"><label>Tanggal Pengajuan</label><input type="text" value="${modeUbah ? fmtTgl(nota.Tanggal, false) : new Date().toLocaleDateString('id-ID')}" disabled></div>
    </div>

    <div class="flex-between"><label style="font-weight:600;">Daftar Barang</label><button type="button" class="btn btn-outline btn-sm" id="addItemBtn">➕ Tambah Barang</button></div>
    <div id="itemsWrap"></div>

    <div style="margin-top:1.5rem;display:flex;gap:.75rem;">
      <button class="btn btn-primary" id="submitNotaBtn">${modeUbah ? 'Simpan Perubahan' : 'Ajukan Nota'}</button>
      <a href="${modeUbah ? '#/detail/' + encodeURIComponent(nota.NoNota) : '#/dashboard'}" class="btn btn-outline">Batal</a>
    </div>
  </div>`;

  const itemsWrap = document.getElementById('itemsWrap');
  let itemCount = 0;
  // Stok tersedia tiap barang. Saat mengubah nota, pesanan nota ini sendiri tidak dihitung.
  const petaStok = petaStokBarang(modeUbah ? nota.NoNota : null);
  const infoStokNama = (nama) => petaStok.get(normTeks(nama)) || null;

  function opsiBarangHtml(b) {
    const info = infoStokNama(b.NamaBarang);
    const nama = esc(b.NamaBarang);
    if (info && info.tersedia === 0) return `<option value="${nama}" data-satuan="${esc(b.Satuan)}" disabled>${nama} — HABIS</option>`;
    const ket = info && info.tersedia !== null ? ` — stok ${info.tersedia}` : '';
    return `<option value="${nama}" data-satuan="${esc(b.Satuan)}">${nama}${ket}</option>`;
  }

  function namaBarangBaris(row) {
    const sel = row.querySelector('.itemBarang');
    return (sel.value === '__lainnya__' ? row.querySelector('.itemBarangManual').value : sel.value).trim();
  }

  // Tampilkan stok tersedia di bawah tiap baris dan batasi jumlahnya.
  // Barang yang sama di beberapa baris berbagi stok yang sama.
  function perbaruiStokSemua(barisDiubah) {
    const rows = Array.from(itemsWrap.querySelectorAll('.baris-barang'));
    rows.forEach(row => {
      const infoEl = row.querySelector('.itemStokInfo');
      const jumlahEl = row.querySelector('.itemJumlah');
      const info = infoStokNama(namaBarangBaris(row));
      if (!info) { infoEl.innerHTML = ''; infoEl.style.display = 'none'; jumlahEl.removeAttribute('max'); return; }
      infoEl.style.display = 'block';
      if (info.tersedia === null) {
        infoEl.innerHTML = '<span class="text-muted">Stok barang ini belum diatur Bagian Perlengkapan.</span>';
        jumlahEl.removeAttribute('max');
        return;
      }
      const kunci = normTeks(info.barang.NamaBarang);
      const dipakaiLain = rows.filter(r => r !== row && normTeks(namaBarangBaris(r)) === kunci)
        .reduce((t, r) => t + (Number(r.querySelector('.itemJumlah').value) || 0), 0);
      const maks = Math.max(0, info.tersedia - dipakaiLain);
      if (info.tersedia === 0) {
        infoEl.innerHTML = '<span class="text-danger" style="font-weight:600;">✖ Stok habis.</span> <span class="text-muted">Hapus baris ini atau pilih barang lain.</span>';
        jumlahEl.removeAttribute('max');
        return;
      }
      if (maks === 0) {
        infoEl.innerHTML = `<span class="text-danger" style="font-weight:600;">✖ Seluruh stok (${info.tersedia}) sudah diminta di baris lain.</span> <span class="text-muted">Hapus baris ini atau gabungkan jumlahnya.</span>`;
        jumlahEl.removeAttribute('max');
        return;
      }
      jumlahEl.max = maks;
      let disesuaikan = false;
      if (row === barisDiubah && Number(jumlahEl.value) > maks) { jumlahEl.value = maks; disesuaikan = true; }
      infoEl.innerHTML = `<span style="color:var(--status-selesai-text);font-weight:600;">✔ Stok tersedia: ${info.tersedia}</span>`
        + (dipakaiLain ? ` <span class="text-muted">(${dipakaiLain} sudah diminta di baris lain, sisa ${maks})</span>` : '')
        + (disesuaikan ? ` <span style="color:var(--status-diproses-text);font-weight:600;">— jumlah disesuaikan menjadi maksimal ${maks}</span>` : '')
        + (!disesuaikan && Number(jumlahEl.value) > maks ? ` <span class="text-danger" style="font-weight:600;">— maksimal ${maks}</span>` : '');
    });
  }

  function satuanOptionsHtml(selected) {
    const inList = SATUAN_OPTIONS.includes(selected);
    return `<option value="" ${!selected ? 'selected' : ''}>-- pilih --</option>`
      + SATUAN_OPTIONS.map(s => `<option value="${s}" ${s === selected ? 'selected' : ''}>${s}</option>`).join('')
      + `<option value="__lainnya__" ${selected && !inList ? 'selected' : ''}>Lainnya (ketik manual)</option>`;
  }

  // isi (opsional) = { namaBarang, jumlah, satuan } untuk mode ubah / draf
  function addItemRow(isi) {
    itemCount++;
    const rowId = 'item_' + itemCount;
    const row = document.createElement('div');
    row.className = 'grid-2 baris-barang';
    row.style.cssText = 'grid-template-columns:2fr 1fr 1fr auto;align-items:end;gap:.6rem;margin-bottom:.6rem;';
    row.id = rowId;
    row.innerHTML = `
      <div class="field" style="margin-bottom:0;"><label>Nama Barang</label>
        <select class="itemBarang" onchange="autoFillSatuan(this)">
          <option value="">-- pilih --</option>
          ${barangList.map(opsiBarangHtml).join('')}
          <option value="__lainnya__">Lainnya (ketik manual)</option>
        </select>
        <input class="itemBarangManual" style="display:none;margin-top:.4rem;" placeholder="Nama barang lainnya">
      </div>
      <div class="field" style="margin-bottom:0;"><label>Jumlah</label><input type="number" class="itemJumlah" min="1" value="1"></div>
      <div class="field" style="margin-bottom:0;"><label>Satuan</label>
        <select class="itemSatuan" onchange="toggleSatuanManual(this)">${satuanOptionsHtml(isi ? String(isi.satuan || '') : '')}</select>
        <input class="itemSatuanManual" style="display:none;margin-top:.4rem;" placeholder="Ketik satuan lain">
      </div>
      <button type="button" class="btn btn-outline btn-sm btnHapusBaris" title="Hapus baris">✕</button>
      <div class="itemStokInfo" style="grid-column:1/-1;display:none;font-size:12px;margin-top:-.2rem;"></div>`;
    itemsWrap.appendChild(row);
    row.querySelector('.btnHapusBaris').addEventListener('click', () => { row.remove(); perbaruiStokSemua(); });
    row.querySelector('.itemJumlah').addEventListener('input', () => perbaruiStokSemua(row));
    row.querySelector('.itemBarangManual').addEventListener('input', () => perbaruiStokSemua(row));

    if (isi) {
      const nama = String(isi.namaBarang || '');
      const selBarang = row.querySelector('.itemBarang');
      if (barangList.some(b => b.NamaBarang === nama)) {
        selBarang.value = nama;
      } else if (nama) {
        selBarang.value = '__lainnya__';
        const manual = row.querySelector('.itemBarangManual');
        manual.style.display = 'block'; manual.value = nama;
      }
      row.querySelector('.itemJumlah').value = isi.jumlah;
      const satuan = String(isi.satuan || '');
      if (satuan && !SATUAN_OPTIONS.includes(satuan)) {
        const manualSatuan = row.querySelector('.itemSatuanManual');
        manualSatuan.style.display = 'block'; manualSatuan.value = satuan;
      }
    }
    perbaruiStokSemua();
  }

  window.toggleSatuanManual = function (sel) {
    const row = sel.closest('.baris-barang');
    row.querySelector('.itemSatuanManual').style.display = sel.value === '__lainnya__' ? 'block' : 'none';
  };

  window.autoFillSatuan = function (sel) {
    const row = sel.closest('.baris-barang');
    const manual = row.querySelector('.itemBarangManual');
    manual.style.display = sel.value === '__lainnya__' ? 'block' : 'none';
    // Catatan: Satuan SENGAJA tidak diisi otomatis — pemohon tetap memilih
    // sendiri satuan dari dropdown, sama seperti memilih Nama Barang.
    perbaruiStokSemua(row);
  };

  document.getElementById('addItemBtn').addEventListener('click', () => addItemRow());
  if (modeUbah && detail.items.length) {
    detail.items.forEach(it => addItemRow({ namaBarang: it.NamaBarang, jumlah: it.JumlahDiminta, satuan: it.Satuan }));
  } else if (draf && draf.items && draf.items.length) {
    draf.items.forEach(it => addItemRow(it));
  } else {
    addItemRow();
  }
  document.getElementById('buangDrafBtn')?.addEventListener('click', () => { hapusDrafNota(); router({ ulang: true }); });

  document.getElementById('submitNotaBtn').addEventListener('click', () => {
    const items = [];
    let satuanKosong = false, jumlahSalah = false;
    itemsWrap.querySelectorAll('.baris-barang').forEach(row => {
      const namaBarang = namaBarangBaris(row);
      const jumlah = row.querySelector('.itemJumlah').value;
      const satuanSel = row.querySelector('.itemSatuan');
      const satuan = (satuanSel.value === '__lainnya__' ? row.querySelector('.itemSatuanManual').value : satuanSel.value).trim();
      if (namaBarang && jumlah) {
        if (!satuan) satuanKosong = true;
        if (!(Number(jumlah) >= 1) || !Number.isInteger(Number(jumlah))) jumlahSalah = true;
        items.push({ namaBarang, jumlah: Number(jumlah), satuan });
      }
    });
    if (!items.length) return showToast('Tambahkan minimal satu barang.', 'error');
    if (jumlahSalah) return showToast('Jumlah setiap barang harus bilangan bulat minimal 1.', 'error');
    if (satuanKosong) return showToast('Pilih satuan untuk setiap barang.', 'error');
    // Jumlah per barang tidak boleh melebihi stok tersedia (barang sama di beberapa baris dijumlahkan).
    // Draf yang dikirim ulang dicek server saja: bila pengiriman pertama ternyata sudah
    // tersimpan, pesanannya sendiri ikut terhitung di data browser.
    const kirimUlangDraf = !modeUbah && !!(draf && draf.idKlien);
    const totalPerBarang = new Map();
    items.forEach(it => {
      const info = infoStokNama(it.namaBarang);
      if (!info || info.tersedia === null) return;
      const k = normTeks(info.barang.NamaBarang);
      totalPerBarang.set(k, { info, jumlah: ((totalPerBarang.get(k) || {}).jumlah || 0) + it.jumlah });
    });
    if (!kirimUlangDraf) for (const { info, jumlah } of totalPerBarang.values()) {
      if (info.tersedia === 0) return showToast('Stok "' + info.barang.NamaBarang + '" sedang habis. Hapus barang ini dari daftar atau pilih barang lain.', 'error', 6000);
      if (jumlah > info.tersedia) return showToast('Stok "' + info.barang.NamaBarang + '" tidak mencukupi: tersedia ' + info.tersedia + ', diminta ' + jumlah + '.', 'error', 6000);
    }

    const itemLokal = (no) => items.map((it, k) => ({
      ID: no + '-' + (k + 1), NoNota: no, NamaBarang: it.namaBarang, KodeBMN: '', Satuan: it.satuan,
      JumlahDiminta: it.jumlah, JumlahDisetujui: '', StatusItem: '', Alasan: '', JumlahDiserahkan: '', KeteranganSerah: ''
    }));

    if (modeUbah) {
      const no = String(nota.NoNota);
      kirimInstan({
        kunci: no, aksi: 'editNota',
        data: { noNota: no, pemohonEmail: currentUser.email, items },
        pesan: 'Perubahan nota berhasil disimpan.',
        pindahKe: '#/detail/' + encodeURIComponent(no),
        ubahLokal: () => {
          store.items = store.items.filter(i => String(i.NoNota) !== no).concat(itemLokal(no));
          logLokal(no, 'Ubah Nota', 'Daftar barang diperbarui oleh pemohon (' + items.length + ' barang).');
        }
      }).catch(() => {});
      return;
    }

    // Nota baru langsung tampil dengan nomor sementara; nomor resmi dari server menyusul
    const bidangKode = document.getElementById('fBidang').value;
    const bidang = store.bidang.find(b => String(b.KodeBidang) === String(bidangKode));
    // Draf yang dikirim ulang memakai tanda pengiriman yang sama, sehingga bila
    // pengiriman pertama ternyata sudah tersimpan, server tidak membuat nota ganda.
    const sementara = (draf && draf.idKlien && !sedangDisimpan(draf.idKlien)) ? draf.idKlien
      : 'SEMENTARA-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    const waktu = sekarangWib();
    hapusDrafNota();
    kirimInstan({
      kunci: sementara, aksi: 'createNota',
      data: { pemohonEmail: currentUser.email, bidangKode, items, idKlien: sementara },
      pesan: 'Nota berhasil diajukan. Nomor nota sedang dibuat…',
      pindahKe: '#/detail/' + encodeURIComponent(sementara),
      ubahLokal: () => {
        store.nota.push({
          NoNota: sementara, Tanggal: waktu, TahunAnggaran: new Date().getFullYear(), BidangKode: bidangKode,
          BidangNama: bidang ? bidang.NamaBidang : '', PemohonNama: currentUser.nama, PemohonNIP: nipSaya(),
          PemohonEmail: currentUser.email, Tujuan: '', Status: 'Diajukan', CreatedAt: waktu
        });
        store.items = store.items.concat(itemLokal(sementara));
        logLokal(sementara, 'Ajukan Nota', 'Nota dibuat dan diajukan ke atasan bidang.');
      },
      sesudahBerhasil: (res) => {
        if (/sudah tercatat/.test(res.message || '')) showToast(res.message, 'success', 6000);
        else if (res.noNota) showToast('Nota ' + res.noNota + ' berhasil diajukan.');
      },
      sesudahGagal: () => {
        simpanDrafNota({ bidangKode, items, idKlien: sementara });
        if (location.hash === '#/detail/' + encodeURIComponent(sementara)) location.hash = '#/buat-nota';
      }
    }).catch(() => {});
  });
}

// Pemohon boleh mengubah/menghapus nota MILIKNYA selama status masih Diajukan
function bisaDiubahPemohon(n) {
  return !!currentUser && currentUser.role === 'Pemohon' && n && n.Status === 'Diajukan' && !notaSementara(n.NoNota)
    && String(n.PemohonEmail || '').trim().toLowerCase() === String(currentUser.email || '').trim().toLowerCase();
}

window.hapusNotaPemohon = function (noNotaEnc) {
  const noNota = decodeURIComponent(noNotaEnc);
  if (sedangDisimpan(noNota)) return;
  if (!confirm('Hapus nota ' + noNota + '?\n\nNota beserta daftar barangnya akan dihapus permanen dan tidak bisa dikembalikan.')) return;
  kirimInstan({
    kunci: noNota, aksi: 'hapusNota',
    data: { noNota, pemohonEmail: currentUser.email },
    pesan: 'Nota ' + noNota + ' berhasil dihapus.',
    pindahKe: '#/nota-saya',
    ubahLokal: () => hapusNotaLokal(noNota)
  }).catch(() => {});
};

// ------------------------------------------------------------
// DAFTAR NOTA (dipakai untuk: Nota Saya, Menunggu Paraf, Tinjau Persetujuan, Periksa Stok, Serah Terima)
// Filter & pencarian dihitung langsung dari data lokal.
// ------------------------------------------------------------
function renderNotaList(content, opts) {
  const hash = location.hash;
  const title = opts.title || 'Nota Saya';
  const aksiPemohon = currentUser.role === 'Pemohon';
  const statusAktif = filterStatusAktif[hash] || opts.status || 'Semua';

  content.innerHTML = `
  <div class="flex-between"><h2 class="section-title">${title}</h2>
  ${sessionSearchQuery ? `<span class="text-muted">Pencarian: "${esc(sessionSearchQuery)}" <a href="#" id="clearSearch">✕ hapus</a></span>` : ''}</div>
  <div class="chip-row" id="statusFilter">
    ${[['Semua', 'Semua']].concat(TAHAP.map(t => [t.status, t.label]), [['Ditolak', 'Ditolak']]).map(([s, lbl]) => `<span class="chip-filter ${s === statusAktif ? 'active' : ''}" data-status="${s}">${lbl}</span>`).join('')}
  </div>
  <div class="card" id="kartuDaftarNota">${renderNotaTable(daftarNotaSaya(statusAktif, sessionSearchQuery), { aksiPemohon })}</div>`;

  document.getElementById('clearSearch')?.addEventListener('click', (e) => {
    e.preventDefault();
    sessionSearchQuery = '';
    const cari = document.getElementById('globalSearch');
    if (cari) cari.value = '';
    router({ ulang: true });
  });
  document.querySelectorAll('#statusFilter .chip-filter').forEach(chip => {
    chip.addEventListener('click', () => {
      filterStatusAktif[hash] = chip.dataset.status;
      document.querySelectorAll('#statusFilter .chip-filter').forEach(c => c.classList.toggle('active', c === chip));
      document.getElementById('kartuDaftarNota').innerHTML = renderNotaTable(daftarNotaSaya(chip.dataset.status, sessionSearchQuery), { aksiPemohon });
    });
  });
}

// ------------------------------------------------------------
// DETAIL NOTA — termasuk aksi sesuai role & tahap:
//   Atasan Mengetahui  + Diajukan        -> paraf / tolak
//   Perlengkapan       + Diketahui       -> periksa stok tiap barang
//   Atasan Menyetujui  + Stok Diperiksa  -> setujui hasil pemeriksaan
//   Perlengkapan       + Diproses        -> terbitkan Berita Acara Serah Terima
// ------------------------------------------------------------
const _notaSudahDicari = new Set();
function renderDetail(content, noNota) {
  const res = detailNotaLokal(noNota);
  if (!res) {
    const cekDulu = !notaSementara(noNota) && !_notaSudahDicari.has(noNota);
    content.innerHTML = `<div class="card empty-state">
      <div style="font-size:30px;">🔎</div>
      <p><b>Nota ${notaSementara(noNota) ? 'baru' : esc(noNota)} tidak ditemukan.</b><br>${cekDulu ? 'Sedang memeriksa data terbaru dari server…' : 'Nota ini mungkin sudah dihapus.'}</p>
      <a href="#/nota-saya" class="btn btn-outline">← Kembali ke daftar nota</a></div>`;
    if (cekDulu) {
      _notaSudahDicari.add(noNota);
      sinkronkan().then(() => renderUlangAman());
    }
    return;
  }
  _notaSudahDicari.delete(noNota);
  const n = res.nota, items = res.items, log = res.log;
  const menyimpan = sedangDisimpan(n.NoNota);
  const sementara = notaSementara(n.NoNota);
  const currentIdx = n.Status === 'Ditolak' ? -1 : TAHAP.findIndex(t => t.status === n.Status);
  const adaBast = !!(n.QRBastKiriKode || n.BastTanggal);
  const qr = (kode, kosong) => kode ? 'QR: ' + kode : (menyimpan ? '⏳ QR sedang dibuat' : kosong);

  content.innerHTML = `
  <div class="flex-between" style="margin-bottom:1rem;">
    <div><a href="#/nota-saya" style="font-size:12.5px;">← Kembali</a>
      <h2 class="section-title" style="margin:.2rem 0 0;">${sementara ? '⏳ Nomor nota sedang dibuat…' : n.NoNota}</h2></div>
    <div>${statusBadge(n.Status)}
      <button class="btn btn-outline btn-sm" id="lihatPdfBtn" ${menyimpan ? 'disabled title="Tunggu hingga tersimpan di server"' : ''}>👁️ Lihat PDF</button>
      <button class="btn btn-outline btn-sm" id="unduhPdfBtn" ${menyimpan ? 'disabled title="Tunggu hingga tersimpan di server"' : ''}>⬇️ Unduh PDF</button></div>
  </div>

  ${menyimpan ? `<div class="info-banner info-simpan"><span class="loading-spin" style="width:14px;height:14px;vertical-align:-2px;"></span>
    <b>Sedang disimpan ke server…</b> Perubahan sudah tercatat di layar ini. Anda boleh berpindah halaman; status akan diperbarui otomatis.</div>` : ''}

  ${!menyimpan && bisaDiubahPemohon(n) ? `<div class="info-banner info-warning" style="display:flex;justify-content:space-between;align-items:center;gap:.75rem;flex-wrap:wrap;">
    <span>✏️ Nota ini belum diparaf atasan, jadi masih bisa Anda ubah atau hapus.</span>
    <span style="white-space:nowrap;"><a class="btn btn-outline btn-sm" href="#/edit-nota/${encodeURIComponent(n.NoNota)}">✏️ Edit Nota</a>
      <button type="button" class="btn btn-danger btn-sm" id="hapusNotaBtn">🗑️ Hapus Nota</button></span>
  </div>` : ''}

  ${renderBannerStatus(n, items)}

  <div class="two-col">
    <div>
      <div class="card" style="margin-bottom:1rem;">
        <table class="data-table" style="border:none;">
          <tr><td class="text-muted">Bidang / Unit Kerja</td><td><b>${n.BidangNama}</b></td></tr>
          <tr><td class="text-muted">Pejabat Pemohon</td><td><b>${n.PemohonNama}</b> (NIP. ${n.PemohonNIP})</td></tr>
          <tr><td class="text-muted">Tanggal Pengajuan</td><td>${fmtTgl(n.Tanggal)}</td></tr>
          ${n.PemeriksaNama ? `<tr><td class="text-muted">Pemeriksaan Stok</td><td>${n.PemeriksaNama} · ${fmtTgl(n.TglDiperiksa)}${n.HasilPersetujuan ? ' · <b>' + n.HasilPersetujuan + '</b>' : ''}</td></tr>` : ''}
          ${n.CatatanPemeriksaan ? `<tr><td class="text-muted">Catatan Perlengkapan</td><td>${esc(n.CatatanPemeriksaan)}</td></tr>` : ''}
        </table>
      </div>

      <div class="card" style="margin-bottom:1rem;">
        <h3 class="section-title" style="font-size:15px;">Daftar Barang</h3>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>Barang</th><th>Satuan</th><th>Diminta</th><th>Disetujui</th>${adaBast ? '<th>Diserahkan</th>' : ''}<th>Keputusan</th><th>Catatan</th></tr></thead>
          <tbody id="itemsBody">${items.map(it => `
            <tr>
              <td>${esc(it.NamaBarang)}</td>
              <td>${esc(it.Satuan)}</td><td>${it.JumlahDiminta}</td><td>${it.StatusItem ? it.JumlahDisetujui : '-'}</td>
              ${adaBast ? `<td><b>${jumlahDiserahkan(it)}</b>${it.KeteranganSerah ? `<div class="text-muted" style="font-size:11px;">${esc(it.KeteranganSerah)}</div>` : ''}</td>` : ''}
              <td>${it.StatusItem ? statusBadge(it.StatusItem === 'Penuh' ? 'Selesai' : it.StatusItem === 'Ditolak' ? 'Ditolak' : 'Diproses') + ' ' + it.StatusItem : '<span class="text-muted">Menunggu</span>'}</td>
              <td>${esc(it.Alasan) || '-'}</td>
            </tr>`).join('')}</tbody>
        </table></div>
      </div>

      ${menyimpan ? '' : `<div class="panel-aksi">${renderAksiRole(n, items, res)}</div>`}

      <h3 class="section-title" style="font-size:14px;margin:1.5rem 0 0;">Tanda Tangan Nota Permintaan</h3>
      <div class="dual-auth" style="margin-top:.75rem;">
        <div class="auth-box"><div class="text-muted" style="font-size:11px;font-weight:600;">Mengetahui,</div>
          <div style="font-weight:600;">${formatJabatanKepalaBidang(n.BidangNama)}</div>
          <div class="qr-placeholder">${n.AtasanMengetahuiNama ? qr(n.QRKiriKode, 'Belum diparaf') : 'Belum diparaf'}</div>
          <div style="font-size:12.5px;">${n.AtasanMengetahuiNama || '-'}</div>
          <div class="text-muted" style="font-size:11px;">${n.TglDiketahui ? fmtTgl(n.TglDiketahui) : ''}</div></div>
        <div class="auth-box"><div class="text-muted" style="font-size:11px;font-weight:600;">Menyetujui,</div>
          <div style="font-weight:600;">Sekretaris Dinas Perhubungan Provinsi Riau</div>
          ${n.DitolakOleh === 'Sekretaris' ? `<div class="qr-placeholder" style="color:var(--status-danger-text);font-weight:600;">Ditolak</div>
          <div style="font-size:12.5px;">${esc(n.PenolakNama || '-')}</div>
          <div class="text-muted" style="font-size:11px;">${n.TglDitolak ? fmtTgl(n.TglDitolak) : ''}</div></div>` : `<div class="qr-placeholder">${n.AtasanMenyetujuiNama ? qr(n.QRKananKode, 'Belum disetujui') : 'Belum disetujui'}</div>
          <div style="font-size:12.5px;">${n.AtasanMenyetujuiNama || '-'}</div>
          <div class="text-muted" style="font-size:11px;">${n.TglDisetujui ? fmtTgl(n.TglDisetujui) : ''}</div></div>`}
      </div>

      ${adaBast ? `
      <h3 class="section-title" style="font-size:14px;margin:1.5rem 0 0;">Berita Acara Serah Terima Barang</h3>
      <div class="text-muted" style="font-size:12.5px;">Diterbitkan ${fmtTgl(n.BastTanggal)} · tercantum di halaman 2 PDF</div>
      <div class="dual-auth" style="margin-top:.75rem;">
        <div class="auth-box"><div class="text-muted" style="font-size:11px;font-weight:600;">PIHAK KEDUA (yang menerima)</div>
          <div class="qr-placeholder">${qr(n.QRBastKiriKode, '-')}</div>
          <div style="font-weight:600;font-size:12.5px;">${n.BastPihakKeduaNama || '-'}</div>
          <div class="text-muted" style="font-size:11px;">NIP. ${n.BastPihakKeduaNIP || '-'}</div>
          ${n.BastPihakKeduaNama && n.BastPihakKeduaNama !== n.PemohonNama ? `<div class="text-muted" style="font-size:11px;margin-top:.25rem;">mewakili pemohon ${n.PemohonNama}</div>` : ''}</div>
        <div class="auth-box"><div class="text-muted" style="font-size:11px;font-weight:600;">PIHAK PERTAMA (yang menyerahkan)</div>
          <div class="qr-placeholder">${qr(n.QRBastKananKode, '-')}</div>
          <div style="font-weight:600;font-size:12.5px;">${n.BastPihakPertamaNama || '-'}</div>
          <div class="text-muted" style="font-size:11px;">NIP. ${n.BastPihakPertamaNIP || '-'}</div></div>
      </div>` : ''}
    </div>

    <div>
      <div class="card" style="margin-bottom:1rem;">
        <h3 class="section-title" style="font-size:14px;">Alur Progres Nota</h3>
        ${TAHAP.map((t, i) => `
          <div style="display:flex;gap:.6rem;margin-bottom:.9rem;">
            <div style="width:26px;height:26px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;
              background:${i <= currentIdx ? 'var(--primary)' : 'var(--surface-subtle)'};color:${i <= currentIdx ? '#fff' : 'var(--text-muted)'};">${i + 1}</div>
            <div><div style="font-weight:600;font-size:13px;">${t.status}</div><div class="text-muted" style="font-size:11.5px;">${t.ket}</div></div>
          </div>`).join('')}
        ${n.Status === 'Ditolak' ? `<div class="badge badge-ditolak">Nota Ditolak</div>` : ''}
      </div>

      <div class="card">
        <h3 class="section-title" style="font-size:14px;">Log Riwayat Dokumen</h3>
        ${log.length ? log.map(l => `<div class="timeline-item"><div class="timeline-dot${l._lokal ? ' timeline-dot-pending' : ''}"></div><div><b>${esc(l.Aksi)}</b> — ${esc(l.Aktor)}<br><span class="text-muted">${esc(l.Keterangan)}</span><br><span class="text-muted">${fmtTgl(l.Timestamp)}${l._lokal ? ' · menyimpan…' : ''}</span></div></div>`).join('') : '<div class="text-muted">Belum ada riwayat.</div>'}
      </div>
    </div>
  </div>`;

  document.getElementById('lihatPdfBtn').addEventListener('click', () => lihatPdfNota(n.NoNota));
  document.getElementById('unduhPdfBtn').addEventListener('click', () => unduhPdfNota(n.NoNota));
  document.getElementById('hapusNotaBtn')?.addEventListener('click', () => hapusNotaPemohon(encodeURIComponent(n.NoNota)));

  if (!menyimpan) attachDetailActionHandlers(n, items, res);
}

// Jumlah yang benar-benar diserahkan (berita acara lama: sama dengan yang disetujui)
function jumlahDiserahkan(it) {
  const kosong = v => v === '' || v === null || v === undefined;
  return kosong(it.JumlahDiserahkan) ? (kosong(it.JumlahDisetujui) ? 0 : Number(it.JumlahDisetujui)) : Number(it.JumlahDiserahkan);
}

// Pesan singkat di atas detail nota sesuai kondisinya
function renderBannerStatus(n, items) {
  if (n.Status === 'Ditolak' && n.AlasanPembatalan) {
    return `<div class="info-banner info-danger">❌ <b>Serah terima dibatalkan</b> karena stok tidak tersedia saat pengambilan. Alasan: ${esc(n.AlasanPembatalan)}. Silakan ajukan nota baru bila masih diperlukan.</div>`;
  }
  if (n.Status === 'Ditolak' && n.DitolakOleh === 'Sekretaris') {
    return `<div class="info-banner info-danger">❌ <b>Nota ditolak Sekretaris</b>${n.PenolakNama ? ' (' + esc(n.PenolakNama) + (n.TglDitolak ? ', ' + fmtTgl(n.TglDitolak) : '') + ')' : ''}. Alasan: ${esc(String(n.AlasanPenolakan || '-').trim().replace(/[.\s]+$/, ''))}. Silakan ajukan nota baru bila masih diperlukan.</div>`;
  }
  if (n.Status === 'Ditolak') {
    const alasan = n.PemeriksaNama
      ? 'Seluruh barang tidak dapat dipenuhi Bagian Perlengkapan. Alasan per barang ada di tabel Daftar Barang.'
      : 'Ditolak atasan bidang. Catatan: ' + esc(n.CatatanMengetahui || '-');
    return `<div class="info-banner info-danger">❌ <b>Nota ditolak.</b> ${alasan} Silakan ajukan nota baru bila masih diperlukan.</div>`;
  }
  if (n.Status === 'Diproses' && currentUser.role === 'Pemohon') {
    return `<div class="info-banner info-success">✅ <b>Nota Anda sudah disetujui.</b> Silakan ambil barang di Bagian Perlengkapan. Berita Acara Serah Terima diterbitkan saat barang diserahkan.</div>`;
  }
  if (n.Status === 'Selesai' && n.BastTanggal) {
    const wakil = n.BastPihakKeduaNama && n.BastPihakKeduaNama !== n.PemohonNama
      ? ` kepada <b>${n.BastPihakKeduaNama}</b> (mewakili pemohon)` : '';
    const kurang = (items || []).filter(it => jumlahDiserahkan(it) < (Number(it.JumlahDisetujui) || 0)).length;
    const catatanKurang = kurang ? ` <b>${kurang} barang tidak diserahkan penuh</b> karena stok berkurang, lihat kolom Diserahkan.` : '';
    return `<div class="info-banner ${kurang ? 'info-warning' : 'info-success'}">🤝 <b>Barang sudah diserahterimakan</b>${wakil} pada ${fmtTgl(n.BastTanggal, false)}.${catatanKurang} Berita Acara Serah Terima ada di halaman 2 PDF.</div>`;
  }
  return '';
}

// Daftar pegawai yang bisa dipilih sebagai penerima barang (selain pemohon sendiri).
// Semua pegawai yang punya nama ikut tampil, termasuk yang belum punya email.
function daftarCalonPenerima(pemohon) {
  const emailPemohon = normTeks(pemohon.email);
  const namaPemohon = normTeks(pemohon.nama);
  const nipPemohon = String(pemohon.nip || '').trim();
  return store.pegawai
    .filter(p => String(p.Nama || '').trim())
    .filter(p => {
      const email = normTeks(p.Email);
      if (email) return email !== emailPemohon;
      return !(normTeks(p.Nama) === namaPemohon && String(p.NIP || '').trim() === nipPemohon);
    })
    .sort((a, b) => String(a.Nama).localeCompare(String(b.Nama)));
}

function renderAksiRole(n, items, res) {
  const role = currentUser.role;

  if (role === 'Atasan Mengetahui' && n.Status === 'Diajukan' && !notaSementara(n.NoNota)) {
    return `<div class="card" style="margin-bottom:1rem;">
      <h3 class="section-title" style="font-size:14px;">Tindakan: Paraf Mengetahui</h3>
      <div class="field"><label>Catatan (opsional)</label><textarea id="catatanMengetahui" placeholder="mis. Disetujui sesuai kuota."></textarea></div>
      <div style="display:flex;gap:.6rem;">
        <button class="btn btn-success" id="btnSetujuiMengetahui">✅ Setujui (Mengetahui)</button>
        <button class="btn btn-danger" id="btnTolakMengetahui">❌ Tolak</button>
      </div></div>`;
  }

  if (role === 'Perlengkapan' && n.Status === 'Diketahui') {
    const petaStok = petaStokBarang(n.NoNota); // stok tersedia di luar pesanan nota ini
    return `<div class="card" style="margin-bottom:1rem;">
      <h3 class="section-title" style="font-size:14px;">Tindakan: Periksa Stok Barang</h3>
      <p class="text-muted" style="font-size:12.5px;margin:-.25rem 0 .75rem;">Tentukan ketersediaan tiap barang. Setelah disimpan, nota diteruskan ke Sekretaris untuk disetujui.</p>
      <div id="reviewItems">${items.map(it => {
        const d = Number(it.JumlahDiminta) || 0;
        return `
        <div class="item-review" data-id="${esc(it.ID)}" data-diminta="${d}">
          <div class="item-review-head"><b>${esc(it.NamaBarang)}</b><span class="text-muted">Diminta: ${d} ${esc(it.Satuan)}</span></div>
          ${htmlStokUntukPemeriksaan(petaStok.get(normTeks(it.NamaBarang)), d)}
          <div class="decision-options">
            <button type="button" class="decision-btn" data-decision="Penuh">✅ Disetujui Penuh</button>
            ${d > 1 ? '<button type="button" class="decision-btn" data-decision="Sebagian">⚠️ Disetujui Sebagian</button>' : ''}
            <button type="button" class="decision-btn" data-decision="Ditolak">❌ Ditolak</button>
          </div>
          <div class="field" style="margin-top:.5rem;display:none;" data-field="jumlah"><label>Jumlah yang Disetujui (1 sampai ${Math.max(d - 1, 1)})</label><input type="number" class="jumlahDisetujuiInput" min="1" max="${Math.max(d - 1, 1)}" value="${Math.max(d - 1, 1)}"></div>
          <div class="field" style="margin-top:.5rem;display:none;" data-field="alasan"><label>Alasan (wajib)</label><input class="alasanInput" placeholder="mis. Stok tersisa 3 buah"></div>
        </div>`;
      }).join('')}</div>
      <div class="field"><label>Catatan untuk Sekretaris (opsional)</label><textarea id="catatanPemeriksaan"></textarea></div>
      <button class="btn btn-primary" id="btnSimpanPemeriksaan">Simpan Hasil Pemeriksaan</button>
    </div>`;
  }

  if (role === 'Atasan Menyetujui' && n.Status === ST_DIPERIKSA) {
    return `<div class="card" style="margin-bottom:1rem;">
      <h3 class="section-title" style="font-size:14px;">Tindakan: Setujui Hasil Pemeriksaan Stok</h3>
      <p style="font-size:13px;margin:0 0 .75rem;">Stok telah diperiksa oleh <b>${n.PemeriksaNama || 'Bagian Perlengkapan'}</b> dengan hasil <b>${n.HasilPersetujuan || '-'}</b>. Rincian keputusan tiap barang ada di tabel Daftar Barang di atas.</p>
      <div class="field"><label>Catatan (wajib diisi bila menolak)</label><textarea id="catatanMenyetujui" placeholder="mis. Permintaan belum sesuai prioritas anggaran bulan ini."></textarea></div>
      <div style="display:flex;gap:.6rem;flex-wrap:wrap;">
        <button class="btn btn-success" id="btnSetujuiSekretaris">✅ Setujui & Terbitkan QR</button>
        <button class="btn btn-danger" id="btnTolakSekretaris">❌ Tolak</button>
      </div>
    </div>`;
  }

  if (role === 'Perlengkapan' && n.Status === 'Diproses') {
    const v = res.viewer || { nama: currentUser.nama, nip: currentUser.nip, jabatan: '' };
    const now = new Date();
    const tglHariIni = HARI_ID[now.getDay()] + ', ' + now.getDate() + ' ' + BULAN_ID[now.getMonth()] + ' ' + now.getFullYear();
    const pemohon = { nama: n.PemohonNama, nip: n.PemohonNIP, jabatan: res.pemohonJabatan, email: n.PemohonEmail };
    const calon = daftarCalonPenerima(pemohon);
    return `<div class="card" style="margin-bottom:1rem;">
      <h3 class="section-title" style="font-size:14px;">Tindakan: Terbitkan Berita Acara Serah Terima</h3>
      <p class="text-muted" style="font-size:12.5px;margin:-.25rem 0 .75rem;">Terbitkan setelah barang diterima. Tanggal berita acara otomatis mengikuti hari ini.</p>
      <table class="data-table" style="border:none;margin-bottom:.75rem;">
        <tr><td class="text-muted">Nomor</td><td><b>${n.NoNota}</b></td></tr>
        <tr><td class="text-muted">Tanggal</td><td>${tglHariIni}</td></tr>
        <tr><td class="text-muted">Pihak Pertama<br>(yang menyerahkan)</td><td>${htmlPihakBast(v)}</td></tr>
        <tr><td class="text-muted">Pihak Kedua<br>(yang menerima)</td><td id="pratinjauPihakKedua">${htmlPihakBast(pemohon)}</td></tr>
      </table>
      <div style="font-weight:600;font-size:13px;margin-bottom:.25rem;">Barang yang diserahkan</div>
      <div class="text-muted" style="font-size:12px;margin-bottom:.5rem;">Ubah jumlahnya bila stok berkurang saat pengambilan. Jumlah tidak boleh melebihi yang disetujui, dan keterangan wajib diisi bila kurang. Stok gudang otomatis berkurang sesuai jumlah yang diserahkan.</div>
      <div class="table-wrap" style="margin-bottom:1rem;"><table class="data-table">
        <thead><tr><th>Barang</th><th>Disetujui</th><th>Diserahkan</th><th>Keterangan</th></tr></thead>
        <tbody>${items.filter(it => (Number(it.JumlahDisetujui) || 0) > 0).map(it => {
          const d = Number(it.JumlahDisetujui);
          return `<tr class="baris-serah" data-id="${esc(it.ID)}" data-disetujui="${d}" data-nama="${esc(it.NamaBarang)}">
            <td>${esc(it.NamaBarang)}</td>
            <td style="white-space:nowrap;">${d} ${esc(it.Satuan)}</td>
            <td><input type="number" class="inputSerah" min="0" max="${d}" value="${d}" style="width:80px;padding:.4rem .5rem;border:1px solid #CBD5E1;border-radius:6px;font:inherit;"></td>
            <td><input class="inputKetSerah" placeholder="Wajib bila kurang" style="width:100%;min-width:160px;padding:.4rem .5rem;border:1px solid #CBD5E1;border-radius:6px;font:inherit;"></td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>
      <label style="display:flex;align-items:center;gap:.5rem;font-size:13px;font-weight:600;cursor:pointer;">
        <input type="checkbox" id="cbDiwakilkan" style="width:auto;margin:0;"> Barang diambil oleh orang lain (bukan pemohon)
      </label>
      <div id="wakilWrap" style="display:none;margin-top:.75rem;">
        <div class="field"><label>Penerima barang</label>
          <select id="wakilPilih"><option value="">-- pilih pegawai --</option>${calon.map((p, i) => `<option value="${i}">${esc(p.Nama)}${p.Jabatan ? ' — ' + esc(p.Jabatan) : ''}</option>`).join('')}<option value="__manual__">Tidak terdaftar di sistem (isi manual)</option></select></div>
        <div id="wakilManual" style="display:none;">
          <div class="grid-2">
            <div class="field"><label>Nama penerima</label><input id="wakilNama"></div>
            <div class="field"><label>NIP (kosongkan bila tidak ada)</label><input id="wakilNip"></div>
          </div>
          <div class="field"><label>Jabatan penerima</label><input id="wakilJabatan" placeholder="mis. Pengemudi, Tenaga Honorer"></div>
        </div>
      </div>
      <div id="bannerJabatan" class="info-banner info-warning" style="display:none;margin-top:.75rem;">Jabatan yang kosong akan tertulis "-" di berita acara. Minta Admin mengisinya di menu Data Master → Pegawai sebelum menerbitkan.</div>
      <button class="btn btn-primary" id="btnTerbitkanBast" style="margin-top:.75rem;">📝 Terbitkan Berita Acara</button>
      <div style="margin-top:1.25rem;padding-top:1rem;border-top:1px solid var(--border-subtle);">
        <div class="text-muted" style="font-size:12px;margin-bottom:.5rem;">Semua barang ternyata habis saat diambil?</div>
        <button type="button" class="btn btn-danger btn-sm" id="btnTampilBatal">Batalkan: stok tidak tersedia</button>
        <div id="wrapBatal" style="display:none;margin-top:.75rem;">
          <div class="field"><label>Alasan pembatalan (wajib)</label><textarea id="alasanBatal" placeholder="mis. Seluruh barang habis saat pemohon datang mengambil"></textarea></div>
          <button type="button" class="btn btn-danger" id="btnKonfirmasiBatal">Konfirmasi Pembatalan</button>
        </div>
      </div>
    </div>`;
  }

  return '';
}

function esc(x) {
  return String(x === undefined || x === null ? '' : x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Nama, NIP, jabatan satu pihak di pratinjau Berita Acara
function htmlPihakBast(p) {
  return `<b>${esc(p.nama)}</b><br>NIP. ${esc(p.nip) || '-'}<br>${p.jabatan ? esc(p.jabatan) : '<span class="text-danger">Jabatan belum diisi</span>'}`;
}

// Aksi pada satu nota: hasilnya langsung tampil, pengiriman ke server di latar belakang
function aksiNotaInstan(n, aksi, data, pesan, ubahNota, tambahan) {
  return kirimInstan({ kunci: n.NoNota, aksi, data, pesan, ubahLokal: ubahNota, tambahan }).catch(() => {});
}

function attachDetailActionHandlers(n, items, res) {
  const nilai = (id) => (document.getElementById(id) ? document.getElementById(id).value.trim() : '');

  // --- Atasan Mengetahui ---
  document.getElementById('btnSetujuiMengetahui')?.addEventListener('click', () => {
    const catatan = nilai('catatanMengetahui');
    aksiNotaInstan(n, 'approveMengetahui', { noNota: n.NoNota, atasanEmail: currentUser.email, disetujui: true, catatan },
      'Nota berhasil diparaf (mengetahui) dan diteruskan ke Bagian Perlengkapan.', () => {
        Object.assign(n, {
          Status: 'Diketahui', AtasanMengetahuiNama: currentUser.nama, AtasanMengetahuiNIP: nipSaya(),
          TglDiketahui: sekarangWib(), CatatanMengetahui: catatan || 'Disetujui sesuai kuota.', QRKiriKode: ''
        });
        logLokal(n.NoNota, 'Paraf Mengetahui', catatan || '-');
      });
  });
  document.getElementById('btnTolakMengetahui')?.addEventListener('click', () => {
    if (!confirm('Yakin ingin menolak nota ini?')) return;
    const catatan = nilai('catatanMengetahui');
    aksiNotaInstan(n, 'approveMengetahui', { noNota: n.NoNota, atasanEmail: currentUser.email, disetujui: false, catatan },
      'Nota ditolak.', () => {
        Object.assign(n, { Status: 'Ditolak', CatatanMengetahui: catatan || 'Ditolak oleh atasan bidang.' });
        logLokal(n.NoNota, 'Tolak (Mengetahui)', catatan || '-');
      });
  });

  // --- Perlengkapan: pilih keputusan tiap barang ---
  document.querySelectorAll('.item-review').forEach(card => {
    card.querySelectorAll('.decision-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        card.querySelectorAll('.decision-btn').forEach(b => b.className = 'decision-btn');
        btn.classList.add('selected-' + btn.dataset.decision.toLowerCase());
        card.dataset.decision = btn.dataset.decision;
        card.querySelector('[data-field="jumlah"]').style.display = btn.dataset.decision === 'Sebagian' ? 'block' : 'none';
        card.querySelector('[data-field="alasan"]').style.display = btn.dataset.decision !== 'Penuh' ? 'block' : 'none';
      });
    });
  });
  document.getElementById('btnSimpanPemeriksaan')?.addEventListener('click', () => {
    const payload = [];
    for (const card of document.querySelectorAll('.item-review')) {
      const nama = card.querySelector('.item-review-head b').textContent;
      const keputusan = card.dataset.decision;
      if (!keputusan) return showToast('Pilih keputusan untuk "' + nama + '".', 'error');
      const diminta = Number(card.dataset.diminta);
      const jumlah = Number(card.querySelector('.jumlahDisetujuiInput').value);
      const alasan = card.querySelector('.alasanInput').value.trim();
      if (keputusan === 'Sebagian' && !(jumlah >= 1 && jumlah < diminta)) {
        return showToast('Jumlah disetujui untuk "' + nama + '" harus 1 sampai ' + (diminta - 1) + '.', 'error');
      }
      if (keputusan !== 'Penuh' && !alasan) return showToast('Isi alasan untuk "' + nama + '".', 'error');
      payload.push({
        id: card.dataset.id,
        statusItem: keputusan,
        jumlahDisetujui: keputusan === 'Sebagian' ? jumlah : '',
        alasan: keputusan === 'Penuh' ? '' : alasan,
        diminta: diminta
      });
    }
    const semuaDitolak = payload.every(p => p.statusItem === 'Ditolak');
    if (semuaDitolak && !confirm('Semua barang ditolak. Nota akan berstatus Ditolak dan tidak diteruskan ke Sekretaris. Lanjutkan?')) return;
    const semuaPenuh = payload.every(p => p.statusItem === 'Penuh');
    const hasil = semuaDitolak ? 'Ditolak' : semuaPenuh ? 'Disetujui Penuh' : 'Disetujui Sebagian';
    const catatan = nilai('catatanPemeriksaan');
    aksiNotaInstan(n, 'periksaStok', {
      noNota: n.NoNota, petugasEmail: currentUser.email, catatan,
      items: payload.map(p => ({ id: p.id, statusItem: p.statusItem, jumlahDisetujui: p.jumlahDisetujui, alasan: p.alasan }))
    }, semuaDitolak
      ? 'Semua barang ditolak, nota berstatus Ditolak dan pemohon telah diberi tahu.'
      : 'Hasil pemeriksaan stok tersimpan (' + hasil + '). Nota diteruskan ke Sekretaris.', () => {
      payload.forEach(p => {
        const it = items.find(x => String(x.ID) === String(p.id));
        if (!it) return;
        it.StatusItem = p.statusItem;
        it.JumlahDisetujui = p.statusItem === 'Penuh' ? p.diminta : p.statusItem === 'Ditolak' ? 0 : p.jumlahDisetujui;
        it.Alasan = p.alasan;
      });
      Object.assign(n, {
        PemeriksaNama: currentUser.nama, PemeriksaNIP: nipSaya(), TglDiperiksa: sekarangWib(),
        CatatanPemeriksaan: catatan, HasilPersetujuan: hasil, Status: semuaDitolak ? 'Ditolak' : ST_DIPERIKSA
      });
      logLokal(n.NoNota, 'Periksa Stok', semuaDitolak ? 'Semua barang ditolak. Nota berstatus Ditolak.' : 'Hasil pemeriksaan: ' + hasil + '.');
    });
  });

  // --- Atasan Menyetujui ---
  document.getElementById('btnSetujuiSekretaris')?.addEventListener('click', () => {
    if (!confirm('Setujui nota ini? QR tanda tangan kanan akan terbit dan pemohon diberi tahu untuk mengambil barang.')) return;
    const catatan = nilai('catatanMenyetujui');
    aksiNotaInstan(n, 'approveMenyetujui', { noNota: n.NoNota, atasanEmail: currentUser.email, disetujui: true, catatan },
      'Nota disetujui. QR tanda tangan kanan terbit dan pemohon diberi tahu untuk mengambil barang.', () => {
        const waktu = sekarangWib();
        Object.assign(n, {
          Status: 'Diproses', AtasanMenyetujuiNama: currentUser.nama, AtasanMenyetujuiNIP: nipSaya(),
          TglDisetujui: waktu, TglDiproses: waktu, CatatanDisetujui: catatan, QRKananKode: ''
        });
        logLokal(n.NoNota, 'Setujui (Menyetujui)', 'Menyetujui hasil pemeriksaan stok: ' + (n.HasilPersetujuan || 'Disetujui') + '.');
      });
  });
  document.getElementById('btnTolakSekretaris')?.addEventListener('click', () => {
    const catatan = nilai('catatanMenyetujui');
    if (!catatan) {
      showToast('Tuliskan alasan penolakan pada kolom Catatan terlebih dahulu.', 'error');
      document.getElementById('catatanMenyetujui')?.focus();
      return;
    }
    if (!confirm('Tolak nota ini?\n\nNota akan berstatus Ditolak, pemohon dan Bagian Perlengkapan diberi tahu. Tindakan ini tidak dapat dibatalkan.')) return;
    aksiNotaInstan(n, 'approveMenyetujui', { noNota: n.NoNota, atasanEmail: currentUser.email, disetujui: false, catatan },
      'Nota ditolak. Pemohon dan Bagian Perlengkapan telah diberi tahu.', () => {
        Object.assign(n, {
          Status: 'Ditolak', DitolakOleh: 'Sekretaris', PenolakNama: currentUser.nama,
          TglDitolak: sekarangWib(), AlasanPenolakan: catatan
        });
        logLokal(n.NoNota, 'Tolak (Menyetujui)', catatan);
      });
  });

  // --- Perlengkapan: Berita Acara Serah Terima (penerima bisa diwakilkan) ---
  const cbWakil = document.getElementById('cbDiwakilkan');
  if (cbWakil) {
    const pemohon = { nama: n.PemohonNama, nip: n.PemohonNIP, jabatan: res.pemohonJabatan, email: n.PemohonEmail };
    const pertama = res.viewer || { nama: currentUser.nama, nip: currentUser.nip, jabatan: '' };
    const jabatanPertama = pertama.jabatan;
    const sel = document.getElementById('wakilPilih');
    const daftarPegawai = daftarCalonPenerima(pemohon);

    const penerimaSaatIni = () => {
      if (!cbWakil.checked) return Object.assign({ mode: 'pemohon' }, pemohon);
      if (sel.value === '__manual__') return { mode: 'manual', nama: nilai('wakilNama'), nip: nilai('wakilNip'), jabatan: nilai('wakilJabatan') };
      const p = sel.value === '' ? null : daftarPegawai[Number(sel.value)];
      return p ? { mode: 'pegawai', email: p.Email || '', nama: p.Nama, nip: p.NIP || '', jabatan: p.Jabatan || '' } : { mode: 'kosong' };
    };
    const perbarui = () => {
      const p = penerimaSaatIni();
      document.getElementById('wakilManual').style.display = cbWakil.checked && sel.value === '__manual__' ? 'block' : 'none';
      let html;
      if (p.mode === 'kosong') html = '<span class="text-muted">Pilih penerima barang</span>';
      else if (p.mode === 'manual' && !p.nama) html = '<span class="text-muted">Isi nama & jabatan penerima</span>';
      else html = htmlPihakBast(p) + (p.mode !== 'pemohon' ? `<br><span class="text-muted" style="font-size:11.5px;">mewakili ${esc(pemohon.nama)}</span>` : '');
      document.getElementById('pratinjauPihakKedua').innerHTML = html;
      const jabatanKeduaKosong = (p.mode === 'pemohon' || p.mode === 'pegawai') && !p.jabatan;
      document.getElementById('bannerJabatan').style.display = (!jabatanPertama || jabatanKeduaKosong) ? 'block' : 'none';
    };

    cbWakil.addEventListener('change', () => {
      document.getElementById('wakilWrap').style.display = cbWakil.checked ? 'block' : 'none';
      perbarui();
    });
    sel.addEventListener('change', perbarui);
    ['wakilNama', 'wakilNip', 'wakilJabatan'].forEach(id => document.getElementById(id).addEventListener('input', perbarui));
    perbarui();

    // Jumlah diserahkan per barang: tandai keterangan yang wajib diisi
    const kumpulkanSerah = () => {
      const hasil = [];
      for (const tr of document.querySelectorAll('.baris-serah')) {
        const nama = tr.dataset.nama;
        const disetujui = Number(tr.dataset.disetujui);
        const teksJumlah = tr.querySelector('.inputSerah').value.trim();
        const jumlah = Number(teksJumlah);
        const ket = tr.querySelector('.inputKetSerah').value.trim();
        if (teksJumlah === '' || !Number.isInteger(jumlah) || jumlah < 0 || jumlah > disetujui) {
          return { error: 'Jumlah diserahkan untuk "' + nama + '" harus 0 sampai ' + disetujui + '.' };
        }
        if (jumlah < disetujui && !ket) return { error: 'Isi keterangan untuk "' + nama + '" karena jumlah diserahkan kurang dari yang disetujui.' };
        hasil.push({ id: tr.dataset.id, jumlahDiserahkan: jumlah, keterangan: ket, nama: nama, disetujui: disetujui });
      }
      if (!hasil.some(h => h.jumlahDiserahkan > 0)) {
        return { error: 'Tidak ada barang yang diserahkan. Bila semua stok habis, gunakan tombol "Batalkan: stok tidak tersedia".' };
      }
      return { hasil: hasil };
    };
    document.querySelectorAll('.baris-serah').forEach(tr => {
      const tandai = () => {
        const kurang = Number(tr.querySelector('.inputSerah').value) < Number(tr.dataset.disetujui);
        const ket = tr.querySelector('.inputKetSerah');
        ket.style.borderColor = kurang && !ket.value.trim() ? 'var(--status-danger-text)' : '#CBD5E1';
      };
      tr.querySelector('.inputSerah').addEventListener('input', tandai);
      tr.querySelector('.inputKetSerah').addEventListener('input', tandai);
    });

    document.getElementById('btnTerbitkanBast').addEventListener('click', () => {
      const p = penerimaSaatIni();
      if (p.mode === 'kosong') return showToast('Pilih penerima barang terlebih dahulu.', 'error');
      if (p.mode === 'manual' && (!p.nama || !p.jabatan)) return showToast('Isi nama dan jabatan penerima barang.', 'error');
      const serah = kumpulkanSerah();
      if (serah.error) return showToast(serah.error, 'error');
      const kurang = serah.hasil.filter(h => h.jumlahDiserahkan < h.disetujui);
      let pesan = p.mode === 'pemohon'
        ? 'Pastikan pemohon (' + pemohon.nama + ') sudah menerima barang.'
        : 'Barang diterima oleh ' + p.nama + ' mewakili ' + pemohon.nama + '. Pemohon akan diberi tahu lewat email.';
      if (kurang.length) {
        pesan += '\n\nBarang yang tidak diserahkan penuh:\n' + kurang.map(h => '- ' + h.nama + ': ' + h.jumlahDiserahkan + ' dari ' + h.disetujui).join('\n');
      }
      if (!confirm(pesan + '\n\nTerbitkan Berita Acara Serah Terima sekarang?')) return;
      const penerima = p.mode === 'pemohon' ? { mode: 'pemohon' }
        : p.mode === 'pegawai' ? { mode: 'pegawai', email: p.email, nip: p.nip, nama: p.nama }
        : { mode: 'manual', nama: p.nama, nip: p.nip, jabatan: p.jabatan };
      const mewakili = p.mode !== 'pemohon';
      const pihakKedua = mewakili ? p : pemohon;
      aksiNotaInstan(n, 'terbitkanBast', {
        noNota: n.NoNota, petugasEmail: currentUser.email, penerima,
        serah: serah.hasil.map(h => ({ id: h.id, jumlahDiserahkan: h.jumlahDiserahkan, keterangan: h.keterangan }))
      }, 'Berita Acara Serah Terima terbit' + (mewakili ? ' (penerima: ' + p.nama + ', mewakili pemohon)' : '') +
        (kurang.length ? '. ' + kurang.length + ' barang tidak diserahkan penuh' : '') + '. Status nota menjadi Selesai.', (kunci) => {
        const waktu = sekarangWib();
        kurangiStokLokal(kunci, n.NoNota, serah.hasil.map(h => ({ nama: h.nama, jumlah: h.jumlahDiserahkan })));
        items.forEach(it => {
          const h = serah.hasil.find(x => String(x.id) === String(it.ID));
          it.JumlahDiserahkan = h ? h.jumlahDiserahkan : (Number(it.JumlahDisetujui) || 0);
          it.KeteranganSerah = h ? h.keterangan : '';
        });
        Object.assign(n, {
          Status: 'Selesai', TglSelesai: waktu, PetugasGudang: currentUser.nama, BastTanggal: waktu,
          BastPihakPertamaNama: pertama.nama, BastPihakPertamaNIP: pertama.nip, BastPihakPertamaJabatan: pertama.jabatan || '',
          BastPihakKeduaNama: pihakKedua.nama, BastPihakKeduaNIP: pihakKedua.nip || '', BastPihakKeduaJabatan: pihakKedua.jabatan || '',
          QRBastKiriKode: '', QRBastKananKode: ''
        });
        logLokal(n.NoNota, 'Terbitkan Berita Acara', mewakili
          ? 'Barang diterima oleh ' + p.nama + ' mewakili pemohon (' + pemohon.nama + ').'
          : 'Barang diserahkan kepada ' + pemohon.nama + '.');
      }, ['barang', 'logStok']);
    });

    // Semua stok habis saat diambil -> batalkan serah terima
    document.getElementById('btnTampilBatal').addEventListener('click', () => {
      const w = document.getElementById('wrapBatal');
      w.style.display = w.style.display === 'none' ? 'block' : 'none';
    });
    document.getElementById('btnKonfirmasiBatal').addEventListener('click', () => {
      const alasan = nilai('alasanBatal');
      if (!alasan) return showToast('Isi alasan pembatalan.', 'error');
      if (!confirm('Batalkan serah terima nota ini?\n\nNota akan berstatus Ditolak dan pemohon diberi tahu. Tindakan ini tidak bisa diurungkan.')) return;
      aksiNotaInstan(n, 'batalkanSerahTerima', { noNota: n.NoNota, petugasEmail: currentUser.email, alasan },
        'Serah terima dibatalkan. Nota berstatus Ditolak dan pemohon telah diberi tahu.', () => {
          Object.assign(n, { Status: 'Ditolak', AlasanPembatalan: alasan, PetugasGudang: currentUser.nama });
          logLokal(n.NoNota, 'Batalkan Serah Terima', 'Stok tidak tersedia saat pengambilan. Alasan: ' + alasan);
        });
    });
  }
}

// ------------------------------------------------------------
// LAPORAN & REKAP (dihitung langsung dari data lokal)
// ------------------------------------------------------------
function renderLaporan(content) {
  const res = hitungLaporan();
  content.innerHTML = `
  <h2 class="section-title">📊 Laporan & Rekapitulasi</h2>
  <div class="stats-grid">
    <div class="card"><div class="stat-value">${res.totalNota}</div><div class="stat-label">TOTAL NOTA</div></div>
    ${TAHAP.map(t => `<div class="card"><div class="stat-value">${res.statusCount[t.status] || 0}</div><div class="stat-label">${t.label.toUpperCase()}</div></div>`).join('')}
    <div class="card"><div class="stat-value">${res.statusCount['Ditolak'] || 0}</div><div class="stat-label">DITOLAK</div></div>
  </div>
  <div class="two-col">
    <div class="card">
      <h3 class="section-title" style="font-size:15px;">Riwayat Nota</h3>
      <div class="table-wrap">${renderNotaTable(res.daftarNota.slice(0, 20))}</div>
    </div>
    <div class="card">
      <h3 class="section-title" style="font-size:15px;">Barang Paling Sering Diminta</h3>
      ${res.barangTerbanyak.map(b => `<div class="flex-between" style="padding:.4rem 0;border-bottom:1px solid var(--surface-subtle);"><span>${esc(b.nama)}</span><b>${b.jumlah}</b></div>`).join('') || '<div class="text-muted">Belum ada data.</div>'}
    </div>
  </div>`;
}

// ------------------------------------------------------------
// GANTI PASSWORD (semua role) — tetap menunggu jawaban server
// ------------------------------------------------------------
function renderGantiPassword(content) {
  content.innerHTML = `
  <h2 class="section-title">🔑 Ganti Kata Sandi</h2>
  <div class="card" style="max-width:480px;">
    <div class="field"><label>Kata Sandi Lama</label>
      <div class="password-wrap"><input type="password" id="oldPass"><button type="button" class="password-toggle" onclick="togglePasswordVisibility(this)">👁️</button></div>
    </div>
    <div class="field"><label>Kata Sandi Baru</label>
      <div class="password-wrap"><input type="password" id="newPass" placeholder="Minimal 6 karakter"><button type="button" class="password-toggle" onclick="togglePasswordVisibility(this)">👁️</button></div>
    </div>
    <div class="field"><label>Ulangi Kata Sandi Baru</label>
      <div class="password-wrap"><input type="password" id="confirmPass"><button type="button" class="password-toggle" onclick="togglePasswordVisibility(this)">👁️</button></div>
    </div>
    <button class="btn btn-primary" id="btnGantiPass">Simpan Kata Sandi Baru</button>
  </div>`;

  document.getElementById('btnGantiPass').addEventListener('click', async () => {
    const oldPassword = document.getElementById('oldPass').value;
    const newPassword = document.getElementById('newPass').value;
    const confirmPassword = document.getElementById('confirmPass').value;
    if (!oldPassword || !newPassword || !confirmPassword) return showToast('Semua kolom wajib diisi.', 'error');
    if (newPassword !== confirmPassword) return showToast('Konfirmasi kata sandi baru tidak cocok.', 'error');
    if (newPassword.length < 6) return showToast('Kata sandi baru minimal 6 karakter.', 'error');

    const btn = document.getElementById('btnGantiPass');
    btn.disabled = true; btn.textContent = 'Menyimpan...';
    try {
      const res = await apiPost('changePassword', { email: currentUser.email, oldPassword, newPassword });
      showToast(res.message);
      document.getElementById('oldPass').value = '';
      document.getElementById('newPass').value = '';
      document.getElementById('confirmPass').value = '';
    } catch (err) { /* toast sudah tampil */ }
    btn.disabled = false; btn.textContent = 'Simpan Kata Sandi Baru';
  });
}

// ------------------------------------------------------------
// MODAL sederhana — dipakai untuk form Edit di Data Master
// ------------------------------------------------------------
function openModal(innerHtml) {
  closeModal();
  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  wrap.id = 'modalBackdrop';
  wrap.innerHTML = `<div class="modal-box">${innerHtml}</div>`;
  wrap.addEventListener('click', (e) => { if (e.target === wrap) closeModal(); });
  document.body.appendChild(wrap);
}
function closeModal() {
  document.getElementById('modalBackdrop')?.remove();
}

// Konversi base64 -> Object URL blob, dipakai untuk preview PDF tanpa unduh paksa.
function base64ToBlobUrl(base64, mimeType) {
  const byteChars = atob(base64);
  const byteArray = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteArray[i] = byteChars.charCodeAt(i);
  const blob = new Blob([byteArray], { type: mimeType });
  return URL.createObjectURL(blob);
}

// Jendela PDF langsung terbuka (dengan tanda memuat), lalu PDF-nya menyusul.
// PDF yang sudah pernah dibuka tampil seketika selama isi nota tidak berubah.
function lihatPdfNota(noNota) {
  document.getElementById('pdfModalBackdrop')?.remove();
  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  wrap.id = 'pdfModalBackdrop';
  wrap.innerHTML = `
    <div class="modal-box" style="max-width:920px;width:95vw;height:90vh;padding:0;display:flex;flex-direction:column;">
      <div class="flex-between" style="padding:.75rem 1rem;border-bottom:1px solid var(--border-subtle);flex-shrink:0;">
        <b>${esc(noNota)}.pdf</b>
        <button class="btn btn-outline btn-sm" id="closePdfModalBtn">✕ Tutup</button>
      </div>
      <div id="pdfIsi" style="flex:1;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:.75rem;">
        <span class="loading-spin" style="width:28px;height:28px;border-width:3px;"></span>
        <div class="text-muted" style="font-size:13px;text-align:center;">Menyiapkan PDF…<br><span style="font-size:12px;">Pertama kali biasanya 3–8 detik, berikutnya langsung tampil.</span></div>
      </div>
    </div>`;
  let blobUrl = null;
  const tutup = () => { if (blobUrl) URL.revokeObjectURL(blobUrl); wrap.remove(); };
  wrap.addEventListener('click', (e) => { if (e.target === wrap) tutup(); });
  document.body.appendChild(wrap);
  document.getElementById('closePdfModalBtn').addEventListener('click', tutup);

  ambilPdfNota(noNota).then(pdf => {
    if (!document.body.contains(wrap)) return;
    blobUrl = base64ToBlobUrl(pdf.base64, 'application/pdf');
    wrap.querySelector('#pdfIsi').outerHTML = `<iframe src="${blobUrl}" style="flex:1;border:none;width:100%;"></iframe>`;
  }).catch(err => {
    if (!document.body.contains(wrap)) return;
    wrap.querySelector('#pdfIsi').innerHTML = `<div style="font-size:28px;">⚠️</div><div style="text-align:center;padding:0 1rem;">PDF gagal dibuat: ${esc(err.message)}</div>`;
  });
}

function unduhPdfNota(noNota) {
  const btn = document.getElementById('unduhPdfBtn');
  const teksAsli = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = 'Menyiapkan...'; }
  ambilPdfNota(noNota).then(pdf => {
    const link = document.createElement('a');
    link.href = 'data:application/pdf;base64,' + pdf.base64;
    link.download = pdf.filename;
    link.click();
  }).catch(err => showToast('PDF gagal dibuat: ' + err.message, 'error', 6000))
    .finally(() => {
      const b = document.getElementById('unduhPdfBtn');
      if (b) { b.disabled = false; b.textContent = teksAsli || '⬇️ Unduh PDF'; }
    });
}

// ------------------------------------------------------------
// PANDUAN (semua role melihat, Admin bisa tambah/hapus)
// ------------------------------------------------------------
function getYoutubeEmbedUrl(url) {
  if (!url) return null;
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?&]+)/,
    /youtube\.com\/embed\/([^?&]+)/,
    /youtube\.com\/shorts\/([^?&]+)/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return 'https://www.youtube.com/embed/' + m[1];
  }
  return null;
}

function renderPanduan(content) {
  const list = urutkanTerbaru(store.panduan.filter(p => p.ID || p.Judul));
  const isAdmin = currentUser.role === 'Admin';

  content.innerHTML = `
  <div class="flex-between">
    <h2 class="section-title">📚 Panduan Pengisian Nota</h2>
    ${isAdmin ? '<button class="btn btn-primary btn-sm" id="tambahPanduanBtn">➕ Tambah Panduan</button>' : ''}
  </div>
  <p class="text-muted" style="margin-top:-.5rem;margin-bottom:1rem;">Kumpulan dokumen dan video panduan pengisian Nota Permintaan Barang.</p>
  <div id="panduanList" class="grid-cards"></div>`;

  const wrap = document.getElementById('panduanList');
  if (!list.length) {
    wrap.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">Belum ada panduan yang ditambahkan.</div>`;
  } else {
    wrap.innerHTML = list.map(p => {
      const sementara = String(p.ID).indexOf('SEMENTARA-') === 0;
      const hapusBtn = isAdmin && !sementara ? `<button class="btn btn-outline btn-sm" onclick="hapusPanduan('${esc(p.ID)}')">🗑️ Hapus</button>` : '';
      const tandaSimpan = sementara ? '<div class="text-muted" style="font-size:12px;margin-top:.4rem;">⏳ Menyimpan…</div>' : '';
      if (p.Jenis === 'PDF') {
        return `<div class="card">
          <div style="font-size:32px;">📄</div>
          <h3 style="font-size:15px;margin:.5rem 0 .25rem;">${esc(p.Judul)}</h3>
          ${p.Deskripsi ? `<p class="text-muted" style="font-size:12.5px;">${esc(p.Deskripsi)}</p>` : ''}
          <div style="display:flex;gap:.5rem;margin-top:.75rem;flex-wrap:wrap;">
            <a href="${esc(p.URL)}" target="_blank" class="btn btn-outline btn-sm">Buka PDF</a>
            ${hapusBtn}
          </div>${tandaSimpan}
        </div>`;
      }
      const embed = getYoutubeEmbedUrl(p.URL);
      return `<div class="card">
        <h3 style="font-size:15px;margin:0 0 .6rem;">${esc(p.Judul)}</h3>
        ${embed
          ? `<div style="position:relative;padding-bottom:56.25%;height:0;border-radius:8px;overflow:hidden;"><iframe src="${embed}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;" allowfullscreen loading="lazy"></iframe></div>`
          : `<a href="${esc(p.URL)}" target="_blank">${esc(p.URL)}</a>`}
        ${p.Deskripsi ? `<p class="text-muted" style="font-size:12.5px;margin-top:.6rem;">${esc(p.Deskripsi)}</p>` : ''}
        ${hapusBtn ? `<div style="margin-top:.6rem;">${hapusBtn}</div>` : ''}${tandaSimpan}
      </div>`;
    }).join('');
  }

  if (isAdmin) {
    document.getElementById('tambahPanduanBtn').addEventListener('click', () => {
      openModal(`
        <h3 class="section-title" style="font-size:16px;">Tambah Panduan</h3>
        <div class="field"><label>Jenis Panduan</label>
          <select id="pJenis"><option value="PDF">Dokumen PDF</option><option value="Video">Video YouTube</option></select>
        </div>
        <div class="field"><label>Judul</label><input id="pJudul" placeholder="mis. Cara Mengisi Nota Permintaan Barang"></div>
        <div class="field"><label>Deskripsi (opsional)</label><textarea id="pDeskripsi"></textarea></div>
        <div class="field" id="pFileWrap"><label>File PDF</label><input type="file" id="pFile" accept="application/pdf"></div>
        <div class="field" id="pUrlWrap" style="display:none;"><label>URL Video YouTube</label><input id="pUrl" placeholder="https://youtube.com/watch?v=..."></div>
        <button class="btn btn-primary" id="pSaveBtn">Simpan Panduan</button>`);

      document.getElementById('pJenis').addEventListener('change', (e) => {
        document.getElementById('pFileWrap').style.display = e.target.value === 'PDF' ? 'block' : 'none';
        document.getElementById('pUrlWrap').style.display = e.target.value === 'Video' ? 'block' : 'none';
      });

      document.getElementById('pSaveBtn').addEventListener('click', async () => {
        const jenis = document.getElementById('pJenis').value;
        const judul = document.getElementById('pJudul').value.trim();
        const deskripsi = document.getElementById('pDeskripsi').value.trim();
        if (!judul) return showToast('Judul wajib diisi.', 'error');

        if (jenis === 'Video') {
          const url = document.getElementById('pUrl').value.trim();
          if (!url) return showToast('URL video YouTube wajib diisi.', 'error');
          closeModal();
          kirimInstan({
            tabel: ['panduan'], aksi: 'addPanduanVideo',
            data: { judul, deskripsi, youtubeUrl: url, uploaderEmail: currentUser.email },
            pesan: 'Panduan berhasil ditambahkan.',
            ubahLokal: () => store.panduan.push({ ID: 'SEMENTARA-' + Date.now(), Judul: judul, Deskripsi: deskripsi, Jenis: 'Video', URL: url, NamaFile: '', UploadedBy: currentUser.email, CreatedAt: sekarangWib() })
          }).catch(() => {});
          return;
        }

        // Unggah file PDF tetap ditunggu sampai selesai
        const file = document.getElementById('pFile').files[0];
        if (!file) return showToast('Pilih file PDF terlebih dahulu.', 'error');
        const btn = document.getElementById('pSaveBtn');
        btn.disabled = true; btn.textContent = 'Mengunggah...';
        try {
          const base64 = await fileToBase64(file);
          const res = await apiPost('addPanduanPdf', { judul, deskripsi, fileBase64: base64, fileName: file.name, mimeType: file.type, uploaderEmail: currentUser.email }, { timeout: 180000 });
          terapkanPaket(res);
          simpanDataLokal();
          if (store.perluSinkron) { store.perluSinkron = false; jadwalkanSinkron(300); }
          showToast('Panduan berhasil ditambahkan.');
          closeModal();
          router({ ulang: true });
        } catch (err) { btn.disabled = false; btn.textContent = 'Simpan Panduan'; }
      });
    });
  }
}

window.hapusPanduan = function (id) {
  if (!confirm('Hapus panduan ini?')) return;
  kirimInstan({
    tabel: ['panduan'], aksi: 'deletePanduan', data: { id },
    pesan: 'Panduan dihapus.',
    ubahLokal: () => { store.panduan = store.panduan.filter(p => String(p.ID) !== String(id)); }
  }).catch(() => {});
};

// ------------------------------------------------------------
// DATA MASTER (Admin) — perubahan langsung tampil, disimpan di latar belakang
// ------------------------------------------------------------
let tabMasterAktif = 'barang';

function aksiMaster(jenis, aksi, data, pesan, ubah, sesudahBerhasil) {
  closeModal();
  return kirimInstan({ tabel: Array.isArray(jenis) ? jenis : [jenis], aksi, data, pesan, ubahLokal: ubah, sesudahBerhasil }).catch(() => {});
}

// Admin: Barang, Pegawai, Bidang. Bagian Perlengkapan: Master Barang saja.
function renderDataMaster(content) {
  const hanyaBarang = currentUser.role === 'Perlengkapan';
  if (currentUser.role !== 'Admin' && !hanyaBarang) { content.innerHTML = '<div class="empty-state">Halaman ini khusus Admin dan Bagian Perlengkapan.</div>'; return; }
  const master = store; // barang, pegawai, bidang
  const tabAwal = hanyaBarang ? 'barang' : tabMasterAktif;

  content.innerHTML = hanyaBarang ? `
  <div class="flex-between" style="flex-wrap:wrap;gap:.75rem;margin-bottom:.25rem;">
    <h2 class="section-title" style="margin:0;">🗂️ Kelola Master Barang</h2>
    <a href="#/stok-barang" class="btn btn-outline btn-sm">🗃️ Lihat Stok Barang</a>
  </div>
  <p class="text-muted" style="font-size:13px;margin:.25rem 0 1rem;">Tambah, ubah, atau hapus barang yang bisa dipilih pegawai saat membuat nota.</p>
  <div class="card" id="masterContent"></div>` : `
  <h2 class="section-title">⚙️ Kelola Data Master</h2>
  <div class="chip-row" id="masterTabs">
    <span class="chip-filter ${tabAwal === 'barang' ? 'active' : ''}" data-tab="barang">Barang</span>
    <span class="chip-filter ${tabAwal === 'pegawai' ? 'active' : ''}" data-tab="pegawai">Pegawai</span>
    <span class="chip-filter ${tabAwal === 'bidang' ? 'active' : ''}" data-tab="bidang">Bidang</span>
  </div>
  <div class="card" id="masterContent"></div>`;

  const val = (id) => document.getElementById(id).value;
  const jsArg = (x) => esc(JSON.stringify(String(x === undefined || x === null ? '' : x)));

  function renderTab(tab) {
    const box = document.getElementById('masterContent');
    if (tab === 'barang') {
      box.innerHTML = `
        <div class="grid-2" style="align-items:end;">
          <div class="field"><label>Nama Barang</label><input id="mNama"></div>
          <div class="field"><label>Satuan</label><input id="mSatuan"></div>
        </div>
        <div class="grid-2" style="align-items:end;">
          <div class="field"><label>Stok awal (opsional)</label><input id="mStok" type="number" min="0" placeholder="Kosongkan bila belum dihitung"></div>
          <div class="field-hint" style="margin-bottom:1rem;">Stok selanjutnya diatur di menu <a href="#/stok-barang">Stok Barang</a>.</div>
        </div>
        <button class="btn btn-primary btn-sm" id="mAddBtn">Tambah Barang</button>
        <div class="flex-between" style="flex-wrap:wrap;gap:.6rem;margin-top:1.25rem;">
          <div style="font-weight:600;font-size:13px;">Daftar barang (${master.barang.length})</div>
          <input id="mCariBarang" placeholder="🔍 Cari nama barang…" style="max-width:260px;width:100%;padding:.45rem .7rem;border:1px solid #CBD5E1;border-radius:8px;font:inherit;font-size:13px;">
        </div>
        <div class="table-wrap" style="margin-top:.5rem;"><table class="data-table"><thead><tr><th>Nama</th><th>Satuan</th><th>Stok Gudang</th><th></th></tr></thead>
        <tbody>${master.barang.map((b, i) => `<tr class="baris-master-barang" data-nama="${esc(normTeks(b.NamaBarang))}"><td>${esc(b.NamaBarang)}</td><td>${esc(b.Satuan)}</td><td>${nilaiStok(b.Stok) === null ? '<span class="text-muted">belum diatur</span>' : nilaiStok(b.Stok)}</td><td style="white-space:nowrap;">
          <button class="btn btn-outline btn-sm" onclick="editMasterBarang(${jsArg(b.NamaBarang)})">Edit</button>
          <button class="btn btn-outline btn-sm" onclick="hapusMaster('barang',${jsArg(b.NamaBarang)})">Hapus</button></td></tr>`).join('')}</tbody></table></div>`;
      document.getElementById('mCariBarang').addEventListener('input', (e) => {
        const q = normTeks(e.target.value);
        box.querySelectorAll('.baris-master-barang').forEach(tr => { tr.style.display = !q || tr.dataset.nama.includes(q) ? '' : 'none'; });
      });
      document.getElementById('mAddBtn').addEventListener('click', () => {
        const namaBarang = val('mNama').trim(), satuan = val('mSatuan').trim(), teksStok = val('mStok').trim();
        if (!namaBarang || !satuan) return showToast('Nama barang & satuan wajib diisi.', 'error');
        if (store.barang.some(b => normTeks(b.NamaBarang) === normTeks(namaBarang))) return showToast('Barang "' + namaBarang + '" sudah ada di daftar.', 'error');
        const stok = teksStok === '' ? '' : Number(teksStok);
        if (teksStok !== '' && !(Number.isInteger(stok) && stok >= 0)) return showToast('Stok awal harus bilangan bulat 0 atau lebih.', 'error');
        aksiMaster(['barang', 'logStok'], 'addMasterBarang', { email: currentUser.email, namaBarang, satuan, stok }, 'Barang ditambahkan.', (kunci) => {
          store.barang.push({ NamaBarang: namaBarang, Satuan: satuan, KodeBMN: '', Kategori: '', Stok: stok });
          if (stok !== '') riwayatStokLokal(kunci, { NamaBarang: namaBarang, Jenis: 'Stok Awal', Perubahan: stok, StokSebelum: '', StokSesudah: stok, Keterangan: 'Barang baru ditambahkan ke daftar.' });
        });
      });
    } else if (tab === 'pegawai') {
      box.innerHTML = `
        <div class="grid-2" style="align-items:end;">
          <div class="field"><label>Nama</label><input id="mNama"></div>
          <div class="field"><label>NIP</label><input id="mNip"></div>
        </div>
        <div class="grid-2" style="align-items:end;">
          <div class="field"><label>Email</label><input id="mEmail"></div>
          <div class="field"><label>Jabatan (tercantum di Berita Acara)</label><input id="mJabatan" placeholder="mis. Pengurus Barang"></div>
        </div>
        <div class="grid-2" style="align-items:end;">
          <div class="field"><label>Role</label>
            <select id="mRole"><option>Admin</option><option>Pemohon</option><option>Atasan Mengetahui</option><option>Atasan Menyetujui</option><option>Perlengkapan</option></select></div>
          <div class="field"><label>Kode Bidang</label><input id="mBidang"></div>
        </div>
        <button class="btn btn-primary btn-sm" id="mAddBtn">Tambah Pegawai</button>
        <div class="table-wrap" style="margin-top:1rem;"><table class="data-table"><thead><tr><th>Nama</th><th>Jabatan</th><th>Email</th><th>Role</th><th>Bidang</th><th></th></tr></thead>
        <tbody>${master.pegawai.map((p, i) => `<tr><td>${esc(p.Nama)}</td><td>${p.Jabatan ? esc(p.Jabatan) : '<span class="text-danger">belum diisi</span>'}</td><td>${esc(p.Email)}</td><td>${esc(p.Role)}</td><td>${esc(p.BidangKode)}</td><td style="white-space:nowrap;">
          <button class="btn btn-outline btn-sm" onclick="editMasterPegawai(${jsArg(kunciPegawai(p))})">Edit</button>
          <button class="btn btn-outline btn-sm" onclick="hapusPegawai(${jsArg(kunciPegawai(p))})">Hapus</button></td></tr>`).join('')}</tbody></table></div>`;
      document.getElementById('mAddBtn').addEventListener('click', () => {
        const d = {
          nama: val('mNama').trim(), nip: val('mNip').trim(), email: val('mEmail').trim(), jabatan: val('mJabatan').trim(),
          role: val('mRole'), bidangKode: val('mBidang').trim()
        };
        if (!d.nama || !d.email || !d.role) return showToast('Nama, email, dan role wajib diisi.', 'error');
        if (pegawaiDenganEmail(d.email)) return showToast('Email ' + d.email + ' sudah terdaftar.', 'error');
        aksiMaster('pegawai', 'addMasterPegawai', d, 'Pegawai ditambahkan.',
          () => store.pegawai.push({ Nama: d.nama, NIP: d.nip, Email: d.email, Role: d.role, BidangKode: d.bidangKode, Jabatan: d.jabatan }),
          (res) => showToast(res.message, 'success', 6000)); // berisi password awal
      });
    } else {
      box.innerHTML = `
        <div class="grid-2" style="align-items:end;">
          <div class="field"><label>Kode Bidang</label><input id="mKode"></div>
          <div class="field"><label>Nama Bidang</label><input id="mNamaBidang"></div>
        </div>
        <div class="grid-2" style="align-items:end;">
          <div class="field"><label>Singkatan (untuk penomoran surat, mis. "KEU")</label><input id="mSingkatan"></div>
          <div></div>
        </div>
        <div class="grid-2" style="align-items:end;">
          <div class="field"><label>Email Atasan Mengetahui</label><input id="mAM"></div>
          <div class="field"><label>Email Atasan Menyetujui</label><input id="mAS"></div>
        </div>
        <button class="btn btn-primary btn-sm" id="mAddBtn">Tambah Bidang</button>
        <div class="table-wrap" style="margin-top:1rem;"><table class="data-table"><thead><tr><th>Kode</th><th>Nama</th><th>Singkatan</th><th>Atasan Mengetahui</th><th>Atasan Menyetujui</th><th></th></tr></thead>
        <tbody>${master.bidang.map((b, i) => `<tr><td>${esc(b.KodeBidang)}</td><td>${esc(b.NamaBidang)}</td><td>${esc(b.Singkatan) || '-'}</td><td>${esc(b.AtasanMengetahuiEmail)}</td><td>${esc(b.AtasanMenyetujuiEmail)}</td><td style="white-space:nowrap;">
          <button class="btn btn-outline btn-sm" onclick="editMasterBidang(${jsArg(b.KodeBidang)})">Edit</button>
          <button class="btn btn-outline btn-sm" onclick="hapusMaster('bidang',${jsArg(b.KodeBidang)})">Hapus</button></td></tr>`).join('')}</tbody></table></div>`;
      document.getElementById('mAddBtn').addEventListener('click', () => {
        const d = {
          kodeBidang: val('mKode').trim(), namaBidang: val('mNamaBidang').trim(), singkatan: val('mSingkatan').trim(),
          atasanMengetahuiEmail: val('mAM').trim(), atasanMenyetujuiEmail: val('mAS').trim()
        };
        if (!d.kodeBidang || !d.namaBidang) return showToast('Kode & nama bidang wajib diisi.', 'error');
        aksiMaster('bidang', 'addMasterBidang', d, 'Bidang ditambahkan.', () => store.bidang.push({
          KodeBidang: d.kodeBidang, NamaBidang: d.namaBidang, Singkatan: d.singkatan,
          AtasanMengetahuiEmail: d.atasanMengetahuiEmail, AtasanMenyetujuiEmail: d.atasanMenyetujuiEmail
        }));
      });
    }
  }

  window.editMasterBarang = function (kunci) {
    const b = typeof kunci === 'number' ? store.barang[kunci] : store.barang.find(o => String(o.NamaBarang) === String(kunci));
    if (!b) return;
    openModal(`
      <h3 class="section-title" style="font-size:16px;">Edit Barang</h3>
      <div class="field"><label>Nama Barang</label><input id="eNama" value="${esc(b.NamaBarang)}"></div>
      <div class="field"><label>Satuan</label><input id="eSatuan" value="${esc(b.Satuan)}"></div>
      <div class="field"><label>Kategori</label><input id="eKategori" value="${esc(b.Kategori)}"></div>
      <div style="display:flex;gap:.6rem;"><button class="btn btn-primary" id="eSaveBtn">Simpan</button><button class="btn btn-outline" onclick="closeModal()">Batal</button></div>`);
    document.getElementById('eSaveBtn').addEventListener('click', () => {
      const d = { originalNama: b.NamaBarang, namaBarang: val('eNama'), satuan: val('eSatuan'), kategori: val('eKategori') };
      const ganti = normTeks(d.namaBarang) !== normTeks(d.originalNama);
      if (ganti && store.barang.some(o => normTeks(o.NamaBarang) === normTeks(d.namaBarang))) return showToast('Nama barang "' + d.namaBarang.trim() + '" sudah dipakai barang lain.', 'error');
      const infoAsli = petaStokBarang().get(normTeks(d.originalNama));
      if (ganti && infoAsli && infoAsli.stok !== null && infoAsli.dipesan > 0) {
        return showToast('Nama "' + d.originalNama + '" belum bisa diganti karena masih diminta di nota yang sedang berjalan (' + infoAsli.dipesan + '). Ganti nama setelah nota tersebut selesai atau ditolak.', 'error', 7000);
      }
      aksiMaster('barang', 'updateMasterBarang', d, 'Barang berhasil diperbarui.', () => {
        const x = store.barang.find(o => o.NamaBarang === d.originalNama);
        if (x) Object.assign(x, { NamaBarang: d.namaBarang, Satuan: d.satuan, Kategori: d.kategori });
      });
    });
  };

  window.editMasterPegawai = function (kunci) {
    const p = typeof kunci === 'number' ? store.pegawai[kunci] : cariPegawaiDenganKunci(kunci);
    if (!p) return;
    const roles = ['Admin', 'Pemohon', 'Atasan Mengetahui', 'Atasan Menyetujui', 'Perlengkapan'];
    openModal(`
      <h3 class="section-title" style="font-size:16px;">Edit Pegawai</h3>
      <div class="field"><label>Nama</label><input id="eNama" value="${esc(p.Nama)}"></div>
      <div class="field"><label>NIP</label><input id="eNip" value="${esc(p.NIP)}"></div>
      <div class="field"><label>Email</label><input id="eEmail" value="${esc(p.Email)}"></div>
      <div class="field"><label>Jabatan (tercantum di Berita Acara)</label><input id="eJabatan" value="${esc(p.Jabatan)}" placeholder="mis. Pengurus Barang"></div>
      <div class="field"><label>Role</label><select id="eRole">${roles.map(r => `<option ${r === p.Role ? 'selected' : ''}>${r}</option>`).join('')}</select></div>
      <div class="field"><label>Kode Bidang</label><input id="eBidang" value="${esc(p.BidangKode)}"></div>
      <div style="display:flex;gap:.6rem;"><button class="btn btn-primary" id="eSaveBtn">Simpan</button><button class="btn btn-outline" onclick="closeModal()">Batal</button></div>
      <hr style="margin:1.25rem 0;border:none;border-top:1px solid var(--border-subtle);">
      <div class="field-hint" style="margin-bottom:.5rem;">Lupa/hilang akses password? Reset ke password baru di bawah ini (pegawai wajib diberi tahu manual oleh Admin).</div>
      <div class="field"><label>Password Baru (opsional, min. 6 karakter — kosongkan untuk pakai default "dishub123")</label><input type="text" id="eNewPass" placeholder="dishub123"></div>
      <button class="btn btn-outline btn-block" id="eResetPassBtn">🔑 Reset Password Akun Ini</button>`);
    document.getElementById('eSaveBtn').addEventListener('click', () => {
      const d = {
        originalEmail: p.Email, originalNip: p.NIP, originalNama: p.Nama, nama: val('eNama'), nip: val('eNip'), email: val('eEmail'),
        role: val('eRole'), bidangKode: val('eBidang'), jabatan: val('eJabatan')
      };
      const kunciAsli = kunciPegawai(p);
      aksiMaster('pegawai', 'updateMasterPegawai', d, 'Data pegawai berhasil diperbarui.', () => {
        const x = cariPegawaiDenganKunci(kunciAsli);
        if (x) Object.assign(x, { Nama: d.nama, NIP: d.nip, Email: d.email, Role: d.role, BidangKode: d.bidangKode, Jabatan: d.jabatan });
      });
    });
    document.getElementById('eResetPassBtn').addEventListener('click', async () => {
      if (!confirm('Reset password akun ' + p.Nama + '?')) return;
      const newPassword = val('eNewPass');
      const btn = document.getElementById('eResetPassBtn');
      btn.disabled = true; btn.textContent = 'Mereset...';
      try {
        const res = await apiPost('adminResetPassword', { email: p.Email, newPassword });
        closeModal();
        alert('Password akun ' + p.Nama + ' (' + p.Email + ') berhasil direset menjadi:\n\n' + res.newPassword + '\n\nSegera beri tahu pemilik akun secara manual, dan minta mereka menggantinya lagi lewat menu "Ganti Password".');
      } catch (err) { btn.disabled = false; btn.textContent = '🔑 Reset Password Akun Ini'; }
    });
  };

  window.editMasterBidang = function (kunci) {
    const b = typeof kunci === 'number' ? store.bidang[kunci] : store.bidang.find(o => String(o.KodeBidang) === String(kunci));
    if (!b) return;
    openModal(`
      <h3 class="section-title" style="font-size:16px;">Edit Bidang</h3>
      <div class="field"><label>Kode Bidang</label><input id="eKode" value="${esc(b.KodeBidang)}"></div>
      <div class="field"><label>Nama Bidang</label><input id="eNama" value="${esc(b.NamaBidang)}"></div>
      <div class="field"><label>Singkatan (untuk penomoran surat, mis. "KEU")</label><input id="eSingkatan" value="${esc(b.Singkatan)}"></div>
      <div class="field"><label>Email Atasan Mengetahui</label><input id="eAM" value="${esc(b.AtasanMengetahuiEmail)}"></div>
      <div class="field"><label>Email Atasan Menyetujui</label><input id="eAS" value="${esc(b.AtasanMenyetujuiEmail)}"></div>
      <div style="display:flex;gap:.6rem;"><button class="btn btn-primary" id="eSaveBtn">Simpan</button><button class="btn btn-outline" onclick="closeModal()">Batal</button></div>`);
    document.getElementById('eSaveBtn').addEventListener('click', () => {
      const d = {
        originalKode: b.KodeBidang, kodeBidang: val('eKode'), namaBidang: val('eNama'), singkatan: val('eSingkatan'),
        atasanMengetahuiEmail: val('eAM'), atasanMenyetujuiEmail: val('eAS')
      };
      aksiMaster('bidang', 'updateMasterBidang', d, 'Data bidang berhasil diperbarui.', () => {
        const x = store.bidang.find(o => String(o.KodeBidang) === String(d.originalKode));
        if (x) Object.assign(x, {
          KodeBidang: d.kodeBidang, NamaBidang: d.namaBidang, Singkatan: d.singkatan,
          AtasanMengetahuiEmail: d.atasanMengetahuiEmail, AtasanMenyetujuiEmail: d.atasanMenyetujuiEmail
        });
      });
    });
  };

  document.querySelectorAll('#masterTabs .chip-filter').forEach(chip => {
    chip.addEventListener('click', () => {
      tabMasterAktif = chip.dataset.tab;
      document.querySelectorAll('#masterTabs .chip-filter').forEach(c => c.classList.toggle('active', c === chip));
      renderTab(chip.dataset.tab);
    });
  });
  renderTab(tabAwal);
}

// Kunci pegawai: email; untuk pegawai tanpa email dipakai NIP + nama
function kunciPegawai(p) {
  return String(p.Email || '').trim() ? 'email:' + String(p.Email).trim().toLowerCase() : 'nip:' + String(p.NIP || '').trim() + '|' + String(p.Nama || '').trim();
}
function cariPegawaiDenganKunci(kunci) {
  return store.pegawai.find(p => kunciPegawai(p) === kunci) || null;
}
window.hapusPegawai = function (kunci) {
  const p = cariPegawaiDenganKunci(kunci);
  if (!p || !confirm('Hapus data ini?')) return;
  aksiMaster('pegawai', 'deleteMaster', { jenis: 'pegawai', value: p.Email || '', nip: p.NIP || '', nama: p.Nama || '' }, 'Data dihapus.', () => {
    store.pegawai = store.pegawai.filter(o => kunciPegawai(o) !== kunci);
  });
};

window.hapusMaster = function (jenis, value) {
  if (jenis === 'barang') {
    // Stok dicocokkan lewat nama barang: barang berstok yang masih diminta di nota berjalan tidak dihapus dulu
    const info = petaStokBarang().get(normTeks(value));
    if (info && info.stok !== null && info.dipesan > 0) {
      return showToast('Barang "' + value + '" belum bisa dihapus karena masih diminta di nota yang sedang berjalan (' + info.dipesan + '). Hapus setelah nota tersebut selesai atau ditolak.', 'error', 7000);
    }
    if (!confirm('Hapus barang "' + value + '" dari daftar?\n\nBarang ini tidak bisa dipilih lagi saat membuat nota dan stoknya tidak dihitung lagi.')) return;
  } else if (!confirm('Hapus data ini?')) return;
  const kunciKolom = { barang: 'NamaBarang', pegawai: 'Email', bidang: 'KodeBidang' }[jenis];
  aksiMaster(jenis, 'deleteMaster', { jenis, value }, 'Data dihapus.', () => {
    store[jenis] = store[jenis].filter(o => String(o[kunciKolom]) !== String(value));
  });
};

// ------------------------------------------------------------
// STOK BARANG — tampil untuk semua pengguna. Bagian Perlengkapan & Admin
// dapat mengatur stok (barang masuk, pengurangan, hitung fisik).
// Tersedia = stok gudang dikurangi barang yang sedang dipesan di nota berjalan.
// Stok gudang berkurang otomatis saat Berita Acara Serah Terima terbit.
// ------------------------------------------------------------
let filterStokAktif = 'semua';
let cariStokAktif = '';

function bolehAturStok() {
  return !!currentUser && (currentUser.role === 'Perlengkapan' || currentUser.role === 'Admin');
}

function badgeStok(info) {
  if (!info || info.tersedia === null) return '<span class="badge" style="background:var(--surface-subtle);color:var(--text-secondary);">Belum diatur</span>';
  if (info.tersedia === 0) return '<span class="badge badge-ditolak">Habis</span>';
  return '<span class="badge badge-selesai">Tersedia</span>';
}

// Peringatan di dashboard Perlengkapan/Admin bila ada barang yang habis
function htmlPeringatanStokHabis() {
  if (!bolehAturStok()) return '';
  const habis = Array.from(petaStokBarang().values()).filter(i => i.stok !== null && i.tersedia === 0);
  if (!habis.length) return '';
  const nama = habis.slice(0, 3).map(i => esc(i.barang.NamaBarang)).join(', ') + (habis.length > 3 ? ', dan ' + (habis.length - 3) + ' lainnya' : '');
  return `<div class="info-banner info-warning" style="display:flex;justify-content:space-between;align-items:center;gap:.75rem;flex-wrap:wrap;">
    <span>⚠️ <b>${habis.length} barang habis</b> sehingga tidak bisa diminta pegawai: ${nama}.</span>
    <a href="#/stok-barang" class="btn btn-outline btn-sm">Atur Stok</a></div>`;
}

// Baris info stok pada kartu pemeriksaan stok (Perlengkapan)
function htmlStokUntukPemeriksaan(info, diminta) {
  if (!info) return '';
  if (info.stok === null) return '<div class="text-muted" style="font-size:12px;margin:.25rem 0 .5rem;">📦 Stok barang ini belum diatur.</div>';
  const kurang = diminta > info.tersedia;
  return `<div style="font-size:12px;margin:.25rem 0 .5rem;color:${kurang ? 'var(--status-danger-text)' : 'var(--text-secondary)'};">📦 Stok gudang: <b>${info.stok}</b>`
    + (info.dipesan ? ` · dipesan nota lain: ${info.dipesan}` : '')
    + ` · tersedia untuk nota ini: <b>${info.tersedia}</b>${kurang ? ' — kurang dari yang diminta' : ''}</div>`;
}

// Tampilan instan saat Berita Acara terbit (server melakukan hal yang sama)
function kurangiStokLokal(kunci, noNota, daftar) {
  const total = new Map();
  daftar.forEach(d => {
    const j = Number(d.jumlah) || 0;
    if (j > 0) total.set(normTeks(d.nama), (total.get(normTeks(d.nama)) || 0) + j);
  });
  store.barang.forEach(b => {
    const k = normTeks(b.NamaBarang);
    if (!total.has(k)) return;
    const diserahkan = total.get(k);
    total.delete(k);
    const sebelum = nilaiStok(b.Stok);
    if (sebelum === null) return;
    const sesudah = Math.max(0, sebelum - diserahkan);
    b.Stok = sesudah;
    riwayatStokLokal(kunci, {
      NamaBarang: b.NamaBarang, Jenis: 'Serah Terima', Perubahan: sesudah - sebelum, StokSebelum: sebelum, StokSesudah: sesudah,
      NoNota: noNota, Keterangan: 'Diserahkan ' + diserahkan + '.'
    });
  });
}

function htmlPerubahanStok(v) {
  const n = Number(v) || 0;
  if (n > 0) return `<b style="color:var(--status-selesai-text);">+${n}</b>`;
  if (n < 0) return `<b style="color:var(--status-danger-text);">−${Math.abs(n)}</b>`;
  return '<b class="text-muted">0</b>';
}

function htmlTabelRiwayatStok(list, denganBarang, ringkas) {
  if (!list.length) return '<div class="empty-state" style="padding:1.25rem;">Belum ada perubahan stok.</div>';
  if (ringkas) {
    return `<div style="border:1px solid var(--border-subtle);border-radius:8px;">${list.map((l, i) => `
      <div style="display:flex;justify-content:space-between;gap:.75rem;padding:.55rem .75rem;font-size:12.5px;${i ? 'border-top:1px solid var(--border-subtle);' : ''}">
        <div><b>${esc(l.Jenis)}</b> ${htmlPerubahanStok(l.Perubahan)}
          <div class="text-muted" style="font-size:11.5px;">${l._lokal ? '⏳ ' : ''}${esc(fmtTgl(l.Waktu))} · ${esc(l.Oleh)}${l.Keterangan ? ' · ' + esc(l.Keterangan) : ''}${l.NoNota ? ' · ' + esc(l.NoNota) : ''}</div></div>
        <div style="white-space:nowrap;font-weight:600;">${l.StokSebelum === '' || l.StokSebelum === undefined ? '' : esc(l.StokSebelum) + ' → '}${esc(l.StokSesudah)}</div>
      </div>`).join('')}</div>`;
  }
  return `<div class="table-wrap"><table class="data-table">
    <thead><tr><th>Waktu</th>${denganBarang ? '<th>Barang</th>' : ''}<th>Jenis</th><th>Perubahan</th><th>Stok</th><th>Oleh</th><th>Keterangan</th></tr></thead>
    <tbody>${list.map(l => `<tr>
      <td style="white-space:nowrap;">${l._lokal ? '<span title="Sedang disimpan">⏳</span> ' : ''}${esc(fmtTgl(l.Waktu))}</td>
      ${denganBarang ? `<td>${esc(l.NamaBarang)}</td>` : ''}
      <td style="white-space:nowrap;">${esc(l.Jenis)}</td>
      <td>${htmlPerubahanStok(l.Perubahan)}</td>
      <td style="white-space:nowrap;">${l.StokSebelum === '' || l.StokSebelum === undefined ? '' : esc(l.StokSebelum) + ' → '}${esc(l.StokSesudah)}</td>
      <td>${esc(l.Oleh)}</td>
      <td>${esc(l.Keterangan)}${l.NoNota ? `${l.Keterangan ? '<br>' : ''}<a href="#/detail/${encodeURIComponent(l.NoNota)}" style="font-size:12px;">${esc(l.NoNota)}</a>` : ''}</td>
    </tr>`).join('')}</tbody></table></div>`;
}

function renderStokBarang(content) {
  const kelola = bolehAturStok();
  const daftar = Array.from(petaStokBarang().values())
    .sort((a, b) => String(a.barang.NamaBarang).localeCompare(String(b.barang.NamaBarang), 'id'));
  const jumlah = {
    semua: daftar.length,
    tersedia: daftar.filter(i => i.tersedia !== null && i.tersedia > 0).length,
    habis: daftar.filter(i => i.tersedia === 0).length,
    belum: daftar.filter(i => i.tersedia === null).length
  };
  const chip = (kunci, label) => `<span class="chip-filter ${filterStokAktif === kunci ? 'active' : ''}" data-filter="${kunci}">${label} (${jumlah[kunci]})</span>`;

  content.innerHTML = `
  <div class="flex-between" style="flex-wrap:wrap;gap:.75rem;margin-bottom:.25rem;">
    <h2 class="section-title" style="margin:0;">🗃️ Stok Barang</h2>
    ${currentUser.role === 'Pemohon' ? '<a href="#/buat-nota" class="btn btn-primary btn-sm">➕ Ajukan Nota Baru</a>' : ''}
    ${kelola ? '<a href="#/data-master" class="btn btn-outline btn-sm">🗂️ Tambah / Ubah Barang</a>' : ''}
  </div>
  <p class="text-muted" style="font-size:13px;margin:.25rem 0 1rem;">${kelola
    ? 'Atur stok saat barang masuk, ada barang rusak/hilang, atau setelah hitung fisik. Stok gudang berkurang otomatis saat Berita Acara Serah Terima terbit. <b>Tersedia</b> = stok gudang dikurangi barang yang sedang dipesan di nota yang masih berjalan.'
    : '<b>Tersedia</b> adalah jumlah yang masih bisa diminta saat ini. Barang yang sedang diminta di nota lain sudah dikurangkan, dan stok berkurang otomatis ketika barang diserahkan.'}</p>
  <div class="stats-grid">
    <div class="card stat-card"><div class="stat-icon" style="background:var(--pastel-blue);">🗃️</div><div><div class="stat-value">${jumlah.semua}</div><div class="stat-label">JENIS BARANG</div></div></div>
    <div class="card stat-card"><div class="stat-icon" style="background:var(--pastel-green);">✅</div><div><div class="stat-value">${jumlah.tersedia}</div><div class="stat-label">TERSEDIA</div></div></div>
    <div class="card stat-card"><div class="stat-icon" style="background:var(--status-danger-bg);">⛔</div><div><div class="stat-value">${jumlah.habis}</div><div class="stat-label">HABIS</div></div></div>
    <div class="card stat-card"><div class="stat-icon" style="background:var(--pastel-amber);">❔</div><div><div class="stat-value">${jumlah.belum}</div><div class="stat-label">STOK BELUM DIATUR</div></div></div>
  </div>
  <div class="card" style="margin-bottom:1.5rem;">
    <div class="flex-between" style="flex-wrap:wrap;gap:.6rem;margin-bottom:.75rem;">
      <div class="chip-row" id="filterStok" style="margin:0;">${chip('semua', 'Semua')}${chip('tersedia', 'Tersedia')}${chip('habis', 'Habis')}${chip('belum', 'Belum diatur')}</div>
      <input id="cariStok" placeholder="🔍 Cari nama barang…" value="${esc(cariStokAktif)}" style="max-width:260px;width:100%;padding:.5rem .7rem;border:1px solid #CBD5E1;border-radius:8px;font:inherit;font-size:13px;">
    </div>
    <div id="tabelStok"></div>
  </div>
  ${kelola ? `<div class="card"><h3 class="section-title" style="font-size:15px;margin-top:0;">🕘 Riwayat Perubahan Stok</h3>
    <p class="text-muted" style="font-size:12px;margin:-.25rem 0 .75rem;">30 perubahan terbaru. Riwayat lengkap tersimpan di sheet <b>Log_Stok</b>.</p>
    ${htmlTabelRiwayatStok(store.logStok.slice(-30).reverse(), true)}</div>` : ''}`;

  const gambarTabel = () => {
    const q = normTeks(cariStokAktif);
    const list = daftar.filter(i => {
      if (filterStokAktif === 'tersedia' && !(i.tersedia !== null && i.tersedia > 0)) return false;
      if (filterStokAktif === 'habis' && i.tersedia !== 0) return false;
      if (filterStokAktif === 'belum' && i.tersedia !== null) return false;
      return !q || normTeks(i.barang.NamaBarang).includes(q);
    });
    const el = document.getElementById('tabelStok');
    if (!list.length) { el.innerHTML = '<div class="empty-state">Tidak ada barang yang cocok.</div>'; return; }
    const jsArg = (x) => esc(JSON.stringify(String(x)));

    const angka = (i) => i.tersedia === null ? '<span class="text-muted">-</span>' : `<b class="angka-stok" style="font-size:15px;">${i.tersedia}</b>`;
    el.innerHTML = kelola ? `<div class="table-wrap"><table class="data-table">
      <thead><tr><th>Nama Barang</th><th>Stok Gudang</th><th>Dipesan</th><th>Tersedia</th><th>Status</th><th></th></tr></thead>
      <tbody>${list.map(i => `<tr class="baris-stok" data-nama="${esc(i.barang.NamaBarang)}">
        <td><b>${esc(i.barang.NamaBarang)}</b></td>
        <td>${i.stok === null ? '<span class="text-muted">-</span>' : i.stok}</td><td>${i.dipesan ? i.dipesan : '<span class="text-muted">0</span>'}</td>
        <td class="sel-tersedia">${angka(i)}</td>
        <td>${badgeStok(i)}</td>
        <td style="white-space:nowrap;text-align:right;"><button type="button" class="btn btn-outline btn-sm" onclick="bukaAturStok(${jsArg(i.barang.NamaBarang)})">✏️ Atur Stok</button></td>
      </tr>`).join('')}</tbody></table></div>`
    : `<div class="table-wrap"><table class="data-table">
      <thead><tr><th>Nama Barang</th><th style="text-align:right;">Tersedia</th></tr></thead>
      <tbody>${list.map(i => `<tr class="baris-stok" data-nama="${esc(i.barang.NamaBarang)}">
        <td><b>${esc(i.barang.NamaBarang)}</b></td>
        <td class="sel-tersedia" style="text-align:right;white-space:nowrap;">${i.tersedia === null ? badgeStok(i)
          : i.tersedia === 0 ? angka(i) + ' ' + badgeStok(i)
          : angka(i)}</td>
      </tr>`).join('')}</tbody></table></div>`;
  };
  gambarTabel();

  document.querySelectorAll('#filterStok .chip-filter').forEach(c => c.addEventListener('click', () => {
    filterStokAktif = c.dataset.filter;
    document.querySelectorAll('#filterStok .chip-filter').forEach(x => x.classList.toggle('active', x === c));
    gambarTabel();
  }));
  const cari = document.getElementById('cariStok');
  cari.addEventListener('input', () => { cariStokAktif = cari.value; gambarTabel(); });
}

window.bukaAturStok = function (namaBarang) {
  if (!bolehAturStok()) return;
  const info = petaStokBarang().get(normTeks(namaBarang));
  if (!info) return showToast('Barang tidak ditemukan.', 'error');
  const b = info.barang;
  const belumDiatur = info.stok === null;
  const riwayat = store.logStok.filter(l => normTeks(l.NamaBarang) === normTeks(b.NamaBarang)).slice(-5).reverse();
  openModal(`
    <h3 class="section-title" style="font-size:16px;margin-top:0;">✏️ Atur Stok — ${esc(b.NamaBarang)}</h3>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem;margin-bottom:1rem;text-align:center;">
      <div style="background:var(--surface-canvas);border-radius:8px;padding:.6rem;"><div class="text-muted" style="font-size:11px;font-weight:600;">STOK GUDANG</div><div style="font-size:18px;font-weight:700;">${belumDiatur ? '-' : info.stok}</div></div>
      <div style="background:var(--surface-canvas);border-radius:8px;padding:.6rem;"><div class="text-muted" style="font-size:11px;font-weight:600;">SEDANG DIPESAN</div><div style="font-size:18px;font-weight:700;">${info.dipesan}</div></div>
      <div style="background:var(--surface-canvas);border-radius:8px;padding:.6rem;"><div class="text-muted" style="font-size:11px;font-weight:600;">TERSEDIA</div><div style="font-size:18px;font-weight:700;">${belumDiatur ? '-' : info.tersedia}</div></div>
    </div>
    ${belumDiatur ? '<div class="info-banner info-warning" style="font-size:12.5px;">Stok barang ini belum diatur, sehingga permintaannya belum dibatasi. Isi jumlah yang ada di gudang saat ini.</div>' : ''}
    <div class="field"><label>Jenis perubahan</label>
      <select id="sMode">
        <option value="tambah" ${belumDiatur ? '' : 'selected'}>Barang masuk (tambah stok)</option>
        <option value="kurangi">Barang keluar di luar nota (rusak, hilang, kedaluwarsa)</option>
        <option value="atur" ${belumDiatur ? 'selected' : ''}>Samakan dengan hitung fisik (atur jumlah)</option>
      </select></div>
    <div class="field"><label id="sLabelJumlah">Jumlah</label><input type="number" id="sJumlah" min="0" placeholder="0"></div>
    <div class="field"><label>Keterangan <span id="sKetWajib" class="text-muted" style="font-weight:400;">(opsional)</span></label><input id="sKet" placeholder="mis. Pengadaan Oktober 2026"></div>
    <div id="sPratinjau" class="info-banner info-success" style="display:none;font-size:13px;"></div>
    <div id="sPeringatan" class="info-banner info-warning" style="display:none;font-size:12.5px;"></div>
    <div style="display:flex;gap:.6rem;"><button class="btn btn-primary" id="sSimpanBtn">Simpan</button><button class="btn btn-outline" onclick="closeModal()">Batal</button></div>
    <div style="margin-top:1.25rem;">
      <div style="font-weight:600;font-size:13px;margin-bottom:.4rem;">Riwayat terakhir barang ini</div>
      ${htmlTabelRiwayatStok(riwayat, false, true)}
    </div>`);

  const el = (id) => document.getElementById(id);
  const dasar = belumDiatur ? 0 : info.stok;
  const hitung = () => {
    const mode = el('sMode').value;
    const teks = el('sJumlah').value.trim();
    const j = Number(teks);
    el('sLabelJumlah').textContent = { tambah: 'Jumlah barang masuk', kurangi: 'Jumlah yang dikurangi', atur: 'Jumlah stok hasil hitung fisik' }[mode];
    el('sKetWajib').textContent = mode === 'kurangi' ? '(wajib)' : '(opsional)';
    el('sKet').placeholder = { tambah: 'mis. Pengadaan Oktober 2026', kurangi: 'mis. Rusak terkena air', atur: 'mis. Hasil stock opname semester II' }[mode];
    if (teks === '' || !Number.isInteger(j) || j < 0) { el('sPratinjau').style.display = 'none'; el('sPeringatan').style.display = 'none'; return null; }
    const sesudah = mode === 'tambah' ? dasar + j : mode === 'kurangi' ? dasar - j : j;
    el('sPratinjau').style.display = 'block';
    el('sPratinjau').innerHTML = sesudah < 0
      ? `Pengurangan melebihi stok gudang (${dasar}).`
      : `Stok gudang menjadi <b>${sesudah}</b>, tersedia untuk diminta <b>${Math.max(0, sesudah - info.dipesan)}</b>.`;
    el('sPratinjau').className = 'info-banner ' + (sesudah < 0 ? 'info-danger' : 'info-success');
    const kurangDariPesanan = sesudah >= 0 && sesudah < info.dipesan;
    el('sPeringatan').style.display = kurangDariPesanan ? 'block' : 'none';
    el('sPeringatan').innerHTML = kurangDariPesanan ? `Stok gudang akan lebih kecil dari jumlah yang sedang dipesan (${info.dipesan}). Nota yang sudah berjalan tetap diproses — sesuaikan jumlahnya saat pemeriksaan stok atau serah terima.` : '';
    return { mode, jumlah: j, sesudah };
  };
  ['sMode', 'sJumlah'].forEach(id => el(id).addEventListener('input', hitung));
  el('sMode').addEventListener('change', hitung);
  hitung();
  el('sJumlah').focus();

  el('sSimpanBtn').addEventListener('click', () => {
    const h = hitung();
    const ket = el('sKet').value.trim();
    if (!h) return showToast('Isi jumlah dengan bilangan bulat 0 atau lebih.', 'error');
    if (h.mode !== 'atur' && h.jumlah < 1) return showToast('Jumlah minimal 1.', 'error');
    if (h.sesudah < 0) return showToast('Pengurangan melebihi stok gudang (' + dasar + ').', 'error');
    if (h.mode === 'kurangi' && !ket) return showToast('Isi keterangan pengurangan stok (mis. rusak, hilang).', 'error');
    const jenis = h.mode === 'tambah' ? 'Barang Masuk' : h.mode === 'kurangi' ? 'Pengurangan' : (belumDiatur ? 'Stok Awal' : 'Penyesuaian (Hitung Fisik)');
    aksiMaster(['barang', 'logStok'], 'updateStokBarang',
      { email: currentUser.email, namaBarang: b.NamaBarang, mode: h.mode, jumlah: h.jumlah, keterangan: ket },
      'Stok "' + b.NamaBarang + '" kini ' + h.sesudah + '.', (kunci) => {
        const x = store.barang.find(o => normTeks(o.NamaBarang) === normTeks(b.NamaBarang));
        if (x) x.Stok = h.sesudah;
        riwayatStokLokal(kunci, {
          NamaBarang: b.NamaBarang, Jenis: jenis, Perubahan: h.sesudah - dasar,
          StokSebelum: belumDiatur ? '' : dasar, StokSesudah: h.sesudah, Keterangan: ket
        });
      });
  });
};
