# Code Review Request — Modul FTI Aset Ruangan

> Dokumen ini menjelaskan struktur dan kondisi kode proyek **terkini**,
> untuk keperluan sinkronisasi dan meminta review/saran kepada Claude (project manager AI).
> **Terakhir diperbarui: 12 Juni 2026**

---

## 1. Konteks Proyek

Proyek ini adalah **fork** dari sistem manajemen fakultas open-source
([husnilk/facultyware](https://github.com/husnilk/facultyware)).

Saya mengerjakan modul **"FTI Aset Ruangan"** dengan jobdesk:
- **Kelola Gedung**: CRUD + Search + Statistik + Export PDF/DOCX + REST API
- **Kelola Aset Ruangan**: CRUD + Search + Filter + Export PDF/DOCX + REST API

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
| Export PDF | `pdfkit` |
| Export Word | `docx` |
| Auth | Session-based (`bcryptjs`) |

---

## 2. Struktur Folder

```
facultyware/
├── app.js                        # Entry point, middleware, route registration
├── bin/www                       # HTTP server bootstrap
├── .env                          # DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, PORT, SESSION_SECRET
├── database/
│   ├── facultyware.sql           # Skema database lengkap + seed
│   └── fix_rooms_nullable.sql    # Migration: buat responsible_employee_id & employee_id nullable
├── lib/
│   └── db.js                     # mysql2 pool.promise() — koneksi database
├── middlewares/
│   ├── auth.js                   # isAuthenticated: cek req.session.userId
│   ├── acl.js                    # checkPermission: RBAC (belum dipakai di modul ini)
│   └── error.js                  # notFoundHandler + errorHandler
├── models/
│   ├── gedungModel.js            # Query raw SQL untuk tabel `buildings`
│   └── asetModel.js              # Query raw SQL untuk JOIN rooms+assets+buildings
├── controllers/
│   ├── gedungController.js       # Web CRUD + exportPdf + exportDocx + API CRUD
│   └── asetController.js         # Web CRUD + exportPdf + exportDocx + API CRUD
├── routes/
│   ├── gedungRoutes.js           # Web routes /gedung/*
│   ├── asetRoutes.js             # Web routes /aset/*
│   └── api/
│       ├── gedungApiRoutes.js    # REST API /api/gedung (GET/POST/PUT/DELETE)
│       └── asetApiRoutes.js      # REST API /api/aset (GET/POST/PUT/DELETE)
└── views/
    ├── home.ejs                  # Dashboard utama (shortcut modul + API reference)
    ├── partials/
    │   ├── _head.ejs             # Shared <head>: CSS, HTMX, dark mode scripts
    │   └── _sidebar.ejs          # Sidebar navigasi Basecoat
    ├── gedung/
    │   ├── index.ejs             # Daftar gedung: stats cards, search, tabel, dialog hapus
    │   ├── create.ejs            # Form tambah gedung (+ flash message)
    │   └── edit.ejs              # Form edit gedung (+ flash message)
    └── aset/
        ├── index.ejs             # Daftar ruangan: stats cards, filter, tabel, dialog hapus
        ├── create.ejs            # Form tambah ruangan (2 section: Data Ruangan + Data Aset, + flash)
        └── edit.ejs              # Form edit ruangan (+ flash message)
```

---

## 3. Skema Database yang Digunakan

### Relasi Tabel

```
buildings (1) ──────< rooms (N) >──── assets (1)
                                           └──< asset_grants (optional)
```

### Tabel `buildings`
```sql
id, name, code, description, created_at, updated_at
-- code: UNIQUE KEY
```

### Tabel `assets`
```sql
id, name, code,
type             ENUM('equipment', 'room'),
acquisition_type ENUM('procurement', 'grant'),
acquisition_date DATE,
acquisition_cost DECIMAL(14,2),
asset_grant_id   FK -> asset_grants.id  (nullable),
condition        ENUM('good', 'minor_damage', 'major_damage'),
status           ENUM('available', 'in_use', 'maintenance', 'retired'),
created_at, updated_at
-- code: UNIQUE KEY
```

### Tabel `rooms`
```sql
id,
asset_id               FK -> assets.id       (NOT NULL),
building_id            FK -> buildings.id    (NOT NULL),
name, code, floor,
capacity               INT,
is_public              TINYINT(1),
responsible_employee_id FK -> employees.id  (NULL — setelah fix_rooms_nullable.sql),
employee_id            FK -> employees.id   (NULL — setelah fix_rooms_nullable.sql),
created_at, updated_at
```

> **Catatan penting:** `responsible_employee_id` dan `employee_id` awalnya `NOT NULL`.
> Saat INSERT, nilai `1` di-hardcode tapi tabel `employees` kosong → FK violation.
> **Solusi yang diterapkan:** `SET FOREIGN_KEY_CHECKS=0` sebelum INSERT/UPDATE di dalam transaksi,
> lalu `SET FOREIGN_KEY_CHECKS=1` sebelum COMMIT. Nilai dikirim sebagai `NULL`.
> File `database/fix_rooms_nullable.sql` tersedia untuk migrasi struktural jika diperlukan.

### Tabel `users` (untuk autentikasi)
```sql
id, name, email, password (bcrypt), created_at, updated_at
-- Sudah ada seed: admin@example.com
```

---

## 4. Pola Kode yang Digunakan

### a. Database (lib/db.js)
```javascript
// mysql2 pool dengan promise API
const pool = mysql.createPool({ host, user, password, database, ... });
module.exports = pool.promise();

// Query biasa:
const [rows] = await db.query('SELECT * FROM buildings WHERE id = ?', [id]);

// Transaksi multi-tabel (pola FINAL yang diterapkan):
const conn = await db.getConnection();
try {
  await conn.beginTransaction();
  await conn.query('SET FOREIGN_KEY_CHECKS=0');  // bypass FK untuk employee columns
  // ... semua query INSERT/UPDATE di sini ...
  await conn.query('SET FOREIGN_KEY_CHECKS=1');
  await conn.commit();
} catch (err) {
  try { await conn.query('SET FOREIGN_KEY_CHECKS=1'); } catch(e) {}
  await conn.rollback();
  throw err;
} finally {
  conn.release();  // SELALU dilepas, apapun yang terjadi
}
```

### b. Model
```javascript
// Semua fungsi async, return data langsung
const getAll    = async (q = '') => { ... };
const getById   = async (id) => { ... };
const getStats  = async () => { ... };
const create    = async (data) => { ... };  // transaksi 2 tabel
const update    = async (id, data) => { ... };  // transaksi 2 tabel
const destroy   = async (id) => { ... };  // transaksi 2 tabel
const hasRooms  = async (id) => { ... };  // validasi sebelum hapus gedung

module.exports = { getAll, getById, getStats, create, update, destroy, hasRooms };
```

### c. Controller (pola umum)
```javascript
// Web controller: flash message diambil dari session, diteruskan ke view
const create = (req, res) => {
  const flash = req.session.flash || null;
  delete req.session.flash;
  res.render('gedung/create', { title, flash, user: req.session.username, errors: null, old: {} });
};

// Penanganan ER_DUP_ENTRY (duplikat kode):
const store = async (req, res, next) => {
  try {
    await Model.create(data);
    req.session.flash = { type: 'success', message: '...' };
    res.redirect('/gedung');
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      req.session.flash = { type: 'error', message: 'Kode sudah digunakan.' };
      return res.redirect('/gedung/create');
    }
    next(err);
  }
};

// API controller: return JSON + HTTP 409 untuk duplikat
const apiCreate = async (req, res, next) => {
  try {
    const id = await Model.create(data);
    res.status(201).json({ success: true, message: '...', data: await Model.getById(id) });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Kode sudah digunakan.' });
    }
    next(err);
  }
};
```

### d. Routes
```javascript
// Web routes — semua diproteksi isAuthenticated
router.get('/',              isAuthenticated, controller.index);
router.get('/create',        isAuthenticated, controller.create);
router.post('/store',        isAuthenticated, controller.store);
router.get('/export/pdf',    isAuthenticated, controller.exportPdf);   // HARUS sebelum /:id
router.get('/export/docx',   isAuthenticated, controller.exportDocx);  // HARUS sebelum /:id
router.get('/:id/edit',      isAuthenticated, controller.edit);
router.post('/:id/update',   isAuthenticated, controller.update);
router.post('/:id/delete',   isAuthenticated, controller.destroy);

// API routes — tanpa auth (by design / sesuai requirements tugas)
router.get('/',    controller.apiIndex);
router.get('/:id', controller.apiShow);
router.post('/',   controller.apiCreate);
router.put('/:id', controller.apiUpdate);
router.delete('/:id', controller.apiDelete);
```

### e. Flash Message di Views (EJS + Basecoat)
```ejs
<%# Flash message — muncul setelah redirect (contoh: ER_DUP_ENTRY) %>
<% if (flash) { %>
<div class="alert <%= flash.type === 'success' ? 'alert-success' : 'alert-destructive' %> mb-4">
  <svg ...></svg>
  <div><p class="text-sm"><%= flash.message %></p></div>
</div>
<% } %>

<%# Validation errors — muncul saat re-render form tanpa redirect %>
<% if (errors && errors.length > 0) { %>
<div class="alert alert-destructive mb-6">
  <ul><% errors.forEach(e => { %><li><%= e %></li><% }) %></ul>
</div>
<% } %>
```

---

## 5. Daftar Endpoint

### Web (memerlukan login)
| Method | URL | Fungsi |
|---|---|---|
| GET | `/gedung` | Daftar gedung + search `?q=` |
| GET | `/gedung/create` | Form tambah gedung |
| POST | `/gedung/store` | Simpan gedung baru |
| GET | `/gedung/:id/edit` | Form edit gedung |
| POST | `/gedung/:id/update` | Update gedung |
| POST | `/gedung/:id/delete` | Hapus gedung |
| GET | `/gedung/export/pdf` | Export PDF (support `?q=`) |
| GET | `/gedung/export/docx` | Export DOCX (support `?q=`) |
| GET | `/aset` | Daftar ruangan + `?q=` + `?building_id=` |
| GET | `/aset/create` | Form tambah ruangan |
| POST | `/aset/store` | Simpan ruangan baru |
| GET | `/aset/:id/edit` | Form edit ruangan |
| POST | `/aset/:id/update` | Update ruangan |
| POST | `/aset/:id/delete` | Hapus ruangan |
| GET | `/aset/export/pdf` | Export PDF (support `?q=` + `?building_id=`) |
| GET | `/aset/export/docx` | Export DOCX (support `?q=` + `?building_id=`) |

### REST API (tanpa auth)
| Method | URL | Fungsi |
|---|---|---|
| GET | `/api/gedung` | List gedung (JSON) |
| GET | `/api/gedung/:id` | Detail gedung |
| POST | `/api/gedung` | Buat gedung |
| PUT | `/api/gedung/:id` | Update gedung |
| DELETE | `/api/gedung/:id` | Hapus gedung |
| GET | `/api/aset` | List aset ruangan (JSON, support `?q=` + `?building_id=`) |
| GET | `/api/aset/:id` | Detail aset ruangan |
| POST | `/api/aset` | Buat aset ruangan (INSERT ke 2 tabel: assets + rooms) |
| PUT | `/api/aset/:id` | Update aset ruangan (UPDATE 2 tabel) |
| DELETE | `/api/aset/:id` | Hapus aset ruangan (DELETE rooms lalu assets) |

### API Response Format
```json
{ "success": true, "data": [...], "total": 5 }
{ "success": true, "message": "...", "data": { ... } }
{ "success": true, "message": "Berhasil dihapus." }
{ "success": false, "message": "Tidak ditemukan." }
{ "success": false, "message": "Field wajib kurang: ..." }
{ "success": false, "message": "Kode sudah digunakan." }
```

---

## 6. Status Bug & Perbaikan

### ✅ Sudah Diperbaiki (CLOSED)

| # | Masalah | Solusi yang Diterapkan |
|---|---|---|
| 1 | **FK Violation**: `responsible_employee_id` & `employee_id` hardcode `1` tapi tabel `employees` kosong | Nilai diubah ke `NULL`. Transaksi menggunakan `SET FOREIGN_KEY_CHECKS=0/1`. File SQL migration tersedia di `database/fix_rooms_nullable.sql`. |
| 2 | **ER_DUP_ENTRY tidak tertangkap**: Error MySQL mentah tampil ke user saat kode duplikat | Semua fungsi `store` dan `update` (Web + API) di kedua controller kini menangkap `err.code === 'ER_DUP_ENTRY'` dan mengembalikan pesan ramah via flash/HTTP 409. |
| 3 | **Connection Leak**: `conn.release()` di dalam `try`/`catch`, bukan `finally` | Semua transaksi di `asetModel.js` kini menggunakan `finally { conn.release(); }`. |
| 4 | **EJS Parser Crash**: `<%- include %>` bersarang di dalam `<%# comment %>` | Semua komentar EJS yang bermasalah di `_head.ejs` dan `_sidebar.ejs` sudah diganti menjadi komentar HTML biasa. |
| 5 | **Logout tidak berfungsi**: Navigasi/routing sidebar rusak | Header dan sidebar distandarisasi di semua view; tombol Logout muncul konsisten di setiap halaman. |
| 6 | **Flash message tidak muncul di form**: View `create.ejs` dan `edit.ejs` tidak menerima variabel `flash` | Controller `create` (GET) dan `edit` (GET) kini mengambil dan meneruskan `flash` dari session. Blok alert flash ditambahkan di keempat view form. |

### 🟡 Diketahui tapi Dibiarkan (by design)

| # | Hal | Alasan |
|---|---|---|
| 7 | **API tanpa autentikasi** | Sesuai requirements tugas. Endpoint `POST/PUT/DELETE /api/*` bisa diakses siapa saja. |
| 8 | **Tidak ada `req.session.regenerate()` setelah login** | Di luar scope tugas. Potensi session fixation attack di production. |
| 9 | **Tidak ada library validasi input** (joi/express-validator) | Hanya mengandalkan parameterized query mysql2 untuk SQL injection prevention. Cukup untuk scope tugas. |
| 10 | **Basecoat pre-compiled CSS** | File `styles.css` statis, banyak kelas Tailwind responsif tidak tersedia. Disiasati dengan `flex flex-wrap` dan komponen Basecoat murni. |

### 🟢 Fitur yang Sudah Berjalan

- [x] CRUD lengkap — Gedung dan Aset Ruangan
- [x] Transaksi database multi-tabel dengan pola `try/catch/finally`
- [x] `SET FOREIGN_KEY_CHECKS=0/1` untuk bypass FK employees
- [x] Penanganan `ER_DUP_ENTRY` di Web (flash) dan API (HTTP 409)
- [x] Flash message di semua halaman form (create & edit)
- [x] Search server-side (`LIKE`) dan Filter per Gedung
- [x] Statistik real-time (total, per kondisi, per status)
- [x] Export PDF (`pdfkit`) — support filter aktif
- [x] Export DOCX (`docx` library) — support filter aktif
- [x] REST API GET/POST/PUT/DELETE untuk kedua modul
- [x] Pengecekan relasi sebelum hapus (gedung tidak bisa dihapus jika punya ruangan)
- [x] UI Basecoat: sidebar, dashboard, stats cards minimalis, tabel, dialog konfirmasi, badge kondisi/status
- [x] Dark mode + Light mode toggle
- [x] Session-based authentication (login/logout)

---

## 7. Pertanyaan Aktif untuk Direview

```
1. Apakah penggunaan SET FOREIGN_KEY_CHECKS=0 di dalam transaksi
   merupakan praktik yang aman untuk production?
   Adakah risiko data integrity yang perlu diwaspadai?

2. Apakah ada security concern serius dengan implementasi session/auth
   saat ini (tanpa session.regenerate()) yang harus diperbaiki
   meski ini hanya aplikasi tugas?

3. Apakah ada anti-pattern lain dalam kode ini yang perlu direfactor
   sebelum dianggap "selesai" untuk keperluan tugas/skripsi?
```

---

## 8. Cara Menjalankan Proyek

```bash
# 1. Clone & install
git clone <repo-url>
cd facultyware
npm install

# 2. Setup database
# Import file: database/facultyware.sql ke MySQL
# (Opsional) Jalankan: database/fix_rooms_nullable.sql
# Pastikan database bernama: facultyware

# 3. Setup environment
cp .env.example .env
# Isi: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, SESSION_SECRET

# 4. Jalankan
npm run dev   # Development (nodemon, auto-restart)
npm start     # Production

# Server berjalan di: http://localhost:3000
# Login default: admin@example.com (password ada di seed SQL)
```

---

*Dokumen ini adalah snapshot kondisi kode terkini per 12 Juni 2026.
Semua bug yang tercantum di bagian 6 (CLOSED) telah diperbaiki dan diverifikasi.*
