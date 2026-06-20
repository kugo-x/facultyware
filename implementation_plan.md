# Implementasi Modul FTI Aset Ruangan

## Deskripsi

Implementasi penuh modul **Kelola Gedung** dan **Kelola Aset Ruangan** pada sistem manajemen fakultas _facultyware_.
Pendekatan yang dipilih adalah **Opsi B** — mengelola tabel `rooms` yang merupakan join antara `assets` + `buildings`, sesuai skema database asli.

Semua tampilan menggunakan komponen **Basecoat** (Tailwind CSS), tanpa ORM (raw SQL via `mysql2`), dengan server-side rendering EJS.

---

## Arsitektur Data (Relasi Tabel)

```
buildings (1) ──< rooms (N) >── assets (1)
                                    └─< asset_grants (1)  [opsional]
```

- **Gedung** → tabel `buildings` (`id, name, code, description`)
- **Aset Ruangan** → tabel `rooms` JOIN `assets` JOIN `buildings`
  - `rooms`: `asset_id, building_id, name, code, floor, capacity, is_public`
  - `assets`: `type='room'`, `acquisition_type, acquisition_date, acquisition_cost, condition, status`

---

## Open Questions

> [!IMPORTANT]
> **Q1 — Kolom `responsible_employee_id` & `employee_id` di tabel `rooms`**: Kedua kolom ini NOT NULL di skema asli, namun tidak ada tabel `employees` yang terisi di scope proyek kamu. **Solusi yang diusulkan: buat kolom nullable di INSERT/UPDATE, atau isi dengan nilai default (misal `1`).**

> [!IMPORTANT]
> **Q2 — Fitur Search**: Apakah search cukup client-side (filter tabel di browser) atau harus server-side dengan query `LIKE`? **Diusulkan: server-side dengan query param `?q=...`.**

> [!NOTE]
> **Q3 — Export Format**: `package.json` sudah punya `pdfkit` (PDF) dan `docx` (Word). Apakah kedua format diperlukan, atau cukup salah satu?

> [!NOTE]
> **Q4 — API JSON**: Endpoint API akan mengembalikan JSON murni (tanpa auth token, hanya session). Ini sudah cukup atau butuh API key?

---

## Proposed Changes

### Layout Bersama (Shared EJS Partial)

Karena semua halaman modul ini perlu header Basecoat yang sama, akan dibuat **1 partial layout** yang di-include oleh setiap view.

#### [NEW] `views/partials/_layout_head.ejs`
Template `<head>` dengan Basecoat CSS, HTMX, dan dark mode init script (diambil dari `home.ejs`).

#### [NEW] `views/partials/_sidebar.ejs`
Sidebar navigasi dengan link ke Gedung dan Aset Ruangan, menggunakan komponen `sidebar` Basecoat.

---

### Modul 1 — Kelola Gedung (`/gedung`)

#### [MODIFY] `models/gedungModel.js`
Tambah fungsi:
- `search(q)` → `SELECT ... WHERE name LIKE ? OR code LIKE ?`
- `getStats()` → jumlah gedung, total ruangan per gedung
- `getPaginated(page, limit, q)` → dengan offset/limit + search
- `getCount(q)` → total record untuk paginasi

#### [MODIFY] `controllers/gedungController.js`
Isi semua TODO:
- `index` → ambil semua gedung + support `?q=` search + flash message
- `create` → render form tambah
- `store` → validasi + insert + redirect dengan pesan sukses
- `edit` → load data gedung by ID
- `update` → validasi + update + redirect
- `destroy` → cek apakah gedung masih punya ruangan sebelum hapus
- `getStats` (NEW) → data statistik untuk card dashboard
- `exportPdf` (NEW) → generate PDF via pdfkit
- `exportDocx` (NEW) → generate DOCX via docx
- `apiIndex` (NEW) → return JSON list gedung

#### [MODIFY] `routes/gedungRoutes.js`
Tambah route:
```
GET  /gedung              → index (+ ?q= search)
GET  /gedung/create       → form tambah
POST /gedung/store        → simpan
GET  /gedung/:id/edit     → form edit
POST /gedung/:id/update   → update
POST /gedung/:id/delete   → hapus
GET  /gedung/export/pdf   → export PDF
GET  /gedung/export/docx  → export DOCX
GET  /api/gedung          → API JSON
```

