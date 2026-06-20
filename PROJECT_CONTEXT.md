# PROJECT CONTEXT — FTI Aset Ruangan
> File ini adalah dokumen konteks lengkap untuk AI Agent (Antigravity/Claude Sonnet 4.6).
> Baca seluruh dokumen ini sebelum melakukan perubahan apapun pada project.
> Terakhir diperbarui: Juni 2026

---

## 1. IDENTITAS PROYEK

| Atribut | Detail |
|---|---|
| Nama Project | FTI Aset Ruangan |
| Mahasiswa | Alfi Zikri (NIM: 2411521002) |
| Mata Kuliah | Tugas Besar Pemrograman Web |
| Fork dari | https://github.com/husnilk/facultyware |
| Modul yang dikerjakan | Kelola Gedung + Kelola Aset Ruangan |

---

## 2. TECH STACK

| Komponen | Detail |
|---|---|
| Runtime | Node.js |
| Framework | Express.js v4 |
| Template Engine | EJS v2.6 |
| Database | MySQL 8 via `mysql2` (TANPA ORM) |
| Session | `express-session` + `express-mysql-session` |
| UI | Basecoat (Tailwind CSS component library) |
| Interaktivitas | HTMX v2.0.4 |
| Export PDF | `pdfkit` |
| Export Word | `docx` |
| Upload File | `multer` |
| Auth | Session-based (`bcryptjs`) |
| Testing | `@playwright/test` (minggu 14) |

### ATURAN CODING YANG WAJIB DIIKUTI:
- **DILARANG** menggunakan ORM (Sequelize, Prisma, dll)
- **WAJIB** menggunakan raw SQL via `mysql2`
- **WAJIB** menggunakan parameterized query (`?`) untuk semua query
- **WAJIB** menggunakan `async/await` bukan callback
- **WAJIB** menggunakan `try/catch/finally` untuk transaksi database
- Semua query ada di **model**, logika ada di **controller**, tampilan di **views**

---

## 3. STRUKTUR FOLDER PROJECT

```
facultyware/
├── app.js                          # Entry point, middleware, route registration
├── bin/www                         # HTTP server bootstrap
├── .env                            # DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, PORT, SESSION_SECRET
├── database/
│   ├── facultyware.sql             # Skema database lengkap + seed
│   ├── fix_rooms_nullable.sql      # Migration: nullable responsible_employee_id
│   └── add_photo_to_rooms.sql      # Migration: tambah kolom photo ke rooms
├── lib/
│   └── db.js                       # mysql2 pool.promise()
├── middlewares/
│   ├── auth.js                     # isAuthenticated: cek req.session.userId
│   ├── acl.js                      # checkPermission: RBAC
│   └── error.js                    # notFoundHandler + errorHandler
├── models/
│   ├── gedungModel.js              # Query SQL tabel buildings
│   └── asetModel.js                # Query SQL JOIN rooms+assets+buildings
├── controllers/
│   ├── gedungController.js         # CRUD + Export + API gedung
│   └── asetController.js           # CRUD + Export + Upload + API aset
├── routes/
│   ├── gedungRoutes.js             # Web routes /gedung/*
│   ├── asetRoutes.js               # Web routes /aset/* + multer setup
│   └── api/
│       ├── gedungApiRoutes.js      # REST API /api/gedung
│       └── asetApiRoutes.js        # REST API /api/aset
├── public/
│   ├── uploads/
│   │   └── aset/                   # Folder foto aset yang diupload
│   └── (CSS, JS statis lainnya)
├── tests/                          # Playwright test suite (minggu 14)
│   └── aset-ruangan.spec.js        # File test utama
└── views/
    ├── home.ejs                    # Dashboard: shortcut modul + API reference
    ├── partials/
    │   ├── _head.ejs               # <head>: CSS, HTMX, dark mode
    │   └── _sidebar.ejs            # Sidebar navigasi Basecoat
    ├── gedung/
    │   ├── index.ejs               # Daftar gedung: stats, search, tabel, dialog hapus
    │   ├── create.ejs              # Form tambah gedung
    │   └── edit.ejs                # Form edit gedung
    └── aset/
        ├── index.ejs               # Daftar aset: stats, filter, tabel, foto, dialog hapus
        ├── create.ejs              # Form tambah aset + upload foto
        └── edit.ejs                # Form edit aset + preview foto lama
```

