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
    ['#/laporan', '📊 Laporan & Rekapitulasi'],
    ['#/data-master', '⚙️ Data Master']
  ],
  Pemohon: [
    ['#/dashboard', '🏠 Dashboard / Beranda'],
    ['#/buat-nota', '➕ Buat Nota Baru'],
    ['#/nota-saya', '📄 Nota Saya'],
    ['#/laporan', '📊 Laporan & Rekap']
  ],
  'Atasan Mengetahui': [
    ['#/dashboard', '🏠 Dashboard / Beranda'],
    ['#/menunggu-paraf', '✍️ Menunggu Paraf'],
    ['#/laporan', '📊 Laporan & Rekap']
  ],
  'Atasan Menyetujui': [
    ['#/dashboard', '🏠 Dashboard / Beranda'],
    ['#/tinjau-persetujuan', '🔍 Tinjau Persetujuan'],
    ['#/laporan', '📊 Laporan & Rekap']
  ],
  Perlengkapan: [
    ['#/dashboard', '🏠 Dashboard / Beranda'],
    ['#/periksa-stok', '📦 Periksa Stok'],
    ['#/serah-terima', '🤝 Serah Terima'],
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
// ROUTER
// ------------------------------------------------------------
async function router() {
  const hash = location.hash || '#/dashboard';
  if (!isLoggedIn() && hash !== '#/login') { location.hash = '#/login'; return; }
  if (isLoggedIn() && hash === '#/login') { location.hash = '#/dashboard'; return; }

  if (hash === '#/login') return renderLogin();

  renderShell();
  const content = document.getElementById('page-content');
  content.innerHTML = '<div style="text-align:center;padding:3rem;"><span class="loading-spin"></span></div>';

  try {
    if (hash === '#/dashboard') await renderDashboard(content);
    else if (hash === '#/buat-nota') await renderBuatNota(content);
    else if (hash === '#/nota-saya') await renderNotaList(content, {});
    else if (hash === '#/menunggu-paraf') await renderNotaList(content, { status: 'Diajukan', title: 'Menunggu Paraf Saya', actionMode: 'mengetahui' });
    else if (hash === '#/tinjau-persetujuan') await renderNotaList(content, { status: ST_DIPERIKSA, title: 'Tinjau Persetujuan' });
    else if (hash === '#/periksa-stok') await renderNotaList(content, { status: 'Diketahui', title: 'Periksa Stok Barang' });
    else if (hash === '#/serah-terima') await renderNotaList(content, { status: 'Diproses', title: 'Serah Terima Barang' });
    else if (hash === '#/proses-barang') { location.hash = '#/serah-terima'; return; } // alamat menu lama
    else if (hash.startsWith('#/detail/')) await renderDetail(content, decodeURIComponent(hash.split('#/detail/')[1]));
    else if (hash.startsWith('#/edit-nota/')) await renderBuatNota(content, decodeURIComponent(hash.split('#/edit-nota/')[1]));
    else if (hash === '#/laporan') await renderLaporan(content);
    else if (hash === '#/data-master') await renderDataMaster(content);
    else if (hash === '#/ganti-password') await renderGantiPassword(content);
    else if (hash === '#/panduan') await renderPanduan(content);
    else content.innerHTML = '<div class="empty-state">Halaman tidak ditemukan.</div>';
  } catch (err) {
    content.innerHTML = `<div class="empty-state">Gagal memuat halaman: ${err.message}</div>`;
  }

  highlightActiveNav();
}
window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', () => { restoreSession(); router(); });

function highlightActiveNav() {
  document.querySelectorAll('.nav-item').forEach(a => a.classList.toggle('active', a.getAttribute('href') === location.hash));
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
      showToast('Login berhasil, selamat datang!');
      location.hash = '#/dashboard';
    } catch (err) { /* toast sudah tampil dari apiPost */ }
    btn.disabled = false; btn.textContent = 'Masuk';
  });
}

// ------------------------------------------------------------
// SHELL (sidebar + topbar) — dirender ulang tiap navigasi
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

  document.getElementById('logoutBtn').addEventListener('click', doLogout);
  document.getElementById('logoutBtnMobile').addEventListener('click', doLogout);
  document.getElementById('globalSearch').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      sessionSearchQuery = e.target.value.trim();
      location.hash = '#/nota-saya';
    }
  });

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