#### [MODIFY] `views/gedung/index.ejs`
Redesign total dengan Basecoat:
- Card statistik (total gedung, total ruangan)
- Search bar dengan HTMX partial refresh
- Tabel data dengan badge kondisi
- Tombol Export PDF & DOCX
- Dialog konfirmasi hapus (Basecoat Alert Dialog)

#### [MODIFY] `views/gedung/create.ejs`
Form dengan Basecoat `card`, `label`, `input`, `btn`.

#### [MODIFY] `views/gedung/edit.ejs`
Form edit dengan Basecoat, field pre-filled.

---

### Modul 2 — Kelola Aset Ruangan (`/aset`)

> Modul ini mengelola **tabel `rooms`** (bukan `assets` langsung).
> Route tetap `/aset` sesuai yang sudah ada di `app.js`.

#### [MODIFY] `models/asetModel.js`
Ubah total — ganti dari query tabel `assets` menjadi query **`rooms` JOIN `assets` JOIN `buildings`**:
- `getAll(q, buildingId)` → list rooms dengan join
- `getById(id)` → detail 1 ruangan
- `create(data)` → INSERT ke `assets` dulu, lalu INSERT ke `rooms`
- `update(id, data)` → UPDATE `assets` + UPDATE `rooms`
- `destroy(id)` → DELETE `rooms`, lalu DELETE `assets`
- `getStats()` → statistik per kondisi, per status, per gedung
- `getAssetGrants()` → untuk dropdown hibah

#### [MODIFY] `controllers/asetController.js`
Isi semua TODO:
- `index` → list ruangan + search + filter by gedung
- `create` → load daftar gedung + asset_grants untuk dropdown
- `store` → INSERT ke 2 tabel (assets + rooms) dalam 1 flow
- `edit` → load data ruangan by ID + dropdown gedung + grants
- `update` → UPDATE 2 tabel
- `destroy` → DELETE rooms + assets (cascade manual)
- `exportPdf` (NEW) → generate PDF
- `exportDocx` (NEW) → generate DOCX
- `apiIndex` (NEW) → return JSON list ruangan

#### [MODIFY] `routes/asetRoutes.js`
Tambah route:
```
GET  /aset               → index (+ ?q= + ?building_id=)
GET  /aset/create        → form tambah
POST /aset/store         → simpan
GET  /aset/:id/edit      → form edit
POST /aset/:id/update    → update
POST /aset/:id/delete    → hapus
GET  /aset/export/pdf    → export PDF
GET  /aset/export/docx   → export DOCX
GET  /api/aset           → API JSON
```

#### [MODIFY] `views/aset/index.ejs`
Redesign total dengan Basecoat:
- Card statistik (total ruangan, per kondisi, per status)
- Filter dropdown gedung + search bar
- Tabel dengan badge status/kondisi berwarna
- Export buttons
- Dialog konfirmasi hapus

#### [MODIFY] `views/aset/create.ejs`
Form dengan field:
- Nama Ruangan, Kode Ruangan (dari `rooms`)
- Gedung (dropdown dari `buildings`)
- Lantai, Kapasitas, Publik/Private (dari `rooms`)
- Cara Perolehan, Tanggal, Harga (dari `assets`)
- Kondisi, Status (dari `assets`)
- Hibah (dropdown dari `asset_grants`, muncul jika `acquisition_type=grant`)

#### [MODIFY] `views/aset/edit.ejs`
Form edit dengan field yang sama, semua pre-filled dari data join.

---

## Urutan Eksekusi

1. Buat partials layout (head & sidebar)
2. Implementasi Gedung: model → controller → routes → views
3. Implementasi Aset Ruangan: model → controller → routes → views
4. Test end-to-end semua CRUD
5. Implementasi export & API endpoint

---

## Verification Plan

### Manual Verification
- Login sebagai `admin@example.com`
- CRUD Gedung: tambah, lihat list, edit, hapus
- CRUD Aset Ruangan: tambah dengan pilih gedung, lihat list, edit, hapus
- Search berfungsi pada kedua modul
- Export PDF dan DOCX bisa didownload
- API endpoint `/api/gedung` dan `/api/aset` return JSON valid
- Navigasi sidebar berfungsi dan aktif sesuai halaman