---

## 4. DATABASE SCHEMA

### Relasi Tabel yang Dipakai
```
buildings (1) ──────< rooms (N) >──── assets (1)
                                           └──< asset_grants (optional)
```

### Tabel `buildings` (untuk Kelola Gedung)
```sql
id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
name        VARCHAR(255) NOT NULL
code        VARCHAR(255) NOT NULL UNIQUE
description TEXT NULL
created_at  TIMESTAMP
updated_at  TIMESTAMP
```

### Tabel `assets` (induk aset)
```sql
id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
name             VARCHAR(255) NOT NULL
code             VARCHAR(255) NOT NULL UNIQUE
type             ENUM('equipment', 'room') -- selalu 'room' untuk modul ini
acquisition_type ENUM('procurement', 'grant')
acquisition_date DATE
acquisition_cost DECIMAL(14,2) NULL
asset_grant_id   BIGINT NULL (FK ke asset_grants, nullable)
condition        ENUM('good', 'minor_damage', 'major_damage')
status           ENUM('available', 'in_use', 'maintenance', 'retired')
created_at       TIMESTAMP
updated_at       TIMESTAMP
```

### Tabel `rooms` (untuk Kelola Aset Ruangan)
```sql
id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
asset_id                BIGINT UNSIGNED NOT NULL (FK ke assets.id)
building_id             BIGINT UNSIGNED NOT NULL (FK ke buildings.id)
name                    VARCHAR(255) NOT NULL
code                    VARCHAR(255) NOT NULL UNIQUE
floor                   VARCHAR(255) NULL
capacity                INT NOT NULL
is_public               TINYINT(1) DEFAULT 0
photo                   VARCHAR(255) NULL  -- nama file foto yang diupload
responsible_employee_id BIGINT NULL        -- nullable setelah migration
employee_id             BIGINT NULL        -- nullable setelah migration
created_at              TIMESTAMP
updated_at              TIMESTAMP
```

### CATATAN PENTING DATABASE:
- `responsible_employee_id` dan `employee_id` dikirim sebagai `NULL`
- Di dalam transaksi, selalu gunakan `SET FOREIGN_KEY_CHECKS=0` sebelum INSERT/UPDATE ke `rooms`, dan `SET FOREIGN_KEY_CHECKS=1` sebelum COMMIT
- Untuk error duplikat kode, tangkap `err.code === 'ER_DUP_ENTRY'`

### Login Default:
```
Email    : admin@example.com
Password : (lihat di seed facultyware.sql)
```

---

## 5. POLA KODE YANG WAJIB DIIKUTI

### a. Koneksi Database (lib/db.js)
```javascript
// Gunakan pola ini untuk query biasa:
const [rows] = await db.query('SELECT * FROM buildings WHERE id = ?', [id]);

// Gunakan pola ini untuk transaksi multi-tabel:
const conn = await db.getConnection();
try {
  await conn.beginTransaction();
  await conn.query('SET FOREIGN_KEY_CHECKS=0');
  // ... queries INSERT/UPDATE ...
  await conn.query('SET FOREIGN_KEY_CHECKS=1');
  await conn.commit();
} catch (err) {
  try { await conn.query('SET FOREIGN_KEY_CHECKS=1'); } catch(e) {}
  await conn.rollback();
  throw err;
} finally {
  conn.release(); // WAJIB di finally
}
```

### b. Model Pattern
```javascript
const db = require('../lib/db');

const getAll    = async (q = '') => { /* SELECT dengan LIKE jika q ada */ };
const getById   = async (id) => { /* SELECT 1 baris */ };
const getStats  = async () => { /* COUNT, GROUP BY */ };
const create    = async (data) => { /* INSERT, return insertId */ };
const update    = async (id, data) => { /* UPDATE */ };
const destroy   = async (id) => { /* DELETE */ };
const hasRooms  = async (id) => { /* cek relasi sebelum hapus gedung */ };

module.exports = { getAll, getById, getStats, create, update, destroy, hasRooms };
```

