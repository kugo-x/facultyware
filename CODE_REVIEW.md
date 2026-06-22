# Code Review Request — Modul FTI Aset Ruangan

> Dokumen ini menjelaskan struktur dan kondisi kode proyek **terkini**,
> untuk keperluan sinkronisasi dan meminta review/saran kepada Claude (project manager AI).
> **Terakhir diperbarui: 22 Juni 2026**

---

## 1. Konteks Proyek

Proyek ini adalah **fork** dari sistem manajemen fakultas open-source
([husnilk/facultyware](https://github.com/husnilk/facultyware)).

Saya mengerjakan modul **"FTI Aset Ruangan"**. Fokus arsitektur saat ini adalah **Room-centric**, di mana aset berada *di dalam* ruangan.
- **Kelola Gedung**: CRUD + Search + Statistik + Export PDF/DOCX + REST API
- **Ruangan & Kelola Aset**: CRUD Ruangan + CRUD Aset per Ruangan + Export PDF/DOCX + REST API

### Tech Stack
| Komponen | Detail |
|---|---|
| Runtime | Node.js |
| Framework | Express.js v4 |
| Template Engine | EJS v2.6 |
| Database | MySQL 8 (via `mysql2` — **tanpa ORM**) |
| Session Store | `express-session` + `express-mysql-session` |
| UI | Basecoat (Tailwind CSS component library, vanilla JS) |
| Interaktivitas | HTMX v2.0.4 |
| Export PDF/Word | `pdfkit` / `docx` |
| Auth & Roles | Session-based (`bcryptjs`). Role: `admin` (Full) & `user` (Read-only) |
| Code Formatting | **Prettier** (Diterapkan pada semua file JS backend) |

---

## 2. Struktur Folder Utama

```
facultyware/
├── app.js                        # Entry point, middleware, route registration
├── database/
│   ├── facultyware.sql           # Skema database lengkap + seed
│   └── add_role_to_users.sql     # Migration: tambah kolom role ENUM('admin','user')
├── scripts/
│   └── create_test_user.js       # Script node untuk insert akun test user read-only
├── middlewares/
│   ├── auth.js                   # isAuthenticated, apiAuthenticated, isAdmin
│   ├── acl.js                    # checkPermission: (deprecated/belum terpakai di modul ini)
│   └── error.js                  # notFoundHandler + errorHandler
├── models/
│   ├── gedungModel.js            # Raw SQL untuk `buildings`
│   └── ruanganModel.js           # Raw SQL untuk `rooms`
│   └── asetModel.js              # Raw SQL untuk `assets` (di dalam ruangan)
├── controllers/
│   ├── gedungController.js       
│   └── ruanganController.js      # Menangani CRUD Ruangan sekaligus Aset di dalamnya
├── routes/
│   ├── gedungRoutes.js           # /gedung/* (Diproteksi isAdmin untuk write)
│   ├── ruanganRoutes.js          # /ruangan/* dan /ruangan/:id/aset/* (Diproteksi isAdmin untuk write)
│   └── api/                      # REST API Endpoint
└── views/
    ├── partials/_sidebar.ejs     # Navigasi (REST API disembunyikan, Role info ditambahkan)
    ├── gedung/                   # Tampilan modul gedung
    └── ruangan/                  # Tampilan daftar ruangan dan daftar aset per ruangan
```

---

## 3. Skema Database & Role System

### Relasi Tabel
```
buildings (1) ──────< rooms (N) >──── assets (N)
```

### Tabel `users` (Update Terbaru)
```sql
id, name, email, password (bcrypt), role ENUM('admin', 'user'), created_at, updated_at
```
- **Admin**: Akses penuh (CRUD).
- **User**: Akses Read-only (Hanya bisa melihat daftar, export PDF/DOCX).
- **Migration**: File `database/add_role_to_users.sql`

---

## 4. Pola Kode yang Digunakan

### a. Database & Transaksi (lib/db.js)
```javascript
const conn = await db.getConnection();
try {
  await conn.beginTransaction();
  await conn.query('SET FOREIGN_KEY_CHECKS=0');
  // ... query ...
} catch (err) {
  // ... rollback ...
} finally {
  conn.release();  // Selalu dieksekusi untuk cegah connection leak
}
```

### b. Middlewares (auth.js)
```javascript
// Web Auth
function isAuthenticated(req, res, next) { /* redirect to /login */ }

// Role Auth (Web)
function isAdmin(req, res, next) { 
  /* cek req.session.role === 'admin'. Jika tidak, flash error & redirect back */ 
}

// API Auth (Menghindari HTML Redirect untuk Consumer API)
function apiAuthenticated(req, res, next) { 
  /* kembalikan 401 JSON: { success: false, message: 'Akses ditolak' } */ 
}
```

### c. Routes Protection (Pemisahan Read & Write)
```javascript
// READ — Semua user login bisa akses
router.get('/', isAuthenticated, ruanganController.index);

// WRITE — Hanya admin
router.post('/store', isAuthenticated, isAdmin, ruanganController.store);
```

### d. UI & EJS Data Attributes (Anti-Parsing Error)
Untuk menghindari error parsing *Language Server* di VS Code akibat sintaks EJS di dalam HTML attribute `onclick`, pola yang digunakan adalah **HTML5 `data-*` attributes**:
```html
<!-- DARI: onclick="delete(<%= id %>, <%- JSON.stringify(name) %>)" -->
<!-- MENJADI: -->
<button data-url="/delete/<%= id %>" data-name="<%= name %>" onclick="confirmDelete(this)">
  Hapus
</button>
```

---

## 5. Status Perubahan Terbaru (Per Juni 2026)

### ✅ Selesai Diimplementasikan (Update dari versi sebelumnya)
1. **Perubahan Arsitektur "Room-Centric"**: Modul Aset sekarang menjadi "anak" dari modul Ruangan. URL CRUD aset sekarang berada di bawah ruangan (`/ruangan/:id/aset/...`).
2. **Role System & Read-Only User**: Tabel users ditambahkan kolom `role`. Middleware `isAdmin` memblokir akses ke fungsi Tambah/Edit/Hapus bagi user biasa.
3. **Keamanan REST API**: Sebelumnya API bisa diakses publik (tanpa login). Sekarang, operasi Write (POST/PUT/DELETE) di endpoint `/api/gedung` dan `/api/aset` dilindungi oleh `apiAuthenticated` (mengembalikan respons `401 JSON`). GET tetap terbuka.
4. **Code Quality (Prettier)**: Seluruh file JS backend (controllers, models, routes, lib) sudah diformat otomatis mengikuti standar kebersihan kode (indentasi konsisten, trailing commas, spacing).
5. **UI Fixes**: Masalah escape string pada nama ruangan yang mengandung kutip/apostrof (saat konfirmasi hapus) sudah diselesaikan dengan refactoring ke `data-*` attributes, sekaligus membersihkan *error linting* palsu di IDE VS Code.
6. **Testing E2E (Playwright)**: Seluruh skenario testing E2E (23 test cases) telah sukses dilewati, mencakup Authentication, Role Access, CRUD Gedung, CRUD Ruangan & Aset, hingga Security REST API. Bug UI yang sempat memblokir testing (seperti custom dialog yang meng-*intercept* *pointer events*) telah diselesaikan dengan penyeragaman menggunakan *native* `window.confirm`.

### 🟡 Diketahui tapi Dibiarkan (By Design / Scope)
1. Tidak menggunakan validasi library eksternal (seperti `joi` atau `zod`); hanya mengandalkan pengecekan manual dan keamanan *parameterized query*.
2. Tidak menggunakan `req.session.regenerate()` setelah login (di luar *scope*).

---

## 6. Pertanyaan Aktif untuk Claude (Asisten Manajerial)

```text
1. Dengan perubahan arsitektur menjadi Room-Centric dan penambahan Role Read-Only, apakah ada skenario edge-case UI/UX yang mungkin saya lewatkan (misalnya, visibilitas tombol bagi user)?
2. Fungsi API Write sekarang membalas dengan 401 JSON jika tidak login. Apakah praktik ini sudah standar untuk internal REST API yang dikonsumsi oleh HTMX/Fetch JS client di sistem yang sama?
3. Dengan seluruh kode backend (.js) sudah di-format menggunakan Prettier, apa best-practice untuk merapikan kode .ejs tanpa merusak sintaks server-side templating-nya?
4. Setelah E2E Testing dengan Playwright sukses (23/23 passed), apakah ada saran untuk integrasi CI/CD (seperti GitHub Actions) atau tambahan level testing lain (seperti Unit Testing dengan Jest) yang perlu diprioritaskan?
```

---
*Dokumen ini adalah snapshot kondisi kode terkini per 22 Juni 2026.*
