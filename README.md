# FacultyWare - Sistem Manajemen Gedung & Aset Ruangan

![Status](https://img.shields.io/badge/Status-Completed-success)
![Playwright](https://img.shields.io/badge/Tests-23%20Passed-brightgreen)
![Node.js](https://img.shields.io/badge/Node.js-Express-blue)
![Database](https://img.shields.io/badge/Database-MySQL-orange)

FacultyWare adalah sistem informasi berbasis web yang dirancang khusus untuk mempermudah pengelolaan data gedung, ruangan, dan inventaris aset di lingkungan Fakultas Teknologi Informasi.

Aplikasi ini dikembangkan menggunakan **Node.js (Express)**, **EJS Template Engine**, dan **MySQL**, serta di-deploy secara otomatis ke **Railway Cloud**.

---

## 🚀 Fitur Utama

- **🔒 Autentikasi & Keamanan (Role-Based Access Control)**
  Sistem login yang aman menggunakan hashing `bcrypt` dengan pembagian hak akses (Admin vs Read-Only User).
- **🏢 Manajemen Gedung (CRUD)**
  Pendataan seluruh gedung di lingkungan fakultas, pencarian cepat, dan fitur ekspor dokumen.
- **🪑 Manajemen Ruangan & Aset (CRUD)**
  Pemantauan detail setiap ruangan beserta aset di dalamnya (kondisi barang, jumlah, dsb).
- **📄 Export Laporan Otomatis**
  Dapat mencetak rekap data ke dalam format **PDF** dan **DOCX (Microsoft Word)**.
- **🌐 REST API Support**
  Menyediakan endpoint JSON yang terproteksi oleh sistem otentikasi sesi.

---

## 💻 Tech Stack

- **Backend:** Node.js, Express.js
- **Frontend:** HTML, Vanilla CSS/Tailwind (Basecoat), Vanilla JS, EJS, HTMX
- **Database:** MySQL
- **Testing:** Playwright (E2E Automated Testing)
- **Deployment:** Railway Cloud

---

## 🛠️ Cara Instalasi (Local Development)

Jika Anda ingin menjalankan atau mengembangkan proyek ini di komputer Anda sendiri:

1. **Clone repository ini**
   ```bash
   git clone https://github.com/kugo-x/facultyware.git
   cd facultyware
   ```

2. **Install dependensi Node.js**
   ```bash
   npm install
   ```

3. **Konfigurasi Lingkungan (.env)**
   Buat file `.env` di direktori utama, lalu copy isi pengaturan dari `.env.example`:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=facultyware
   PORT=3000
   SESSION_SECRET=rahasia_super_aman
   ```

4. **Siapkan Database MySQL**
   - Pastikan MySQL (via Laragon / XAMPP / Docker) menyala.
   - Buat database baru bernama `facultyware`.
   - Import file `database/facultyware.sql` ke dalam database tersebut untuk data awal.

5. **Jalankan Aplikasi**
   ```bash
   npm run dev
   ```
   Aplikasi akan berjalan dan dapat diakses melalui `http://localhost:3000`.

---

## 🧪 Pengujian (Testing)

Proyek ini telah menerapkan sistem pengujian E2E (End-to-End) otomatis menggunakan **Playwright**. Sebanyak **23 Test Cases** telah ditulis untuk menguji modul utama (Auth, Gedung, Ruangan/Aset, dan Proteksi API) dengan tingkat kelulusan 100%.

Untuk menjalankan *test*:
```bash
npx playwright test
```

---

## 🌍 Live Demo

Proyek ini telah berhasil di-deploy ke produksi dan dapat diakses publik pada tautan berikut:
**👉 [https://ftigedung.me](https://ftigedung.me)**
