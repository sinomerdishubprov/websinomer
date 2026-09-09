// ============================================================
// SI-NOMER — Sesi Pengguna
// CATATAN: sesi disimpan hanya di memori (variabel JS) sehingga
// akan hilang saat halaman di-refresh. Untuk sesi yang bertahan,
// hubungkan ke mekanisme penyimpanan sisi-klien milik platform
// deployment Anda (lihat catatan di PANDUAN-INSTALASI.md).
// ============================================================

let currentUser = null;

function isLoggedIn() {
  return currentUser !== null;
}

function requireRole(...roles) {
  return currentUser && roles.includes(currentUser.role);
}

async function doLogin(email, password) {
  const result = await apiPost('login', { email, password });
  currentUser = result.user;
  return result.user;
}

function doLogout() {
  currentUser = null;
  location.hash = '#/login';
}
