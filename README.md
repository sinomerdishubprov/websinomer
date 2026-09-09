# SI-NOMER — Sistem Nota Permintaan Barang
### Dinas Perhubungan Provinsi Riau

Aplikasi web internal untuk digitalisasi alur nota permintaan barang: pengajuan → paraf Atasan Mengetahui (QR kiri) → tinjau Atasan Menyetujui per item (QR kanan) → proses gudang Perlengkapan → selesai.

## Arsitektur
- **Frontend:** HTML/CSS/JS vanilla (folder ini), di-deploy ke **GitHub Pages**.
- **Backend:** Google Apps Script sebagai REST API murni (JSON via `doGet`/`doPost`), menyimpan data di Google Sheets & berkas di Google Drive.
- Tidak ada `google.script.run`, tidak ada iframe — komunikasi murni via `fetch()`.

## Sebelum Deploy
1. Deploy backend (`Kode.gs` dkk.) ke Google Apps Script — lihat **PANDUAN-INSTALASI.md**.
2. Salin URL `/exec` hasil deploy ke `js/config.js` pada baris `GAS_URL`.
3. Baru deploy folder ini ke GitHub Pages.

## Struktur Folder
```
index.html
css/style.css
js/config.js   ← isi GAS_URL di sini
js/api.js
js/auth.js
js/app.js
assets/logo.png
```

## Login Contoh (setelah setup awal)
| Role | Email | Password |
|---|---|---|
| Admin | admin@dishub.riau.go.id | dishub123 |
| Pemohon | rudi.santoso@dishub.riau.go.id | dishub123 |
| Atasan Mengetahui | ahmad.fauzi@dishub.riau.go.id | dishub123 |
| Atasan Menyetujui | irwan.saputra@dishub.riau.go.id | dishub123 |
| Perlengkapan | hendra.gunawan@dishub.riau.go.id | dishub123 |

**Segera ganti password contoh setelah setup awal** (lewat menu Data Master → Pegawai, hapus & tambahkan ulang dengan password baru, atau melalui fitur reset password).

## Catatan Keterbatasan
- Sesi login disimpan di memori (hilang saat refresh) — aplikasi ini murni frontend statis tanpa localStorage sesuai batasan platform. Untuk sesi persisten, tambahkan mekanisme penyimpanan sisi-klien sesuai kebutuhan Anda.
- Login via Google Account (OAuth) belum diimplementasikan di versi ini (memerlukan setup OAuth Client terpisah) — saat ini menggunakan email/password internal.
