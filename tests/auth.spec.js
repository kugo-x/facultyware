const { test, expect } = require('@playwright/test');
const { ADMIN, USER, loginAs } = require('./helpers');

test.describe('Autentikasi & Role Access', () => {

  test('Test 1: Login berhasil sebagai admin', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', ADMIN.email);
    await page.fill('input[name="password"]', ADMIN.password);
    await page.click('button[type="submit"]');
    
    await page.waitForURL('**/home');
    expect(page.url()).toContain('/home');
    
    // Pastikan masuk ke dashboard, misal ada teks Manajemen Aset atau FTI Aset
    await expect(page.locator('body')).toContainText('Manajemen Aset Ruangan');
  });

  test('Test 2: Login gagal dengan password salah', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', ADMIN.email);
    await page.fill('input[name="password"]', 'passwordsalah');
    await page.click('button[type="submit"]');
    
    // Tetap di halaman login dan ada pesan error (login.ejs menggunakan .text-destructive)
    expect(page.url()).toContain('/login');
    await expect(page.locator('.text-destructive')).toBeVisible();
    await expect(page.locator('.text-destructive')).toContainText('Invalid email or password');
  });

  test('Test 3: Akses halaman protected tanpa login → redirect ke /login', async ({ page }) => {
    await page.goto('/gedung');
    await page.waitForURL('**/login');
    expect(page.url()).toContain('/login');
  });

  test('Test 4: Login sebagai user read-only', async ({ page }) => {
    await loginAs(page, USER);
    
    // Buka daftar gedung
    await page.goto('/gedung');
    expect(page.url()).toContain('/gedung');
    
    // Tabel termuat
    await expect(page.locator('table')).toBeVisible();
    
    // Tombol Tambah Gedung seharusnya tidak ada (sudah disembunyikan di EJS)
    await expect(page.locator('a[href="/gedung/create"]')).not.toBeVisible();
  });

  test('Test 5: User read-only coba akses URL write secara langsung', async ({ page }) => {
    await loginAs(page, USER);
    
    await page.goto('/gedung/create');
    
    // Harus redirect (kembali ke /gedung atau muncul error, di middleware terbaru akan diredirect ke /gedung)
    expect(page.url()).not.toContain('/gedung/create');
    
    // Harusnya muncul flash message error
    await expect(page.locator('.alert-destructive')).toContainText('Anda tidak memiliki izin untuk melakukan aksi ini.');
  });

});
