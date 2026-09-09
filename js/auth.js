// ============================================================
// SI-NOMER — Sesi Pengguna
// Sesi disimpan di localStorage supaya bertahan saat halaman
// di-refresh. Sesi dihapus saat pengguna klik "Keluar Sistem".
// ============================================================

const SESSION_KEY = 'sinomer_session';

let currentUser = null;

// Dipanggil sekali saat aplikasi pertama dimuat, sebelum router jalan.
function restoreSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) currentUser = JSON.parse(raw);
  } catch (err) {
    currentUser = null;
  }
}

function isLoggedIn() {
  return currentUser !== null;
}

function requireRole(...roles) {
  return currentUser && roles.includes(currentUser.role);
}

async function doLogin(email, password) {
  const result = await apiPost('login', { email, password });
  currentUser = result.user;
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser)); } catch (err) { /* localStorage tidak tersedia, sesi tetap jalan di memori */ }
  return result.user;
}

function doLogout() {
  currentUser = null;
  try { localStorage.removeItem(SESSION_KEY); } catch (err) { /* abaikan */ }
  location.hash = '#/login';
}