### c. Controller Pattern
```javascript
// WEB controller — render EJS
const index = async (req, res, next) => {
  try {
    const flash = req.session.flash || null;
    delete req.session.flash;
    const data = await Model.getAll(req.query.q);
    res.render('folder/view', { title: '...', data, flash, user: req.session.username });
  } catch (err) { next(err); }
};

// WEB store — dengan penanganan duplikat
const store = async (req, res, next) => {
  try {
    await Model.create(data);
    req.session.flash = { type: 'success', message: 'Berhasil disimpan.' };
    res.redirect('/gedung');
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      req.session.flash = { type: 'error', message: 'Kode sudah digunakan.' };
      return res.redirect('/gedung/create');
    }
    next(err);
  }
};

// API controller — return JSON
const apiIndex = async (req, res, next) => {
  try {
    const data = await Model.getAll(req.query.q);
    res.json({ success: true, data, total: data.length });
  } catch (err) { next(err); }
};

// API error responses:
// 400 → validasi gagal
// 404 → tidak ditemukan
// 409 → duplikat (ER_DUP_ENTRY)
// 500 → server error
```

### d. Route Pattern
```javascript
const { isAuthenticated } = require('../middlewares/auth');

// Web routes — semua dilindungi isAuthenticated
router.get('/',             isAuthenticated, controller.index);
router.get('/create',       isAuthenticated, controller.create);
router.post('/store',       isAuthenticated, controller.store);
router.get('/export/pdf',   isAuthenticated, controller.exportPdf);  // HARUS sebelum /:id
router.get('/export/docx',  isAuthenticated, controller.exportDocx); // HARUS sebelum /:id
router.get('/:id/edit',     isAuthenticated, controller.edit);
router.post('/:id/update',  isAuthenticated, controller.update);
router.post('/:id/delete',  isAuthenticated, controller.destroy);

// API routes — tanpa auth (by design, sesuai requirements tugas)
router.get('/',     controller.apiIndex);
router.get('/:id',  controller.apiShow);
router.post('/',    controller.apiCreate);
router.put('/:id',  controller.apiUpdate);
router.delete('/:id', controller.apiDelete);
```

### e. Flash Message di EJS (sudah ada di semua form)
```ejs
<% if (flash) { %>
<div class="alert <%= flash.type === 'success' ? 'alert-success' : 'alert-destructive' %> mb-4">
  <p class="text-sm"><%= flash.message %></p>
</div>
<% } %>
```

---

## 6. DAFTAR ENDPOINT LENGKAP

### Web (wajib login)
| Method | URL | Fungsi |
|---|---|---|
| GET | `/gedung` | Daftar gedung + search `?q=` |
| GET | `/gedung/create` | Form tambah |
| POST | `/gedung/store` | Simpan baru |
| GET | `/gedung/:id/edit` | Form edit |
| POST | `/gedung/:id/update` | Update |
| POST | `/gedung/:id/delete` | Hapus |
| GET | `/gedung/export/pdf` | Export PDF |
| GET | `/gedung/export/docx` | Export DOCX |
| GET | `/aset` | Daftar aset + `?q=` + `?building_id=` |
| GET | `/aset/create` | Form tambah |
| POST | `/aset/store` | Simpan baru + upload foto |
| GET | `/aset/:id/edit` | Form edit |
| POST | `/aset/:id/update` | Update + ganti foto |
| POST | `/aset/:id/delete` | Hapus + hapus foto |
| GET | `/aset/export/pdf` | Export PDF |
| GET | `/aset/export/docx` | Export DOCX |

### REST API (tanpa auth)
| Method | URL | Fungsi |
|---|---|---|
| GET | `/api/gedung` | List JSON |
| GET | `/api/gedung/:id` | Detail JSON |
| POST | `/api/gedung` | Buat baru |
| PUT | `/api/gedung/:id` | Update |
| DELETE | `/api/gedung/:id` | Hapus |
| GET | `/api/aset` | List JSON + `?q=` + `?building_id=` |
| GET | `/api/aset/:id` | Detail JSON |
| POST | `/api/aset` | Buat baru |
| PUT | `/api/aset/:id` | Update |
| DELETE | `/api/aset/:id` | Hapus |

### API Response Format
```json
{ "success": true, "data": [...], "total": 5 }
{ "success": true, "message": "...", "data": { ... } }
{ "success": true, "message": "Berhasil dihapus." }
{ "success": false, "message": "Tidak ditemukan." }
{ "success": false, "message": "Kode sudah digunakan." }
```

---

## 7. STATUS FITUR (PER MINGGU)

### ✅ SELESAI — Minggu 9-13