// ------------------------------------------------------------
// DASHBOARD
// ------------------------------------------------------------
async function renderDashboard(content) {
  const res = await apiGet('getDashboard', { email: currentUser.email });
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
    <tbody>${list.map(n => `
      <tr class="row-link" onclick="location.hash='#/detail/${encodeURIComponent(n.NoNota)}'">
        <td class="no-nota-cell">${n.NoNota}</td>
        <td>${fmtTgl(n.Tanggal, false)}</td>
        <td>${n.BidangNama}</td>
        <td>${n.PemohonNama}</td>
        <td>${statusBadge(n.Status)}</td>
        ${aksi ? `<td style="white-space:nowrap;" onclick="event.stopPropagation()">${bisaDiubahPemohon(n)
          ? `<a class="btn btn-outline btn-sm" href="#/edit-nota/${encodeURIComponent(n.NoNota)}">✏️ Edit</a>
             <button type="button" class="btn btn-danger btn-sm" onclick="hapusNotaPemohon('${encodeURIComponent(n.NoNota)}')">🗑️ Hapus</button>`
          : '<span class="text-muted" style="font-size:12px;" title="Nota sudah diproses sehingga tidak bisa diubah atau dihapus">🔒 Terkunci</span>'}</td>` : ''}
      </tr>`).join('')}</tbody></table></div>`;
}

// ------------------------------------------------------------
// BUAT NOTA BARU  &  UBAH NOTA (editNoNota diisi = mode ubah)
// Nota hanya bisa diubah oleh pemohonnya selama status masih Diajukan.
// ------------------------------------------------------------
async function renderBuatNota(content, editNoNota) {
  const [master, detail] = await Promise.all([
    apiGet('getMasterData', { jenis: 'semua' }),
    editNoNota ? apiGet('getNotaDetail', { noNota: editNoNota, email: currentUser.email }) : Promise.resolve(null)
  ]);
  const barangList = master.barang;
  const SATUAN_OPTIONS = ['Pcs', 'Unit', 'Buah', 'Rim', 'Lembar', 'Roll', 'Kotak', 'Set', 'Paket', 'Meter', 'Liter', 'Kg', 'Botol', 'Galon'];
  const modeUbah = !!detail;
  const nota = modeUbah ? detail.nota : null;

  if (modeUbah && !bisaDiubahPemohon(nota)) {
    content.innerHTML = `
    <div class="card" style="max-width:560px;">
      <h2 class="section-title">🔒 Nota tidak bisa diubah</h2>
      <p>Nota <b>${nota.NoNota}</b> berstatus <b>${nota.Status}</b>. Nota hanya bisa diubah atau dihapus oleh pemohonnya selama masih berstatus <b>Diajukan</b>.</p>
      <a href="#/detail/${encodeURIComponent(nota.NoNota)}" class="btn btn-outline">← Kembali ke detail nota</a>
    </div>`;
    return;
  }

  const bidangField = modeUbah
    ? `<select id="fBidang" disabled><option value="${nota.BidangKode}">${nota.BidangNama}</option></select>
       <div class="text-muted" style="font-size:11.5px;margin-top:.3rem;">Bidang tidak bisa diganti karena sudah menjadi bagian nomor nota. Jika salah bidang, hapus nota ini lalu buat yang baru.</div>`
    : `<select id="fBidang">${master.bidang.map(b => `<option value="${b.KodeBidang}" ${b.KodeBidang === currentUser.bidangKode ? 'selected' : ''}>${b.NamaBidang}</option>`).join('')}</select>`;

  content.innerHTML = `
  ${modeUbah ? `<a href="#/detail/${encodeURIComponent(nota.NoNota)}" style="font-size:12.5px;">← Kembali</a>` : ''}
  <h2 class="section-title">${modeUbah ? '✏️ Ubah Nota ' + nota.NoNota : '➕ Ajukan Nota Permintaan Barang'}</h2>
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

  function satuanOptionsHtml(selected) {
    const inList = SATUAN_OPTIONS.includes(selected);
    return `<option value="" ${!selected ? 'selected' : ''}>-- pilih --</option>`
      + SATUAN_OPTIONS.map(s => `<option value="${s}" ${s === selected ? 'selected' : ''}>${s}</option>`).join('')
      + `<option value="__lainnya__" ${selected && !inList ? 'selected' : ''}>Lainnya (ketik manual)</option>`;
  }

  // isi (opsional) = { namaBarang, jumlah, satuan } untuk mode ubah
  function addItemRow(isi) {
    itemCount++;
    const rowId = 'item_' + itemCount;
    const row = document.createElement('div');
    row.className = 'grid-2';
    row.style.cssText = 'grid-template-columns:2fr 1fr 1fr auto;align-items:end;gap:.6rem;margin-bottom:.6rem;';
    row.id = rowId;
    row.innerHTML = `
      <div class="field" style="margin-bottom:0;"><label>Nama Barang</label>
        <select class="itemBarang" onchange="autoFillSatuan(this)">
          <option value="">-- pilih --</option>
          ${barangList.map(b => `<option value="${b.NamaBarang}" data-satuan="${b.Satuan}">${b.NamaBarang}</option>`).join('')}
          <option value="__lainnya__">Lainnya (ketik manual)</option>
        </select>
        <input class="itemBarangManual" style="display:none;margin-top:.4rem;" placeholder="Nama barang lainnya">
      </div>
      <div class="field" style="margin-bottom:0;"><label>Jumlah</label><input type="number" class="itemJumlah" min="1" value="1"></div>
      <div class="field" style="margin-bottom:0;"><label>Satuan</label>
        <select class="itemSatuan" onchange="toggleSatuanManual(this)">${satuanOptionsHtml(isi ? String(isi.satuan || '') : '')}</select>
        <input class="itemSatuanManual" style="display:none;margin-top:.4rem;" placeholder="Ketik satuan lain">
      </div>
      <button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById('${rowId}').remove()">✕</button>`;
    itemsWrap.appendChild(row);

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
  }

  window.toggleSatuanManual = function (sel) {
    const row = sel.closest('.grid-2');
    row.querySelector('.itemSatuanManual').style.display = sel.value === '__lainnya__' ? 'block' : 'none';
  };

  window.autoFillSatuan = function (sel) {
    const row = sel.closest('.grid-2');
    const manual = row.querySelector('.itemBarangManual');
    manual.style.display = sel.value === '__lainnya__' ? 'block' : 'none';
    // Catatan: Satuan SENGAJA tidak diisi otomatis — pemohon tetap memilih
    // sendiri satuan dari dropdown, sama seperti memilih Nama Barang.
  };

  document.getElementById('addItemBtn').addEventListener('click', () => addItemRow());
  if (modeUbah && detail.items.length) {
    detail.items.forEach(it => addItemRow({ namaBarang: it.NamaBarang, jumlah: it.JumlahDiminta, satuan: it.Satuan }));
  } else {
    addItemRow();
  }

  document.getElementById('submitNotaBtn').addEventListener('click', async () => {
    const items = [];
    let satuanKosong = false, jumlahSalah = false;
    itemsWrap.querySelectorAll('.grid-2').forEach(row => {
      const sel = row.querySelector('.itemBarang');
      const namaBarang = (sel.value === '__lainnya__' ? row.querySelector('.itemBarangManual').value : sel.value).trim();
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

    const btn = document.getElementById('submitNotaBtn');
    const teksAsli = btn.textContent;
    btn.disabled = true; btn.textContent = modeUbah ? 'Menyimpan...' : 'Mengirim...';
    try {
      const res = modeUbah
        ? await apiPost('editNota', { noNota: nota.NoNota, pemohonEmail: currentUser.email, items })
        : await apiPost('createNota', { pemohonEmail: currentUser.email, bidangKode: document.getElementById('fBidang').value, items });
      showToast(res.message);
      location.hash = '#/detail/' + encodeURIComponent(res.noNota);
    } catch (err) { btn.disabled = false; btn.textContent = teksAsli; }
  });
}

// Pemohon boleh mengubah/menghapus nota MILIKNYA selama status masih Diajukan
function bisaDiubahPemohon(n) {
  return !!currentUser && currentUser.role === 'Pemohon' && n && n.Status === 'Diajukan'
    && String(n.PemohonEmail || '').trim().toLowerCase() === String(currentUser.email || '').trim().toLowerCase();
}

window.hapusNotaPemohon = async function (noNotaEnc) {
  const noNota = decodeURIComponent(noNotaEnc);
  if (!confirm('Hapus nota ' + noNota + '?\n\nNota beserta daftar barangnya akan dihapus permanen dan tidak bisa dikembalikan.')) return;
  try {
    const r = await apiPost('hapusNota', { noNota, pemohonEmail: currentUser.email });
    showToast(r.message);
    if (location.hash === '#/nota-saya') router(); else location.hash = '#/nota-saya';
  } catch (err) { /* pesan error sudah tampil dari apiPost */ }
};

// ------------------------------------------------------------
// DAFTAR NOTA (dipakai untuk: Nota Saya, Menunggu Paraf, Tinjau Persetujuan, Proses Barang)
// ------------------------------------------------------------
async function renderNotaList(content, opts) {
  const params = { email: currentUser.email };
  if (opts.status) params.status = opts.status;
  if (sessionSearchQuery) { params.q = sessionSearchQuery; }
  const res = await apiGet('getNotaList', params);
  const title = opts.title || 'Nota Saya';

  content.innerHTML = `
  <div class="flex-between"><h2 class="section-title">${title}</h2>
  ${sessionSearchQuery ? `<span class="text-muted">Pencarian: "${sessionSearchQuery}" <a href="#" id="clearSearch">✕ hapus</a></span>` : ''}</div>
  <div class="chip-row" id="statusFilter">
    ${[['Semua', 'Semua']].concat(TAHAP.map(t => [t.status, t.label]), [['Ditolak', 'Ditolak']]).map(([s, lbl]) => `<span class="chip-filter ${s === (opts.status || 'Semua') ? 'active' : ''}" data-status="${s}">${lbl}</span>`).join('')}
  </div>
  <div class="card">${renderNotaTable(res.data, { aksiPemohon: currentUser.role === 'Pemohon' })}</div>`;

  document.getElementById('clearSearch')?.addEventListener('click', (e) => { e.preventDefault(); sessionSearchQuery = ''; router(); });
  document.querySelectorAll('#statusFilter .chip-filter').forEach(chip => {
    chip.addEventListener('click', async () => {
      const status = chip.dataset.status;
      const p = { email: currentUser.email };
      if (status !== 'Semua') p.status = status;
      if (sessionSearchQuery) p.q = sessionSearchQuery;
      const r = await apiGet('getNotaList', p);
      document.querySelectorAll('#statusFilter .chip-filter').forEach(c => c.classList.toggle('active', c === chip));
      content.querySelector('.card').innerHTML = renderNotaTable(r.data, { aksiPemohon: currentUser.role === 'Pemohon' });
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
async function renderDetail(content, noNota) {
  const res = await apiGet('getNotaDetail', { noNota, email: currentUser.email });
  const n = res.nota, items = res.items, log = res.log;
  const currentIdx = n.Status === 'Ditolak' ? -1 : TAHAP.findIndex(t => t.status === n.Status);
  const adaBast = !!n.QRBastKiriKode;

  content.innerHTML = `
  <div class="flex-between" style="margin-bottom:1rem;">
    <div><a href="#/nota-saya" style="font-size:12.5px;">← Kembali</a>
      <h2 class="section-title" style="margin:.2rem 0 0;">${n.NoNota}</h2></div>
    <div>${statusBadge(n.Status)}
      <button class="btn btn-outline btn-sm" id="lihatPdfBtn">👁️ Lihat PDF</button>
      <button class="btn btn-outline btn-sm" id="unduhPdfBtn">⬇️ Unduh PDF</button></div>
  </div>

  ${bisaDiubahPemohon(n) ? `<div class="info-banner info-warning" style="display:flex;justify-content:space-between;align-items:center;gap:.75rem;flex-wrap:wrap;">
    <span>✏️ Nota ini belum diparaf atasan, jadi masih bisa Anda ubah atau hapus.</span>
    <span style="white-space:nowrap;"><a class="btn btn-outline btn-sm" href="#/edit-nota/${encodeURIComponent(n.NoNota)}">✏️ Edit Nota</a>
      <button type="button" class="btn btn-danger btn-sm" id="hapusNotaBtn">🗑️ Hapus Nota</button></span>
  </div>` : ''}

  ${renderBannerStatus(n)}

  <div class="two-col">
    <div>
      <div class="card" style="margin-bottom:1rem;">
        <table class="data-table" style="border:none;">
          <tr><td class="text-muted">Bidang / Unit Kerja</td><td><b>${n.BidangNama}</b></td></tr>
          <tr><td class="text-muted">Pejabat Pemohon</td><td><b>${n.PemohonNama}</b> (NIP. ${n.PemohonNIP})</td></tr>
          <tr><td class="text-muted">Tanggal Pengajuan</td><td>${fmtTgl(n.Tanggal)}</td></tr>
          ${n.PemeriksaNama ? `<tr><td class="text-muted">Pemeriksaan Stok</td><td>${n.PemeriksaNama} · ${fmtTgl(n.TglDiperiksa)}${n.HasilPersetujuan ? ' · <b>' + n.HasilPersetujuan + '</b>' : ''}</td></tr>` : ''}
          ${n.CatatanPemeriksaan ? `<tr><td class="text-muted">Catatan Perlengkapan</td><td>${n.CatatanPemeriksaan}</td></tr>` : ''}
        </table>
      </div>

      <div class="card" style="margin-bottom:1rem;">
        <h3 class="section-title" style="font-size:15px;">Daftar Barang</h3>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>Barang</th><th>Satuan</th><th>Diminta</th><th>Disetujui</th><th>Keputusan</th><th>Catatan</th></tr></thead>
          <tbody id="itemsBody">${items.map(it => `
            <tr>
              <td>${it.NamaBarang}</td>
              <td>${it.Satuan}</td><td>${it.JumlahDiminta}</td><td>${it.StatusItem ? it.JumlahDisetujui : '-'}</td>
              <td>${it.StatusItem ? statusBadge(it.StatusItem === 'Penuh' ? 'Selesai' : it.StatusItem === 'Ditolak' ? 'Ditolak' : 'Diproses') + ' ' + it.StatusItem : '<span class="text-muted">Menunggu</span>'}</td>
              <td>${it.Alasan || '-'}</td>
            </tr>`).join('')}</tbody>
        </table></div>
      </div>

      ${renderAksiRole(n, items, res)}

      <h3 class="section-title" style="font-size:14px;margin:1.5rem 0 0;">Tanda Tangan Nota Permintaan</h3>
      <div class="dual-auth" style="margin-top:.75rem;">
        <div class="auth-box"><div class="text-muted" style="font-size:11px;font-weight:600;">Mengetahui,</div>
          <div style="font-weight:600;">${formatJabatanKepalaBidang(n.BidangNama)}</div>
          <div class="qr-placeholder">${n.QRKiriKode ? 'QR: ' + n.QRKiriKode : 'Belum diparaf'}</div>
          <div style="font-size:12.5px;">${n.AtasanMengetahuiNama || '-'}</div>
          <div class="text-muted" style="font-size:11px;">${n.TglDiketahui ? fmtTgl(n.TglDiketahui) : ''}</div></div>
        <div class="auth-box"><div class="text-muted" style="font-size:11px;font-weight:600;">Menyetujui,</div>
          <div style="font-weight:600;">Sekretaris Dinas Perhubungan Provinsi Riau</div>
          <div class="qr-placeholder">${n.QRKananKode ? 'QR: ' + n.QRKananKode : 'Belum disetujui'}</div>
          <div style="font-size:12.5px;">${n.AtasanMenyetujuiNama || '-'}</div>
          <div class="text-muted" style="font-size:11px;">${n.TglDisetujui ? fmtTgl(n.TglDisetujui) : ''}</div></div>
      </div>

      ${adaBast ? `
      <h3 class="section-title" style="font-size:14px;margin:1.5rem 0 0;">Berita Acara Serah Terima Barang</h3>
      <div class="text-muted" style="font-size:12.5px;">Diterbitkan ${fmtTgl(n.BastTanggal)} · tercantum di halaman 2 PDF</div>
      <div class="dual-auth" style="margin-top:.75rem;">
        <div class="auth-box"><div class="text-muted" style="font-size:11px;font-weight:600;">PIHAK KEDUA (yang menerima)</div>
          <div class="qr-placeholder">QR: ${n.QRBastKiriKode}</div>
          <div style="font-weight:600;font-size:12.5px;">${n.BastPihakKeduaNama || '-'}</div>
          <div class="text-muted" style="font-size:11px;">NIP. ${n.BastPihakKeduaNIP || '-'}</div>
          ${n.BastPihakKeduaNama && n.BastPihakKeduaNama !== n.PemohonNama ? `<div class="text-muted" style="font-size:11px;margin-top:.25rem;">mewakili pemohon ${n.PemohonNama}</div>` : ''}</div>
        <div class="auth-box"><div class="text-muted" style="font-size:11px;font-weight:600;">PIHAK PERTAMA (yang menyerahkan)</div>
          <div class="qr-placeholder">QR: ${n.QRBastKananKode}</div>
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
        ${log.length ? log.map(l => `<div class="timeline-item"><div class="timeline-dot"></div><div><b>${l.Aksi}</b> — ${l.Aktor}<br><span class="text-muted">${l.Keterangan}</span><br><span class="text-muted">${fmtTgl(l.Timestamp)}</span></div></div>`).join('') : '<div class="text-muted">Belum ada riwayat.</div>'}
      </div>
    </div>
  </div>`;

  document.getElementById('lihatPdfBtn').addEventListener('click', async () => {
    const btn = document.getElementById('lihatPdfBtn');
    btn.disabled = true; btn.textContent = 'Memuat...';
    try {
      const pdf = await apiGet('getPdf', { noNota });
      const blobUrl = base64ToBlobUrl(pdf.base64, 'application/pdf');
      openPdfModal(blobUrl, n.NoNota);
    } catch (err) { /* toast sudah tampil dari apiGet */ }
    btn.disabled = false; btn.textContent = '👁️ Lihat PDF';
  });

  document.getElementById('unduhPdfBtn').addEventListener('click', async () => {
    try {
      const pdf = await apiGet('getPdf', { noNota });
      const link = document.createElement('a');
      link.href = 'data:application/pdf;base64,' + pdf.base64;
      link.download = pdf.filename;
      link.click();
    } catch (err) {}
  });

  document.getElementById('hapusNotaBtn')?.addEventListener('click', () => hapusNotaPemohon(encodeURIComponent(n.NoNota)));

  attachDetailActionHandlers(n, items, res);
}

// Pesan singkat di atas detail nota sesuai kondisinya
function renderBannerStatus(n) {
  if (n.Status === 'Ditolak') {
    const alasan = n.PemeriksaNama
      ? 'Seluruh barang tidak dapat dipenuhi Bagian Perlengkapan. Alasan per barang ada di tabel Daftar Barang.'
      : 'Ditolak atasan bidang. Catatan: ' + (n.CatatanMengetahui || '-');
    return `<div class="info-banner info-danger">❌ <b>Nota ditolak.</b> ${alasan} Silakan ajukan nota baru bila masih diperlukan.</div>`;
  }
  if (n.Status === 'Diproses' && currentUser.role === 'Pemohon') {
    return `<div class="info-banner info-success">✅ <b>Nota Anda sudah disetujui.</b> Silakan ambil barang di Bagian Perlengkapan. Berita Acara Serah Terima diterbitkan saat barang diserahkan.</div>`;
  }
  if (n.Status === 'Selesai' && n.BastTanggal) {
    const wakil = n.BastPihakKeduaNama && n.BastPihakKeduaNama !== n.PemohonNama
      ? ` kepada <b>${n.BastPihakKeduaNama}</b> (mewakili pemohon)` : '';
    return `<div class="info-banner info-success">🤝 <b>Barang sudah diserahterimakan</b>${wakil} pada ${fmtTgl(n.BastTanggal, false)}. Berita Acara Serah Terima ada di halaman 2 PDF.</div>`;
  }
  return '';
}

function renderAksiRole(n, items, res) {
  const role = currentUser.role;

  if (role === 'Atasan Mengetahui' && n.Status === 'Diajukan') {
    return `<div class="card" style="margin-bottom:1rem;">
      <h3 class="section-title" style="font-size:14px;">Tindakan: Paraf Mengetahui</h3>
      <div class="field"><label>Catatan (opsional)</label><textarea id="catatanMengetahui" placeholder="mis. Disetujui sesuai kuota."></textarea></div>
      <div style="display:flex;gap:.6rem;">
        <button class="btn btn-success" id="btnSetujuiMengetahui">✅ Setujui (Mengetahui)</button>
        <button class="btn btn-danger" id="btnTolakMengetahui">❌ Tolak</button>
      </div></div>`;
  }

  if (role === 'Perlengkapan' && n.Status === 'Diketahui') {
    return `<div class="card" style="margin-bottom:1rem;">
      <h3 class="section-title" style="font-size:14px;">Tindakan: Periksa Stok Barang</h3>
      <p class="text-muted" style="font-size:12.5px;margin:-.25rem 0 .75rem;">Tentukan ketersediaan tiap barang. Setelah disimpan, nota diteruskan ke Sekretaris untuk disetujui.</p>
      <div id="reviewItems">${items.map(it => {
        const d = Number(it.JumlahDiminta) || 0;
        return `
        <div class="item-review" data-id="${it.ID}" data-diminta="${d}">
          <div class="item-review-head"><b>${it.NamaBarang}</b><span class="text-muted">Diminta: ${d} ${it.Satuan}</span></div>
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
      <div class="field"><label>Catatan (opsional)</label><textarea id="catatanMenyetujui"></textarea></div>
      <button class="btn btn-success" id="btnSetujuiSekretaris">✅ Setujui & Terbitkan QR</button>
    </div>`;
  }

  if (role === 'Perlengkapan' && n.Status === 'Diproses') {
    const v = res.viewer || { nama: currentUser.nama, nip: currentUser.nip, jabatan: '' };
    const now = new Date();
    const tglHariIni = HARI_ID[now.getDay()] + ', ' + now.getDate() + ' ' + BULAN_ID[now.getMonth()] + ' ' + now.getFullYear();
    const pemohon = { nama: n.PemohonNama, nip: n.PemohonNIP, jabatan: res.pemohonJabatan };
    return `<div class="card" style="margin-bottom:1rem;">
      <h3 class="section-title" style="font-size:14px;">Tindakan: Terbitkan Berita Acara Serah Terima</h3>
      <p class="text-muted" style="font-size:12.5px;margin:-.25rem 0 .75rem;">Terbitkan setelah barang diterima. Tanggal berita acara otomatis mengikuti hari ini.</p>
      <table class="data-table" style="border:none;margin-bottom:.75rem;">
        <tr><td class="text-muted">Nomor</td><td><b>${n.NoNota}</b></td></tr>
        <tr><td class="text-muted">Tanggal</td><td>${tglHariIni}</td></tr>
        <tr><td class="text-muted">Pihak Pertama<br>(yang menyerahkan)</td><td>${htmlPihakBast(v)}</td></tr>
        <tr><td class="text-muted">Pihak Kedua<br>(yang menerima)</td><td id="pratinjauPihakKedua">${htmlPihakBast(pemohon)}</td></tr>
      </table>
      <label style="display:flex;align-items:center;gap:.5rem;font-size:13px;font-weight:600;cursor:pointer;">
        <input type="checkbox" id="cbDiwakilkan" style="width:auto;margin:0;"> Barang diambil oleh orang lain (bukan pemohon)
      </label>
      <div id="wakilWrap" style="display:none;margin-top:.75rem;">
        <div class="field"><label>Penerima barang</label>
          <select id="wakilPilih"><option value="">Memuat daftar pegawai...</option></select></div>
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

// Jalankan satu aksi: tombol dikunci selama proses, lalu halaman dimuat ulang.
async function jalankanAksi(btnId, teksProses, kirim) {
  const btn = document.getElementById(btnId);
  const teksAsli = btn.textContent;
  btn.disabled = true; btn.textContent = teksProses;
  try {
    const r = await kirim();
    showToast(r.message);
    router();
  } catch (err) {
    btn.disabled = false; btn.textContent = teksAsli; // pesan error sudah tampil dari apiPost
  }
}

function attachDetailActionHandlers(n, items, res) {
  // --- Atasan Mengetahui ---
  document.getElementById('btnSetujuiMengetahui')?.addEventListener('click', () => {
    jalankanAksi('btnSetujuiMengetahui', 'Memproses...', () => apiPost('approveMengetahui', {
      noNota: n.NoNota, atasanEmail: currentUser.email, disetujui: true, catatan: document.getElementById('catatanMengetahui').value
    }));
  });
  document.getElementById('btnTolakMengetahui')?.addEventListener('click', () => {
    if (!confirm('Yakin ingin menolak nota ini?')) return;
    jalankanAksi('btnTolakMengetahui', 'Memproses...', () => apiPost('approveMengetahui', {
      noNota: n.NoNota, atasanEmail: currentUser.email, disetujui: false, catatan: document.getElementById('catatanMengetahui').value
    }));
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
        alasan: keputusan === 'Penuh' ? '' : alasan
      });
    }
    if (payload.every(p => p.statusItem === 'Ditolak') &&
      !confirm('Semua barang ditolak. Nota akan berstatus Ditolak dan tidak diteruskan ke Sekretaris. Lanjutkan?')) return;
    jalankanAksi('btnSimpanPemeriksaan', 'Menyimpan...', () => apiPost('periksaStok', {
      noNota: n.NoNota, petugasEmail: currentUser.email, items: payload,
      catatan: document.getElementById('catatanPemeriksaan').value
    }));
  });

  // --- Atasan Menyetujui ---
  document.getElementById('btnSetujuiSekretaris')?.addEventListener('click', () => {
    if (!confirm('Setujui nota ini? QR tanda tangan kanan akan terbit dan pemohon diberi tahu untuk mengambil barang.')) return;
    jalankanAksi('btnSetujuiSekretaris', 'Memproses...', () => apiPost('approveMenyetujui', {
      noNota: n.NoNota, atasanEmail: currentUser.email, catatan: document.getElementById('catatanMenyetujui').value
    }));
  });

  // --- Perlengkapan: Berita Acara Serah Terima (penerima bisa diwakilkan) ---
  const cbWakil = document.getElementById('cbDiwakilkan');
  if (cbWakil) {
    const pemohon = { nama: n.PemohonNama, nip: n.PemohonNIP, jabatan: res.pemohonJabatan, email: n.PemohonEmail };
    const jabatanPertama = (res.viewer || {}).jabatan;
    const sel = document.getElementById('wakilPilih');
    const nilai = (id) => document.getElementById(id).value.trim();
    let daftarPegawai = null;

    const penerimaSaatIni = () => {
      if (!cbWakil.checked) return Object.assign({ mode: 'pemohon' }, pemohon);
      if (sel.value === '__manual__') return { mode: 'manual', nama: nilai('wakilNama'), nip: nilai('wakilNip'), jabatan: nilai('wakilJabatan') };
      const p = (daftarPegawai || []).find(x => x.Email === sel.value);
      return p ? { mode: 'pegawai', email: p.Email, nama: p.Nama, nip: p.NIP, jabatan: p.Jabatan || '' } : { mode: 'kosong' };
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

    cbWakil.addEventListener('change', async () => {
      document.getElementById('wakilWrap').style.display = cbWakil.checked ? 'block' : 'none';
      if (cbWakil.checked && !daftarPegawai) {
        const opsiManual = '<option value="__manual__">Tidak terdaftar di sistem (isi manual)</option>';
        try {
          const r = await apiGet('getMasterData', { jenis: 'pegawai' });
          const emailPemohon = String(pemohon.email || '').trim().toLowerCase();
          daftarPegawai = r.data
            .filter(p => p.Email && String(p.Email).trim().toLowerCase() !== emailPemohon)
            .sort((a, b) => String(a.Nama).localeCompare(String(b.Nama)));
          sel.innerHTML = '<option value="">-- pilih pegawai --</option>'
            + daftarPegawai.map(p => `<option value="${esc(p.Email)}">${esc(p.Nama)}${p.Jabatan ? ' — ' + esc(p.Jabatan) : ''}</option>`).join('')
            + opsiManual;
        } catch (err) {
          daftarPegawai = [];
          sel.innerHTML = '<option value="">-- pilih --</option>' + opsiManual;
        }
      }
      perbarui();
    });
    sel.addEventListener('change', perbarui);
    ['wakilNama', 'wakilNip', 'wakilJabatan'].forEach(id => document.getElementById(id).addEventListener('input', perbarui));
    perbarui();

    document.getElementById('btnTerbitkanBast').addEventListener('click', () => {
      const p = penerimaSaatIni();
      if (p.mode === 'kosong') return showToast('Pilih penerima barang terlebih dahulu.', 'error');
      if (p.mode === 'manual' && (!p.nama || !p.jabatan)) return showToast('Isi nama dan jabatan penerima barang.', 'error');
      const pesan = p.mode === 'pemohon'
        ? 'Pastikan pemohon (' + pemohon.nama + ') sudah menerima barang.'
        : 'Barang diterima oleh ' + p.nama + ' mewakili ' + pemohon.nama + '. Pemohon akan diberi tahu lewat email.';
      if (!confirm(pesan + '\n\nTerbitkan Berita Acara Serah Terima sekarang?')) return;
      const penerima = p.mode === 'pemohon' ? { mode: 'pemohon' }
        : p.mode === 'pegawai' ? { mode: 'pegawai', email: p.email }
        : { mode: 'manual', nama: p.nama, nip: p.nip, jabatan: p.jabatan };
      jalankanAksi('btnTerbitkanBast', 'Menerbitkan... (membuat PDF, mohon tunggu)', () => apiPost('terbitkanBast', {
        noNota: n.NoNota, petugasEmail: currentUser.email, penerima
      }));
    });
  }
}

// ------------------------------------------------------------
// LAPORAN & REKAP
// ------------------------------------------------------------
async function renderLaporan(content) {
  const res = await apiGet('getLaporan', {});
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
      ${res.barangTerbanyak.map(b => `<div class="flex-between" style="padding:.4rem 0;border-bottom:1px solid var(--surface-subtle);"><span>${b.nama}</span><b>${b.jumlah}</b></div>`).join('') || '<div class="text-muted">Belum ada data.</div>'}
    </div>
  </div>`;
}

// ------------------------------------------------------------
// GANTI PASSWORD (semua role)
// ------------------------------------------------------------
async function renderGantiPassword(content) {
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
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });
  return URL.createObjectURL(blob);
}

// Modal lebar khusus untuk melihat PDF langsung di halaman (embed iframe).
function openPdfModal(blobUrl, noNota) {
  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  wrap.id = 'pdfModalBackdrop';
  wrap.innerHTML = `
    <div class="modal-box" style="max-width:920px;width:95vw;height:90vh;padding:0;display:flex;flex-direction:column;">
      <div class="flex-between" style="padding:.75rem 1rem;border-bottom:1px solid var(--border-subtle);flex-shrink:0;">
        <b>${noNota}.pdf</b>
        <button class="btn btn-outline btn-sm" id="closePdfModalBtn">✕ Tutup</button>
      </div>
      <iframe src="${blobUrl}" style="flex:1;border:none;width:100%;"></iframe>
    </div>`;
  const cleanup = () => { URL.revokeObjectURL(blobUrl); wrap.remove(); };
  wrap.addEventListener('click', (e) => { if (e.target === wrap) cleanup(); });
  document.body.appendChild(wrap);
  document.getElementById('closePdfModalBtn').addEventListener('click', cleanup);
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

async function renderPanduan(content) {
  const res = await apiGet('getPanduanList', {});
  const list = res.data;
  const isAdmin = currentUser.role === 'Admin';

  content.innerHTML = `
  <div class="flex-between">
    <h2 class="section-title">📚 Panduan Pengisian Nota</h2>
    ${isAdmin ? '<button class="btn btn-primary btn-sm" id="tambahPanduanBtn">➕ Tambah Panduan</button>' : ''}
  </div>
  <p class="text-muted" style="margin-top:-.5rem;margin-bottom:1rem;">Kumpulan dokumen dan video panduan pengisian Nota Permintaan Barang.</p>
  <div id="panduanList" class="grid-cards"></div>`;

  function renderList() {
    const wrap = document.getElementById('panduanList');
    if (!list.length) {
      wrap.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">Belum ada panduan yang ditambahkan.</div>`;
      return;
    }
    wrap.innerHTML = list.map(p => {
      const hapusBtn = isAdmin ? `<button class="btn btn-outline btn-sm" onclick="hapusPanduan('${p.ID}')">🗑️ Hapus</button>` : '';
      if (p.Jenis === 'PDF') {
        return `<div class="card">
          <div style="font-size:32px;">📄</div>
          <h3 style="font-size:15px;margin:.5rem 0 .25rem;">${p.Judul}</h3>
          ${p.Deskripsi ? `<p class="text-muted" style="font-size:12.5px;">${p.Deskripsi}</p>` : ''}
          <div style="display:flex;gap:.5rem;margin-top:.75rem;flex-wrap:wrap;">
            <a href="${p.URL}" target="_blank" class="btn btn-outline btn-sm">Buka PDF</a>
            ${hapusBtn}
          </div>
        </div>`;
      }
      const embed = getYoutubeEmbedUrl(p.URL);
      return `<div class="card">
        <h3 style="font-size:15px;margin:0 0 .6rem;">${p.Judul}</h3>
        ${embed
          ? `<div style="position:relative;padding-bottom:56.25%;height:0;border-radius:8px;overflow:hidden;"><iframe src="${embed}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;" allowfullscreen></iframe></div>`
          : `<a href="${p.URL}" target="_blank">${p.URL}</a>`}
        ${p.Deskripsi ? `<p class="text-muted" style="font-size:12.5px;margin-top:.6rem;">${p.Deskripsi}</p>` : ''}
        ${hapusBtn ? `<div style="margin-top:.6rem;">${hapusBtn}</div>` : ''}
      </div>`;
    }).join('');
  }
  renderList();

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

        const btn = document.getElementById('pSaveBtn');
        btn.disabled = true; btn.textContent = 'Menyimpan...';
        try {
          if (jenis === 'PDF') {
            const file = document.getElementById('pFile').files[0];
            if (!file) { showToast('Pilih file PDF terlebih dahulu.', 'error'); btn.disabled = false; btn.textContent = 'Simpan Panduan'; return; }
            const base64 = await fileToBase64(file);
            await apiPost('addPanduanPdf', { judul, deskripsi, fileBase64: base64, fileName: file.name, mimeType: file.type, uploaderEmail: currentUser.email });
          } else {
            const url = document.getElementById('pUrl').value.trim();
            if (!url) { showToast('URL video YouTube wajib diisi.', 'error'); btn.disabled = false; btn.textContent = 'Simpan Panduan'; return; }
            await apiPost('addPanduanVideo', { judul, deskripsi, youtubeUrl: url, uploaderEmail: currentUser.email });
          }
          showToast('Panduan berhasil ditambahkan.'); closeModal(); router();
        } catch (err) { btn.disabled = false; btn.textContent = 'Simpan Panduan'; }
      });
    });
  }
}

window.hapusPanduan = async function (id) {
  if (!confirm('Hapus panduan ini?')) return;
  await apiPost('deletePanduan', { id });
  showToast('Panduan dihapus.'); router();
};

// ------------------------------------------------------------
// DATA MASTER (Admin)
// ------------------------------------------------------------
async function renderDataMaster(content) {
  if (currentUser.role !== 'Admin') { content.innerHTML = '<div class="empty-state">Halaman ini khusus Admin.</div>'; return; }
  const master = await apiGet('getMasterData', { jenis: 'semua' });

  content.innerHTML = `
  <h2 class="section-title">⚙️ Kelola Data Master</h2>
  <div class="chip-row" id="masterTabs">
    <span class="chip-filter active" data-tab="barang">Barang</span>
    <span class="chip-filter" data-tab="pegawai">Pegawai</span>
    <span class="chip-filter" data-tab="bidang">Bidang</span>
  </div>
  <div class="card" id="masterContent"></div>`;

  function renderTab(tab) {
    const box = document.getElementById('masterContent');
    if (tab === 'barang') {
      box.innerHTML = `
        <div class="grid-2" style="align-items:end;">
          <div class="field"><label>Nama Barang</label><input id="mNama"></div>
          <div class="field"><label>Satuan</label><input id="mSatuan"></div>
        </div>
        <button class="btn btn-primary btn-sm" id="mAddBtn">Tambah Barang</button>
        <div class="table-wrap" style="margin-top:1rem;"><table class="data-table"><thead><tr><th>Nama</th><th>Satuan</th><th></th></tr></thead>
        <tbody>${master.barang.map((b, i) => `<tr><td>${b.NamaBarang}</td><td>${b.Satuan}</td><td style="white-space:nowrap;">
          <button class="btn btn-outline btn-sm" onclick="editMasterBarang(${i})">Edit</button>
          <button class="btn btn-outline btn-sm" onclick="hapusMaster('barang','${b.NamaBarang}')">Hapus</button></td></tr>`).join('')}</tbody></table></div>`;
      document.getElementById('mAddBtn').addEventListener('click', async () => {
        await apiPost('addMasterBarang', { namaBarang: document.getElementById('mNama').value, satuan: document.getElementById('mSatuan').value });
        showToast('Barang ditambahkan.'); router();
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
        <tbody>${master.pegawai.map((p, i) => `<tr><td>${p.Nama}</td><td>${p.Jabatan || '<span class="text-danger">belum diisi</span>'}</td><td>${p.Email}</td><td>${p.Role}</td><td>${p.BidangKode}</td><td style="white-space:nowrap;">
          <button class="btn btn-outline btn-sm" onclick="editMasterPegawai(${i})">Edit</button>
          <button class="btn btn-outline btn-sm" onclick="hapusMaster('pegawai','${p.Email}')">Hapus</button></td></tr>`).join('')}</tbody></table></div>`;
      document.getElementById('mAddBtn').addEventListener('click', async () => {
        await apiPost('addMasterPegawai', {
          nama: document.getElementById('mNama').value, nip: document.getElementById('mNip').value,
          email: document.getElementById('mEmail').value, jabatan: document.getElementById('mJabatan').value,
          role: document.getElementById('mRole').value, bidangKode: document.getElementById('mBidang').value
        });
        showToast('Pegawai ditambahkan.'); router();
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
        <tbody>${master.bidang.map((b, i) => `<tr><td>${b.KodeBidang}</td><td>${b.NamaBidang}</td><td>${b.Singkatan || '-'}</td><td>${b.AtasanMengetahuiEmail}</td><td>${b.AtasanMenyetujuiEmail}</td><td style="white-space:nowrap;">
          <button class="btn btn-outline btn-sm" onclick="editMasterBidang(${i})">Edit</button>
          <button class="btn btn-outline btn-sm" onclick="hapusMaster('bidang','${b.KodeBidang}')">Hapus</button></td></tr>`).join('')}</tbody></table></div>`;
      document.getElementById('mAddBtn').addEventListener('click', async () => {
        await apiPost('addMasterBidang', {
          kodeBidang: document.getElementById('mKode').value, namaBidang: document.getElementById('mNamaBidang').value,
          singkatan: document.getElementById('mSingkatan').value,
          atasanMengetahuiEmail: document.getElementById('mAM').value, atasanMenyetujuiEmail: document.getElementById('mAS').value
        });
        showToast('Bidang ditambahkan.'); router();
      });
    }
  }
  window.editMasterBarang = function (i) {
    const b = master.barang[i];
    openModal(`
      <h3 class="section-title" style="font-size:16px;">Edit Barang</h3>
      <div class="field"><label>Nama Barang</label><input id="eNama" value="${b.NamaBarang}"></div>
      <div class="field"><label>Satuan</label><input id="eSatuan" value="${b.Satuan}"></div>
      <div class="field"><label>Kategori</label><input id="eKategori" value="${b.Kategori || ''}"></div>
      <div style="display:flex;gap:.6rem;"><button class="btn btn-primary" id="eSaveBtn">Simpan</button><button class="btn btn-outline" onclick="closeModal()">Batal</button></div>`);
    document.getElementById('eSaveBtn').addEventListener('click', async () => {
      await apiPost('updateMasterBarang', {
        originalNama: b.NamaBarang, namaBarang: document.getElementById('eNama').value,
        satuan: document.getElementById('eSatuan').value, kategori: document.getElementById('eKategori').value
      });
      showToast('Barang berhasil diperbarui.'); closeModal(); router();
    });
  };

  window.editMasterPegawai = function (i) {
    const p = master.pegawai[i];
    const roles = ['Admin', 'Pemohon', 'Atasan Mengetahui', 'Atasan Menyetujui', 'Perlengkapan'];
    openModal(`
      <h3 class="section-title" style="font-size:16px;">Edit Pegawai</h3>
      <div class="field"><label>Nama</label><input id="eNama" value="${p.Nama}"></div>
      <div class="field"><label>NIP</label><input id="eNip" value="${p.NIP || ''}"></div>
      <div class="field"><label>Email</label><input id="eEmail" value="${p.Email}"></div>
      <div class="field"><label>Jabatan (tercantum di Berita Acara)</label><input id="eJabatan" value="${p.Jabatan || ''}" placeholder="mis. Pengurus Barang"></div>
      <div class="field"><label>Role</label><select id="eRole">${roles.map(r => `<option ${r === p.Role ? 'selected' : ''}>${r}</option>`).join('')}</select></div>
      <div class="field"><label>Kode Bidang</label><input id="eBidang" value="${p.BidangKode || ''}"></div>
      <div style="display:flex;gap:.6rem;"><button class="btn btn-primary" id="eSaveBtn">Simpan</button><button class="btn btn-outline" onclick="closeModal()">Batal</button></div>
      <hr style="margin:1.25rem 0;border:none;border-top:1px solid var(--border-subtle);">
      <div class="field-hint" style="margin-bottom:.5rem;">Lupa/hilang akses password? Reset ke password baru di bawah ini (pegawai wajib diberi tahu manual oleh Admin).</div>
      <div class="field"><label>Password Baru (opsional, min. 6 karakter — kosongkan untuk pakai default "dishub123")</label><input type="text" id="eNewPass" placeholder="dishub123"></div>
      <button class="btn btn-outline btn-block" id="eResetPassBtn">🔑 Reset Password Akun Ini</button>`);
    document.getElementById('eSaveBtn').addEventListener('click', async () => {
      await apiPost('updateMasterPegawai', {
        originalEmail: p.Email, nama: document.getElementById('eNama').value, nip: document.getElementById('eNip').value,
        email: document.getElementById('eEmail').value, role: document.getElementById('eRole').value, bidangKode: document.getElementById('eBidang').value,
        jabatan: document.getElementById('eJabatan').value
      });
      showToast('Data pegawai berhasil diperbarui.'); closeModal(); router();
    });
    document.getElementById('eResetPassBtn').addEventListener('click', async () => {
      if (!confirm('Reset password akun ' + p.Nama + '?')) return;
      const newPassword = document.getElementById('eNewPass').value;
      const res = await apiPost('adminResetPassword', { email: p.Email, newPassword });
      closeModal();
      alert('Password akun ' + p.Nama + ' (' + p.Email + ') berhasil direset menjadi:\n\n' + res.newPassword + '\n\nSegera beri tahu pemilik akun secara manual, dan minta mereka menggantinya lagi lewat menu "Ganti Password".');
    });
  };

  window.editMasterBidang = function (i) {
    const b = master.bidang[i];
    openModal(`
      <h3 class="section-title" style="font-size:16px;">Edit Bidang</h3>
      <div class="field"><label>Kode Bidang</label><input id="eKode" value="${b.KodeBidang}"></div>
      <div class="field"><label>Nama Bidang</label><input id="eNama" value="${b.NamaBidang}"></div>
      <div class="field"><label>Singkatan (untuk penomoran surat, mis. "KEU")</label><input id="eSingkatan" value="${b.Singkatan || ''}"></div>
      <div class="field"><label>Email Atasan Mengetahui</label><input id="eAM" value="${b.AtasanMengetahuiEmail || ''}"></div>
      <div class="field"><label>Email Atasan Menyetujui</label><input id="eAS" value="${b.AtasanMenyetujuiEmail || ''}"></div>
      <div style="display:flex;gap:.6rem;"><button class="btn btn-primary" id="eSaveBtn">Simpan</button><button class="btn btn-outline" onclick="closeModal()">Batal</button></div>`);
    document.getElementById('eSaveBtn').addEventListener('click', async () => {
      await apiPost('updateMasterBidang', {
        originalKode: b.KodeBidang, kodeBidang: document.getElementById('eKode').value, namaBidang: document.getElementById('eNama').value,
        singkatan: document.getElementById('eSingkatan').value,
        atasanMengetahuiEmail: document.getElementById('eAM').value, atasanMenyetujuiEmail: document.getElementById('eAS').value
      });
      showToast('Data bidang berhasil diperbarui.'); closeModal(); router();
    });
  };

  document.querySelectorAll('#masterTabs .chip-filter').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#masterTabs .chip-filter').forEach(c => c.classList.toggle('active', c === chip));
      renderTab(chip.dataset.tab);
    });
  });
  renderTab('barang');
}

window.hapusMaster = async function (jenis, value) {
  if (!confirm('Hapus data ini?')) return;
  await apiPost('deleteMaster', { jenis, value });
  showToast('Data dihapus.'); router();
};
