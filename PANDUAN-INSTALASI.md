# 📋 Panduan Instalasi — SI-NOMER

Aplikasi ini punya 2 bagian yang dipasang terpisah:
1. **Backend** (Google Apps Script) — database & logika alur nota.
2. **Frontend** (folder ini) — tampilan yang dibuka pengguna, di-deploy ke **GitHub Pages**.

Ikuti urutan di bawah — backend **harus** selesai dulu sebelum frontend, karena frontend butuh URL backend.

---

## 🔧 BAGIAN 1 — Setup Backend (Google Apps Script)

1. Buka **https://script.google.com** → **Proyek Baru**.
2. Rename file `Code.gs` bawaan menjadi `Kode` → hapus isinya → paste isi **Kode.gs** yang diberikan terpisah di percakapan.
3. Tambahkan file baru (ikon **+** di sebelah "Files") untuk masing-masing: `Auth.gs`, `Nota.gs`, `PdfQr.gs`, `MasterData.gs` — paste isi masing-masing dari berkas yang diberikan.
4. Buka **Project Settings** (ikon gerigi) → centang **"Show appsscript.json manifest file in editor"** → buka `appsscript.json` → ganti isinya dengan isi `appsscript.json` yang diberikan.
5. Jalankan fungsi **`setupAppEnvironment`** — **HANYA SEKALI**:
   - Di dropdown pemilihan fungsi (atas editor), pilih `setupAppEnvironment` → klik ▶ **Run**.
   - Klik **Review permissions** → pilih akun Google Workspace Dishub Riau → **Allow** (izinkan akses Sheets, Drive, Gmail).
   - Buka **Execution log** — pastikan muncul `✅ Setup selesai!` beserta URL Spreadsheet & Drive Folder.
   - ⚠️ **Jangan** jalankan `setupAppEnvironment` lebih dari sekali (akan membuat folder & sheet duplikat). Kalau tidak sengaja terlanjur, hapus manual folder/sheet duplikat di Drive.
6. **Deploy** → **New deployment** → ikon gerigi → pilih **Web app**:
   - **Execute as:** Me
   - **Who has access:** Anyone
   - Klik **Deploy** → **salin URL yang diakhiri `/exec`**.
7. Simpan URL `/exec` tersebut — akan dipakai di langkah frontend.

**Uji cepat:** buka URL `/exec?action=getMasterData&jenis=semua` di tab browser baru — kalau muncul teks JSON berisi data barang/pegawai/bidang, backend sudah berjalan.

---

## 🌐 BAGIAN 2 — Isi URL Backend ke Frontend

1. Buka file `js/config.js` di folder frontend ini (folder yang Anda unduh/ekstrak dari ZIP).
2. Ganti baris:
   ```js
   const GAS_URL = 'https://script.google.com/macros/s/XXXXXXXXXXXXXXXXXXXXXXXXXXXX/exec';
   ```
   dengan URL `/exec` dari Bagian 1 langkah 6.
3. Simpan file.

---

## 🚀 BAGIAN 3 — Deploy Frontend ke GitHub Pages

> Panduan detail langkah demi langkah (install Git, buat akun, dsb.) mengikuti skill **github-pages-deploy-guide**. Ringkasannya:

### Struktur folder yang benar
Folder frontend hasil ekstraksi ZIP **adalah** folder yang nanti langsung di-`git init` — **tidak ada folder pembungkus** di atasnya:
```
si-nomer-frontend/        ← folder inilah yang di-`git init`
├── index.html            ← harus di root
├── css/style.css
├── js/
│   ├── config.js         ← sudah diisi GAS_URL
│   ├── api.js
│   ├── auth.js
│   └── app.js
├── assets/logo.png
└── README.md
```

### Langkah ringkas (terminal)
```bash
# 1. Masuk ke folder frontend (pastikan `ls`/`dir` menampilkan index.html)
cd path/ke/si-nomer-frontend

# 2. Inisialisasi git & commit pertama
git init
git add .
git commit -m "Deploy awal SI-NOMER"
git branch -M main

# 3. Hubungkan ke repository GitHub (buat dulu repo PUBLIC baru, tanpa README)
git remote add origin https://github.com/USERNAME/si-nomer.git
git push -u origin main
```
Saat diminta password, gunakan **Personal Access Token** (bukan password akun biasa) — buat di GitHub: **Settings → Developer settings → Personal access tokens → Generate new token (classic)**, centang scope `repo`.

### Aktifkan GitHub Pages
1. Di repo GitHub → **Settings** → **Pages**.
2. **Source:** Deploy from branch → **Branch: main**, folder **/ (root)** → **Save**.
3. Tunggu 1–2 menit, situs akan tersedia di `https://USERNAME.github.io/si-nomer/`.

### Verifikasi
1. Buka URL situs → halaman login SI-NOMER harus tampil dengan styling lengkap (bukan teks polos).
2. Login dengan salah satu akun contoh di `README.md`.
3. Buka **Chrome DevTools (F12) → Network** → pastikan tidak ada error CORS/404 saat memuat dashboard.
4. Kalau halaman tampil tanpa styling / error 404 di file CSS-JS → cek folder `css/` dan `js/` benar-benar ter-upload (lihat Troubleshooting di skill `github-pages-deploy-guide`).

---

## ✅ Checklist Akhir
- [ ] `setupAppEnvironment()` sudah dijalankan sekali, log menampilkan sukses.
- [ ] Web App GAS ter-deploy dengan akses **Anyone**, URL `/exec` sudah dicatat.
- [ ] `js/config.js` sudah berisi `GAS_URL` yang benar (bukan placeholder `XXXX`).
- [ ] `index.html` berada di **root** repository GitHub (bukan di dalam subfolder).
- [ ] GitHub Pages aktif, branch `main`, folder root.
- [ ] Login berhasil & dashboard menampilkan data.
- [ ] Segera ganti password contoh di Data Master setelah go-live.

## 🔒 Catatan Keamanan & Batasan
- Login dibatasi ke domain `@dishub.riau.go.id`, divalidasi di backend.
- Password disimpan ter-hash (SHA-256) di Google Sheets — tetap disarankan membatasi akses Spreadsheet hanya untuk Admin sistem.
- QR Code memakai layanan publik QuickChart (tanpa API key) untuk render gambar; kode verifikasi unik tetap divalidasi di backend melalui `action=verifyQr`.
- PDF final (dengan kedua QR) disimpan permanen ke Drive; PDF tahap-tahap sebelumnya digenerate on-the-fly setiap diunduh, tidak disimpan — sesuai PRD bagian 4.2.
