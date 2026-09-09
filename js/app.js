// ============================================================
// SI-NOMER — Aplikasi Utama (SPA vanilla JS, hash router)
// ============================================================

const root = document.getElementById('app');

const STATUS_ICON = { Diajukan: '📄', Diketahui: '📦', Disetujui: '✅', Diproses: '🚚', Selesai: '✔️' };
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
    ['#/proses-barang', '🚚 Proses Barang'],
    ['#/laporan', '📊 Laporan & Rekap']
  ]
};

function initials(nama) {
  return (nama || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function statusBadge(status) {
  const map = { Diajukan: 'badge-diajukan', Diketahui: 'badge-diketahui', Disetujui: 'badge-disetujui', Diproses: 'badge-diproses', Selesai: 'badge-selesai', Ditolak: 'badge-ditolak' };
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
    else if (hash === '#/tinjau-persetujuan') await renderNotaList(content, { status: 'Diketahui', title: 'Tinjau Persetujuan', actionMode: 'menyetujui' });
    else if (hash === '#/proses-barang') await renderNotaList(content, { status: 'Diproses', title: 'Proses Barang', actionMode: 'perlengkapan' });
    else if (hash.startsWith('#/detail/')) await renderDetail(content, decodeURIComponent(hash.split('#/detail/')[1]));
    else if (hash === '#/laporan') await renderLaporan(content);
    else if (hash === '#/data-master') await renderDataMaster(content);
    else content.innerHTML = '<div class="empty-state">Halaman tidak ditemukan.</div>';
  } catch (err) {
    content.innerHTML = `<div class="empty-state">Gagal memuat halaman: ${err.message}</div>`;
  }

  highlightActiveNav();
}
window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', router);

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
          <label>Email Dinas</label>
          <input type="email" id="loginEmail" placeholder="nama@dishub.riau.go.id" required>
        </div>
        <div class="field" style="text-align:left;">
          <label>Kata Sandi</label>
          <input type="password" id="loginPassword" required>
        </div>
        <button class="btn btn-primary btn-block" type="submit" id="loginBtn">Masuk</button>
      </form>
      <div class="text-muted" style="font-size:11.5px;margin-top:1rem;">Hanya email internal Dishub Provinsi Riau yang dapat login.</div>
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
        ${navItems.slice(0, 4).map(([href, label]) => `<a href="${href}">${label.split(' ')[0]}<span>${label.split(' ').slice(1).join(' ')}</span></a>`).join('')}
      </div>
    </div>
  </div>`;

  document.getElementById('logoutBtn').addEventListener('click', doLogout);
  document.getElementById('globalSearch').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      sessionSearchQuery = e.target.value.trim();
      location.hash = '#/nota-saya';
    }
  });
}
let sessionSearchQuery = '';

// ------------------------------------------------------------
// DASHBOARD
// ------------------------------------------------------------
async function renderDashboard(content) {
  const res = await apiGet('getDashboard', { email: currentUser.email });
  const s = res.stats, sc = res.stageCount;

  content.innerHTML = `
  <div class="hero-card">
    <div class="badges"><span class="pill">● Sistem Aktif</span><span class="pill">Google Workspace Terhubung</span></div>
    <h1>Selamat Datang, ${currentUser.nama} 👋</h1>
    <p>Pantau alur pengajuan nota permintaan barang, paraf digital ber-QR, dan status disposisi logistik Anda secara real-time tanpa hambatan birokrasi.</p>
    ${currentUser.role === 'Pemohon' ? `<a href="#/buat-nota" class="btn btn-primary">➕ Ajukan Nota Baru</a>` : ''}
  </div>

  <div class="stats-grid">
    <div class="card stat-card"><div class="stat-icon" style="background:var(--pastel-blue);">📋</div><div><div class="stat-value">${s.totalNotaBulanIni}</div><div class="stat-label">NOTA BULAN INI</div><div class="stat-sub">✅ ${s.selesaiBulanIni} Selesai</div></div></div>
    <div class="card stat-card"><div class="stat-icon" style="background:var(--pastel-amber);">❗</div><div><div class="stat-value">${s.butuhTindakan}</div><div class="stat-label">BUTUH TINDAKAN</div><div class="stat-sub">Perlu ditinjau segera</div></div></div>
    <div class="card stat-card"><div class="stat-icon" style="background:var(--pastel-green);">🎯</div><div><div class="stat-value">${s.realisasiPersen}%</div><div class="stat-label">REALISASI BARANG</div><div class="stat-sub">Nota diselesaikan tuntas</div></div></div>
    <div class="card stat-card"><div class="stat-icon" style="background:var(--pastel-purple);">⏱️</div><div><div class="stat-value">${res.notaTerbaru.length}</div><div class="stat-label">NOTA TERBARU</div><div class="stat-sub">Ditampilkan di bawah</div></div></div>
  </div>

  <div class="card" style="margin-bottom:1.5rem;">
    <div class="flex-between"><h3 class="section-title" style="margin:0;">📈 Pelacakan Nota Saya</h3><a href="#/nota-saya">Lihat Semua →</a></div>
    <div class="tracker">
      ${['Diajukan', 'Diketahui', 'Disetujui', 'Diproses', 'Selesai'].map((st, i) => `
        <div class="tracker-step ${sc[st] > 0 ? 'active' : ''}">
          <div class="tracker-line"></div>
          <div class="tracker-node">${STATUS_ICON[st]}</div>
          <div class="tracker-title">${st}</div>
          <div class="tracker-count">${sc[st]} Nota</div>
        </div>`).join('')}
    </div>
  </div>

  <div class="card">
    <div class="flex-between"><h3 class="section-title" style="margin:0;">Nota Permintaan Terkini</h3><a href="#/nota-saya">Lihat Semua →</a></div>
    ${renderNotaTable(res.notaTerbaru)}
  </div>`;
}

function renderNotaTable(list) {
  if (!list.length) return `<div class="empty-state">Belum ada nota untuk ditampilkan.</div>`;
  return `<div class="table-wrap"><table class="data-table">
    <thead><tr><th>No. Nota</th><th>Tanggal</th><th>Bidang</th><th>Pemohon</th><th>Status</th></tr></thead>
    <tbody>${list.map(n => `
      <tr class="row-link" onclick="location.hash='#/detail/${encodeURIComponent(n.NoNota)}'">
        <td class="no-nota-cell">${n.NoNota}</td>
        <td>${n.Tanggal}</td>
        <td>${n.BidangNama}</td>
        <td>${n.PemohonNama}</td>
        <td>${statusBadge(n.Status)}</td>
      </tr>`).join('')}</tbody></table></div>`;
}

// ------------------------------------------------------------
// BUAT NOTA BARU
// ------------------------------------------------------------
async function renderBuatNota(content) {
  const master = await apiGet('getMasterData', { jenis: 'semua' });
  const barangList = master.barang;

  content.innerHTML = `
  <h2 class="section-title">➕ Ajukan Nota Permintaan Barang</h2>
  <div class="card">
    <div class="grid-2">
      <div class="field"><label>Bidang / Unit Kerja</label>
        <select id="fBidang">${master.bidang.map(b => `<option value="${b.KodeBidang}" ${b.KodeBidang === currentUser.bidangKode ? 'selected' : ''}>${b.NamaBidang}</option>`).join('')}</select>
      </div>
      <div class="field"><label>Tanggal Pengajuan</label><input type="text" value="${new Date().toLocaleDateString('id-ID')}" disabled></div>
    </div>
    <div class="field"><label>Tujuan / Keperluan</label><textarea id="fTujuan" placeholder="Jelaskan kebutuhan operasional..."></textarea></div>

    <div class="flex-between"><label style="font-weight:600;">Daftar Barang</label><button type="button" class="btn btn-outline btn-sm" id="addItemBtn">➕ Tambah Barang</button></div>
    <div id="itemsWrap"></div>

    <div style="margin-top:1.5rem;display:flex;gap:.75rem;">
      <button class="btn btn-primary" id="submitNotaBtn">Ajukan Nota</button>
      <a href="#/dashboard" class="btn btn-outline">Batal</a>
    </div>
  </div>`;

  const itemsWrap = document.getElementById('itemsWrap');
  let itemCount = 0;

  function addItemRow() {
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
          ${barangList.map(b => `<option value="${b.NamaBarang}" data-satuan="${b.Satuan}" data-kode="${b.KodeBMN}">${b.NamaBarang}</option>`).join('')}
          <option value="__lainnya__">Lainnya (ketik manual)</option>
        </select>
        <input class="itemBarangManual" style="display:none;margin-top:.4rem;" placeholder="Nama barang lainnya">
      </div>
      <div class="field" style="margin-bottom:0;"><label>Jumlah</label><input type="number" class="itemJumlah" min="1" value="1"></div>
      <div class="field" style="margin-bottom:0;"><label>Satuan</label><input class="itemSatuan" placeholder="pcs/rim/dll"></div>
      <button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById('${rowId}').remove()">✕</button>`;
    itemsWrap.appendChild(row);
  }
  window.autoFillSatuan = function (sel) {
    const row = sel.closest('.grid-2');
    const manual = row.querySelector('.itemBarangManual');
    if (sel.value === '__lainnya__') { manual.style.display = 'block'; return; }
    manual.style.display = 'none';
    const opt = sel.selectedOptions[0];
    row.querySelector('.itemSatuan').value = opt.dataset.satuan || '';
  };
  document.getElementById('addItemBtn').addEventListener('click', addItemRow);
  addItemRow();

  document.getElementById('submitNotaBtn').addEventListener('click', async () => {
    const items = [];
    itemsWrap.querySelectorAll('.grid-2').forEach(row => {
      const sel = row.querySelector('.itemBarang');
      const namaBarang = sel.value === '__lainnya__' ? row.querySelector('.itemBarangManual').value : sel.value;
      const jumlah = row.querySelector('.itemJumlah').value;
      const satuan = row.querySelector('.itemSatuan').value;
      const kodeBMN = sel.selectedOptions[0] ? sel.selectedOptions[0].dataset.kode : '';
      if (namaBarang && jumlah) items.push({ namaBarang, jumlah: Number(jumlah), satuan, kodeBMN });
    });
    if (!items.length) return showToast('Tambahkan minimal satu barang.', 'error');

    const btn = document.getElementById('submitNotaBtn');
    btn.disabled = true; btn.textContent = 'Mengirim...';
    try {
      const res = await apiPost('createNota', {
        pemohonEmail: currentUser.email,
        bidangKode: document.getElementById('fBidang').value,
        tujuan: document.getElementById('fTujuan').value,
        items
      });
      showToast(res.message);
      location.hash = '#/detail/' + encodeURIComponent(res.noNota);
    } catch (err) { btn.disabled = false; btn.textContent = 'Ajukan Nota'; }
  });
}

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
    ${['Semua', 'Diajukan', 'Diketahui', 'Diproses', 'Selesai', 'Ditolak'].map(s => `<span class="chip-filter ${s === (opts.status || 'Semua') ? 'active' : ''}" data-status="${s}">${s}</span>`).join('')}
  </div>
  <div class="card">${renderNotaTable(res.data)}</div>`;

  document.getElementById('clearSearch')?.addEventListener('click', (e) => { e.preventDefault(); sessionSearchQuery = ''; router(); });
  document.querySelectorAll('#statusFilter .chip-filter').forEach(chip => {
    chip.addEventListener('click', async () => {
      const status = chip.dataset.status;
      const p = { email: currentUser.email };
      if (status !== 'Semua') p.status = status;
      if (sessionSearchQuery) p.q = sessionSearchQuery;
      const r = await apiGet('getNotaList', p);
      document.querySelectorAll('#statusFilter .chip-filter').forEach(c => c.classList.toggle('active', c === chip));
      content.querySelector('.card').innerHTML = renderNotaTable(r.data);
    });
  });
}

// ------------------------------------------------------------
// DETAIL NOTA — termasuk aksi paraf/tinjau/proses sesuai role
// ------------------------------------------------------------
async function renderDetail(content, noNota) {
  const res = await apiGet('getNotaDetail', { noNota });
  const n = res.nota, items = res.items, log = res.log;
  const stageOrder = ['Diajukan', 'Diketahui', 'Diproses', 'Selesai'];
  const currentIdx = n.Status === 'Ditolak' ? -1 : stageOrder.indexOf(n.Status);

  content.innerHTML = `
  <div class="flex-between" style="margin-bottom:1rem;">
    <div><a href="#/nota-saya" style="font-size:12.5px;">← Kembali</a>
      <h2 class="section-title" style="margin:.2rem 0 0;">${n.NoNota}</h2></div>
    <div>${statusBadge(n.Status)}
      <button class="btn btn-outline btn-sm" id="unduhPdfBtn">⬇️ Unduh PDF</button></div>
  </div>

  <div class="two-col">
    <div>
      <div class="card" style="margin-bottom:1rem;">
        <table class="data-table" style="border:none;">
          <tr><td class="text-muted">Bidang / Unit Kerja</td><td><b>${n.BidangNama}</b></td></tr>
          <tr><td class="text-muted">Pejabat Pemohon</td><td><b>${n.PemohonNama}</b> (NIP. ${n.PemohonNIP})</td></tr>
          <tr><td class="text-muted">Tujuan / Keperluan</td><td>${n.Tujuan || '-'}</td></tr>
          <tr><td class="text-muted">Tanggal Pengajuan</td><td>${n.Tanggal}</td></tr>
        </table>
      </div>

      <div class="card" style="margin-bottom:1rem;">
        <h3 class="section-title" style="font-size:15px;">Daftar Barang</h3>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>Barang</th><th>Satuan</th><th>Diminta</th><th>Disetujui</th><th>Keputusan</th><th>Catatan</th></tr></thead>
          <tbody id="itemsBody">${items.map(it => `
            <tr>
              <td>${it.NamaBarang}<br><span class="text-muted" style="font-size:11px;">Kode: ${it.KodeBMN || '-'}</span></td>
              <td>${it.Satuan}</td><td>${it.JumlahDiminta}</td><td>${it.JumlahDisetujui || '-'}</td>
              <td>${it.StatusItem ? statusBadge(it.StatusItem === 'Penuh' ? 'Selesai' : it.StatusItem === 'Ditolak' ? 'Ditolak' : 'Diproses') + ' ' + it.StatusItem : '<span class="text-muted">Menunggu</span>'}</td>
              <td>${it.Alasan || '-'}</td>
            </tr>`).join('')}</tbody>
        </table></div>
      </div>

      ${renderAksiRole(n, items)}

      <div class="dual-auth">
        <div class="auth-box"><div class="text-muted" style="font-size:11px;font-weight:600;">MENGETAHUI / MEMERIKSA</div>
          <div style="font-weight:600;">Kepala Seksi Terkait</div>
          <div class="qr-placeholder">${n.QRKiriKode ? 'QR: ' + n.QRKiriKode : 'Belum diparaf'}</div>
          <div style="font-size:12.5px;">${n.AtasanMengetahuiNama || '-'}</div>
          <div class="text-muted" style="font-size:11px;">${n.TglDiketahui || ''}</div></div>
        <div class="auth-box"><div class="text-muted" style="font-size:11px;font-weight:600;">MENYETUJUI / PEJABAT BERWENANG</div>
          <div style="font-weight:600;">Sekretaris Dinas Perhubungan</div>
          <div class="qr-placeholder">${n.QRKananKode ? 'QR: ' + n.QRKananKode : 'Belum disetujui'}</div>
          <div style="font-size:12.5px;">${n.AtasanMenyetujuiNama || '-'}</div>
          <div class="text-muted" style="font-size:11px;">${n.TglDisetujui || ''}</div></div>
      </div>
    </div>

    <div>
      <div class="card" style="margin-bottom:1rem;">
        <h3 class="section-title" style="font-size:14px;">Alur Progres Nota</h3>
        ${stageOrder.map((st, i) => `
          <div style="display:flex;gap:.6rem;margin-bottom:.9rem;">
            <div style="width:26px;height:26px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;
              background:${i <= currentIdx ? 'var(--primary)' : 'var(--surface-subtle)'};color:${i <= currentIdx ? '#fff' : 'var(--text-muted)'};">${i + 1}</div>
            <div><div style="font-weight:600;font-size:13px;">${st}</div></div>
          </div>`).join('')}
        ${n.Status === 'Ditolak' ? `<div class="badge badge-ditolak">Nota Ditolak</div>` : ''}
      </div>

      <div class="card">
        <h3 class="section-title" style="font-size:14px;">Log Riwayat Dokumen</h3>
        ${log.length ? log.map(l => `<div class="timeline-item"><div class="timeline-dot"></div><div><b>${l.Aksi}</b> — ${l.Aktor}<br><span class="text-muted">${l.Keterangan}</span><br><span class="text-muted">${l.Timestamp}</span></div></div>`).join('') : '<div class="text-muted">Belum ada riwayat.</div>'}
      </div>
    </div>
  </div>`;

  document.getElementById('unduhPdfBtn').addEventListener('click', async () => {
    try {
      const pdf = await apiGet('getPdf', { noNota });
      const link = document.createElement('a');
      link.href = 'data:application/pdf;base64,' + pdf.base64;
      link.download = pdf.filename;
      link.click();
    } catch (err) {}
  });

  attachDetailActionHandlers(n, items);
}

function renderAksiRole(n, items) {
  if (currentUser.role === 'Atasan Mengetahui' && n.Status === 'Diajukan') {
    return `<div class="card" style="margin-bottom:1rem;">
      <h3 class="section-title" style="font-size:14px;">Tindakan: Paraf Mengetahui</h3>
      <div class="field"><label>Catatan (opsional)</label><textarea id="catatanMengetahui" placeholder="mis. Disetujui sesuai kuota."></textarea></div>
      <div style="display:flex;gap:.6rem;">
        <button class="btn btn-success" id="btnSetujuiMengetahui">✅ Setujui (Mengetahui)</button>
        <button class="btn btn-danger" id="btnTolakMengetahui">❌ Tolak</button>
      </div></div>`;
  }
  if (currentUser.role === 'Atasan Menyetujui' && n.Status === 'Diketahui') {
    return `<div class="card" style="margin-bottom:1rem;">
      <h3 class="section-title" style="font-size:14px;">Tindakan: Tinjau Per Item Barang</h3>
      <div id="reviewItems">${items.map(it => `
        <div class="item-review" data-id="${it.ID}">
          <div class="item-review-head"><b>${it.NamaBarang}</b><span class="text-muted">Diminta: ${it.JumlahDiminta} ${it.Satuan}</span></div>
          <div class="decision-options">
            <button type="button" class="decision-btn" data-decision="Penuh">✅ Disetujui Penuh</button>
            <button type="button" class="decision-btn" data-decision="Sebagian">⚠️ Disetujui Sebagian</button>
            <button type="button" class="decision-btn" data-decision="Ditolak">❌ Ditolak</button>
          </div>
          <div class="field" style="margin-top:.5rem;display:none;" data-field="jumlah"><label>Jumlah Disetujui</label><input type="number" class="jumlahDisetujuiInput" value="${it.JumlahDiminta}"></div>
          <div class="field" style="margin-top:.5rem;display:none;" data-field="alasan"><label>Alasan</label><input class="alasanInput" placeholder="Wajib diisi jika ditolak/sebagian"></div>
        </div>`).join('')}</div>
      <div class="field"><label>Catatan Keseluruhan (opsional)</label><textarea id="catatanMenyetujui"></textarea></div>
      <button class="btn btn-primary" id="btnSimpanTinjauan">Simpan Keputusan & Terbitkan QR</button>
    </div>`;
  }
  if (currentUser.role === 'Perlengkapan' && n.Status === 'Diproses') {
    return `<div class="card" style="margin-bottom:1rem;">
      <h3 class="section-title" style="font-size:14px;">Tindakan: Proses & Unggah Bukti Barang</h3>
      <div class="field"><label>Foto Bukti Barang (bisa lebih dari satu)</label><input type="file" id="fotoBukti" accept="image/*" multiple></div>
      <button class="btn btn-primary" id="btnUploadBukti">Selesaikan & Kirim Notifikasi</button>
    </div>`;
  }
  return '';
}

function attachDetailActionHandlers(n, items) {
  document.getElementById('btnSetujuiMengetahui')?.addEventListener('click', async () => {
    await apiPost('approveMengetahui', { noNota: n.NoNota, atasanEmail: currentUser.email, disetujui: true, catatan: document.getElementById('catatanMengetahui').value });
    showToast('Nota berhasil diparaf.'); router();
  });
  document.getElementById('btnTolakMengetahui')?.addEventListener('click', async () => {
    if (!confirm('Yakin ingin menolak nota ini?')) return;
    await apiPost('approveMengetahui', { noNota: n.NoNota, atasanEmail: currentUser.email, disetujui: false, catatan: document.getElementById('catatanMengetahui').value });
    showToast('Nota ditolak.'); router();
  });

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
  document.getElementById('btnSimpanTinjauan')?.addEventListener('click', async () => {
    const cards = document.querySelectorAll('.item-review');
    const itemsPayload = [];
    for (const card of cards) {
      if (!card.dataset.decision) return showToast('Berikan keputusan untuk setiap barang.', 'error');
      itemsPayload.push({
        id: card.dataset.id,
        statusItem: card.dataset.decision,
        jumlahDisetujui: card.querySelector('.jumlahDisetujuiInput').value,
        alasan: card.querySelector('.alasanInput').value
      });
    }
    await apiPost('reviewMenyetujui', { noNota: n.NoNota, atasanEmail: currentUser.email, items: itemsPayload, catatan: document.getElementById('catatanMenyetujui').value });
    showToast('Keputusan tersimpan.'); router();
  });

  document.getElementById('btnUploadBukti')?.addEventListener('click', async () => {
    const files = document.getElementById('fotoBukti').files;
    if (!files.length) return showToast('Pilih minimal satu foto.', 'error');
    const btn = document.getElementById('btnUploadBukti');
    btn.disabled = true; btn.textContent = 'Mengunggah...';
    const fotoBase64 = [];
    for (const f of files) fotoBase64.push({ filename: f.name, mimeType: f.type, base64: await fileToBase64(f) });
    try {
      await apiPost('uploadBukti', { noNota: n.NoNota, petugasEmail: currentUser.email, fotoBase64 });
      showToast('Barang selesai diproses.'); router();
    } catch (err) { btn.disabled = false; btn.textContent = 'Selesaikan & Kirim Notifikasi'; }
  });
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
    ${['Diajukan', 'Diketahui', 'Diproses', 'Selesai'].map(s => `<div class="card"><div class="stat-value">${res.statusCount[s] || 0}</div><div class="stat-label">${s.toUpperCase()}</div></div>`).join('')}
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
        <div class="table-wrap" style="margin-top:1rem;"><table class="data-table"><thead><tr><th>Nama</th><th>Satuan</th><th>Kode BMN</th><th></th></tr></thead>
        <tbody>${master.barang.map(b => `<tr><td>${b.NamaBarang}</td><td>${b.Satuan}</td><td>${b.KodeBMN}</td><td><button class="btn btn-outline btn-sm" onclick="hapusMaster('barang','${b.NamaBarang}')">Hapus</button></td></tr>`).join('')}</tbody></table></div>`;
      document.getElementById('mAddBtn').addEventListener('click', async () => {
        await apiPost('addMasterBarang', { namaBarang: document.getElementById('mNama').value, satuan: document.getElementById('mSatuan').value });
        showToast('Barang ditambahkan.'); router();
      });
    } else if (tab === 'pegawai') {
      box.innerHTML = `
        <div class="grid-2" style="align-items:end;">
          <div class="field"><label>Nama</label><input id="mNama"></div>
          <div class="field"><label>Email</label><input id="mEmail"></div>
        </div>
        <div class="grid-2" style="align-items:end;">
          <div class="field"><label>Role</label>
            <select id="mRole"><option>Admin</option><option>Pemohon</option><option>Atasan Mengetahui</option><option>Atasan Menyetujui</option><option>Perlengkapan</option></select></div>
          <div class="field"><label>Kode Bidang</label><input id="mBidang"></div>
        </div>
        <button class="btn btn-primary btn-sm" id="mAddBtn">Tambah Pegawai</button>
        <div class="table-wrap" style="margin-top:1rem;"><table class="data-table"><thead><tr><th>Nama</th><th>Email</th><th>Role</th><th>Bidang</th><th></th></tr></thead>
        <tbody>${master.pegawai.map(p => `<tr><td>${p.Nama}</td><td>${p.Email}</td><td>${p.Role}</td><td>${p.BidangKode}</td><td><button class="btn btn-outline btn-sm" onclick="hapusMaster('pegawai','${p.Email}')">Hapus</button></td></tr>`).join('')}</tbody></table></div>`;
      document.getElementById('mAddBtn').addEventListener('click', async () => {
        await apiPost('addMasterPegawai', { nama: document.getElementById('mNama').value, email: document.getElementById('mEmail').value, role: document.getElementById('mRole').value, bidangKode: document.getElementById('mBidang').value });
        showToast('Pegawai ditambahkan.'); router();
      });
    } else {
      box.innerHTML = `
        <div class="grid-2" style="align-items:end;">
          <div class="field"><label>Kode Bidang</label><input id="mKode"></div>
          <div class="field"><label>Nama Bidang</label><input id="mNamaBidang"></div>
        </div>
        <div class="grid-2" style="align-items:end;">
          <div class="field"><label>Email Atasan Mengetahui</label><input id="mAM"></div>
          <div class="field"><label>Email Atasan Menyetujui</label><input id="mAS"></div>
        </div>
        <button class="btn btn-primary btn-sm" id="mAddBtn">Tambah Bidang</button>
        <div class="table-wrap" style="margin-top:1rem;"><table class="data-table"><thead><tr><th>Kode</th><th>Nama</th><th>Atasan Mengetahui</th><th>Atasan Menyetujui</th><th></th></tr></thead>
        <tbody>${master.bidang.map(b => `<tr><td>${b.KodeBidang}</td><td>${b.NamaBidang}</td><td>${b.AtasanMengetahuiEmail}</td><td>${b.AtasanMenyetujuiEmail}</td><td><button class="btn btn-outline btn-sm" onclick="hapusMaster('bidang','${b.KodeBidang}')">Hapus</button></td></tr>`).join('')}</tbody></table></div>`;
      document.getElementById('mAddBtn').addEventListener('click', async () => {
        await apiPost('addMasterBidang', { kodeBidang: document.getElementById('mKode').value, namaBidang: document.getElementById('mNamaBidang').value, atasanMengetahuiEmail: document.getElementById('mAM').value, atasanMenyetujuiEmail: document.getElementById('mAS').value });
        showToast('Bidang ditambahkan.'); router();
      });
    }
  }
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