| # | Fitur | Status |
|---|---|---|
| 1 | Tambah gedung | ✅ Selesai |
| 2 | Lihat daftar gedung | ✅ Selesai |
| 3 | Ubah gedung | ✅ Selesai |
| 4 | Hapus gedung | ✅ Selesai |
| 5 | REST API JSON Gedung (GET/POST/PUT/DELETE) | ✅ Selesai |
| 6 | Tambah aset ruangan | ✅ Selesai |
| 7 | Lihat daftar aset ruangan | ✅ Selesai |
| 8 | Ubah aset ruangan | ✅ Selesai |
| 9 | Hapus aset ruangan | ✅ Selesai |
| 10 | REST API JSON Aset (GET/POST/PUT/DELETE) | ✅ Selesai |
| 11 | Statistik SIE (summary per kondisi & status) | ✅ Selesai |
| 12 | Search gedung & aset ruangan | ✅ Selesai |
| 13 | Export PDF dan DOCX | ✅ Selesai |
| + | Upload foto aset ruangan (multer) | ✅ Selesai |
| + | Flash message validasi | ✅ Selesai |
| + | Penanganan ER_DUP_ENTRY | ✅ Selesai |
| + | Transaksi DB dengan finally | ✅ Selesai |
| + | SET FOREIGN_KEY_CHECKS bypass | ✅ Selesai |

---

## 8. ROADMAP MINGGU SELANJUTNYA

---

### 📋 MINGGU 14 — Playwright Testing

**Deliverable:**
- File test suite Playwright
- Laporan Progress Project

**Yang harus dibuat:**

#### Instalasi
```bash
npm install --save-dev @playwright/test
npx playwright install chromium
```

#### File: `tests/aset-ruangan.spec.js`
Test yang harus dibuat (13 skenario):

```
1.  Login berhasil dengan kredensial yang benar
2.  Login gagal dengan password salah → muncul pesan error
3.  Redirect ke /login jika akses /gedung tanpa login
4.  Tambah gedung baru → muncul di daftar
5.  Edit gedung → perubahan tersimpan
6.  Hapus gedung → hilang dari daftar
7.  Search gedung → hasil terfilter
8.  Tambah aset ruangan baru → muncul di daftar
9.  Edit aset ruangan → perubahan tersimpan
10. Hapus aset ruangan → hilang dari daftar
11. Export PDF gedung → response 200 + content-type pdf
12. Export DOCX aset → response 200 + content-type docx
13. GET /api/gedung → response JSON dengan success: true
```

#### Pola test Playwright yang digunakan:
```javascript
const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';
const LOGIN_EMAIL = 'admin@example.com';
const LOGIN_PASSWORD = 'isi_dari_seed_sql';

// Helper login
async function login(page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[name="email"]', LOGIN_EMAIL);
  await page.fill('input[name="password"]', LOGIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE_URL}/home`);
}

test.describe('Modul FTI Aset Ruangan', () => {
  // tulis semua test di sini
});
```

#### File: `playwright.config.js`
```javascript
const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
  },
});
```

#### Cara jalankan test:
```bash
# Pastikan server sedang berjalan di terminal lain: npm run dev
npx playwright test
npx playwright test --reporter=html  # generate laporan HTML
```

---

### 🚀 MINGGU 15 — Deployment

**Deliverable:**
- Laporan Deployment
- Alamat web (URL yang bisa diakses online)

**Opsi deployment yang direkomendasikan:**

#### Opsi A — Railway (Paling Mudah, Gratis)
1. Buka railway.app → login dengan GitHub
2. New Project → Deploy from GitHub repo → pilih repo facultyware
3. Tambahkan MySQL plugin di Railway
4. Set environment variables (DB_HOST, DB_USER, dll) dari Railway dashboard
5. Railway auto-detect Node.js dan deploy otomatis

#### Opsi B — Render.com (Gratis)
1. Buka render.com → login GitHub
2. New Web Service → connect repo
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Tambahkan environment variables

#### Yang perlu disiapkan sebelum deploy:
```bash
# 1. Pastikan package.json punya script start
"scripts": {
  "start": "node ./bin/www",
  "dev": "nodemon ./bin/www"
}

# 2. Pastikan PORT bisa dibaca dari env
# Di bin/www: const port = process.env.PORT || 3000;

