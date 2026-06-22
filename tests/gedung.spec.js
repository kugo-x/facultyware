const { test, expect } = require('@playwright/test');
const { ADMIN, loginAs, BASE_URL } = require('./helpers');

test.describe('CRUD Modul Gedung', () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page, ADMIN);
  });

  test('Test 6: Melihat halaman daftar gedung', async ({ page }) => {
    await page.goto('/gedung');
    
    // Halaman dimuat
    expect(page.url()).toContain('/gedung');
    
    // Ada tabel
    await expect(page.locator('table')).toBeVisible();
    
    // Ada kartu statistik
    await expect(page.locator('body')).toContainText('Total Gedung');
  });

  test('Test 7: Tambah gedung baru', async ({ page }) => {
    await page.goto('/gedung/create');
    
    const uniqueCode = `GTP-${Date.now()}`;
    const uniqueName = `Gedung Test ${Date.now()}`;

    await page.fill('input[name="name"]', uniqueName);
    await page.fill('input[name="code"]', uniqueCode);
    await page.fill('textarea[name="description"]', 'Dibuat oleh Playwright');
    
    await Promise.all([
      page.waitForURL('**/gedung'),
      page.click('button[type="submit"]')
    ]);
    
    await expect(page.locator('table')).toContainText(uniqueName);
    await expect(page.locator('.alert-success')).toBeVisible();
  });

  test('Test 8: Edit gedung', async ({ page }) => {
    await page.goto('/gedung');
    
    // Cari tombol edit gedung test sebelumnya
    const editLink = page.locator('a[href*="/edit"]').filter({ hasText: 'Edit' }).first();
    await editLink.click();
    
    await page.waitForURL('**/edit');
    
    await page.fill('input[name="name"]', 'Gedung Test Edit');
    await Promise.all([
      page.waitForURL('**/gedung'),
      page.click('button[type="submit"]')
    ]);
    
    await expect(page.locator('table')).toContainText('Gedung Test Edit');
    await expect(page.locator('.alert-success')).toBeVisible();
  });

  test('Test 9: Search gedung', async ({ page }) => {
    await page.goto('/gedung');
    
    await page.fill('input[name="q"]', 'Gedung Test Edit');
    await page.press('input[name="q"]', 'Enter');
    
    await page.waitForURL('**/gedung?q=*');
    expect(page.url()).toContain('?q=');
    
    await expect(page.locator('table')).toContainText('Gedung Test Edit');
  });

  test('Test 10: Export PDF gedung', async ({ request }) => {
    // Karena request berjalan tanpa UI browser (tapi menggunakan cookie browser jika lewat context, 
    // namun kita setup login untuk request terpisah)
    // Akan lebih mudah jika login dengan context browser request (tapi page request tidak share session otomatis,
    // kita akan mengirim HTTP GET biasa yang mungkin perlu session, mari kita bypass session dengan mengirim kredensial login via API dulu
    // Namun untuk amannya, karena Playwright `request` fixture bersih, kita login dulu via request API)
    
    const contextRequest = await request.post(`${BASE_URL}/login`, {
      form: { email: ADMIN.email, password: ADMIN.password }
    });
    
    const response = await request.get(`${BASE_URL}/gedung/export/pdf`);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/pdf');
  });

  test('Test 11: Export DOCX gedung', async ({ request }) => {
    await request.post(`${BASE_URL}/login`, {
      form: { email: ADMIN.email, password: ADMIN.password }
    });
    
    const response = await request.get(`${BASE_URL}/gedung/export/docx`);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('openxmlformats-officedocument.wordprocessingml.document');
  });

  test('Test 12: Hapus gedung', async ({ page, request }) => {
    // Buat gedung yang akan dihapus dulu
    await page.goto('/gedung/create');
    
    const delCode = `DEL-${Date.now()}`;
    await page.fill('input[name="name"]', 'Gedung Untuk Dihapus');
    await page.fill('input[name="code"]', delCode);
    await Promise.all([
      page.waitForURL('**/gedung'),
      page.click('button[type="submit"]')
    ]);
    
    // Ambil ID dari href edit
    const editLocator = page.locator('tr').filter({ hasText: delCode }).locator('a[href*="/edit"]');
    const href = await editLocator.getAttribute('href');
    const id = href.split('/')[2];
    
    // Hapus via request API (Web Form POST)
    // Karena form POST di express butuh session, kita harus dapatkan cookie dari context browser
    const cookies = await page.context().cookies();
    
    const reqContext = await request.post(`${BASE_URL}/gedung/${id}/delete`, {
      headers: {
        'Cookie': cookies.map(c => `${c.name}=${c.value}`).join('; ')
      }
    });
    
    await page.goto('/gedung');
    await expect(page.locator('table')).not.toContainText('GTP-DELETE');
  });

});