# 3. Buat file .env.example (tanpa nilai sensitif)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=facultyware
PORT=3000
SESSION_SECRET=your-secret-key
```

---

### 🎓 MINGGU 16 — UAS

**Deliverable:**
- Video Demo (maks 10 menit)
- Presentasi Project
- Pull Request ke Main Repo

**Isi Video Demo (10 menit):**
```
1. [1 menit]  Penjelasan singkat aplikasi dan arsitektur
2. [2 menit]  Demo login dan dashboard
3. [2 menit]  Demo CRUD Gedung + search + export
4. [2 menit]  Demo CRUD Aset Ruangan + upload foto + export
5. [1 menit]  Demo REST API (pakai browser atau Thunder Client)
6. [2 menit]  Penjelasan kode: model, controller, routes
```

**Cara buat Pull Request ke repo dosen:**
1. Buka github.com → repo fork kamu
2. Klik tab "Pull requests" → "New pull request"
3. Base: `husnilk/facultyware` ← Compare: `USERNAME/facultyware`
4. Judul PR: `[Tugas Besar] FTI Aset Ruangan - Alfi Zikri (2411521002)`
5. Deskripsi: list semua fitur yang sudah dikerjakan

---

## 9. CARA MENJALANKAN PROJECT

```bash
# 1. Clone & install
git clone <repo-url>
cd facultyware
npm install

# 2. Setup database di phpMyAdmin
# Import: database/facultyware.sql
# Jalankan: database/fix_rooms_nullable.sql
# Jalankan: database/add_photo_to_rooms.sql

# 3. Setup environment
cp .env.example .env
# Edit .env: isi DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, SESSION_SECRET

# 4. Jalankan
npm run dev    # Development (auto-restart)
npm start      # Production

# Akses di: http://localhost:3000
# Login: admin@example.com
```

---

## 10. PANDUAN UNTUK AI AGENT

> Baca bagian ini sebelum melakukan perubahan apapun.

### Ketika diminta membuat fitur baru:
1. Cek apakah sudah ada di daftar fitur (bagian 7)
2. Ikuti pola kode yang ada di bagian 5
3. Jangan ubah file yang tidak relevan
4. Selalu gunakan `async/await` dan `try/catch`
5. Selalu gunakan parameterized query, bukan string concatenation

### Ketika diminta fix bug:
1. Identifikasi file yang terlibat
2. Baca kode yang ada dulu sebelum mengubah
3. Jangan ganti pola kode yang sudah berjalan
4. Konfirmasi perubahan yang dibuat setelah selesai

### Ketika diminta buat Playwright test (minggu 14):
1. Buat file di folder `tests/`
2. Ikuti pola dari bagian 8 (Minggu 14)
3. Test harus bisa dijalankan dengan `npx playwright test`
4. Minimal cover 13 skenario yang sudah didefinisikan

### Ketika diminta persiapan deployment (minggu 15):
1. Jangan hardcode credentials di kode
2. Semua config harus baca dari `process.env`
3. Pastikan `npm start` bisa dijalankan tanpa nodemon
4. Buat `.env.example` tanpa nilai sensitif

### Yang TIDAK boleh dilakukan:
- Menginstall ORM (Sequelize, Prisma, TypeORM, dll)
- Mengubah struktur folder utama tanpa konfirmasi
- Menghapus file yang sudah ada tanpa konfirmasi
- Mengubah pola transaksi database yang sudah benar
- Menambahkan dependency besar tanpa konfirmasi

---

## 11. CATATAN BUG & SOLUSI YANG SUDAH DITERAPKAN

| Bug | Solusi |
|---|---|
| FK violation `responsible_employee_id` | Gunakan `SET FOREIGN_KEY_CHECKS=0/1` di transaksi, kirim NULL |
| ER_DUP_ENTRY tidak tertangkap | Tangkap `err.code === 'ER_DUP_ENTRY'` di semua store/update |
| Connection leak transaksi | Pindah `conn.release()` ke blok `finally` |
| EJS parser crash | Ganti komentar EJS `<%# %>` dengan komentar HTML biasa |
| Logout tidak berfungsi | Standarisasi header dan sidebar di semua view |
| Flash message tidak muncul | Controller GET create/edit sekarang teruskan `flash` dari session |

---

*Dokumen ini adalah sumber kebenaran tunggal (single source of truth) untuk project ini.
Selalu rujuk dokumen ini sebelum membuat keputusan implementasi.*
