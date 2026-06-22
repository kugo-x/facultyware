const { test, expect } = require('@playwright/test');
const { ADMIN, loginAs, BASE_URL } = require('./helpers');

test.describe('CRUD Modul Ruangan & Aset', () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page, ADMIN);
  });

  test('Test 13: Melihat halaman daftar ruangan', async ({ page }) => {
    await page.goto('/ruangan');
    expect(page.url()).toContain('/ruangan');
    await expect(page.locator('table')).toBeVisible();
  });

  test('Test 14: Tambah ruangan baru', async ({ page }) => {
    await page.goto('/ruangan/create');
    
    const uniqueName = `Ruangan Test ${Date.now()}`;
    const uniqueCode = `RTP-${Date.now()}`;

    await page.fill('input[name="room_name"]', uniqueName);
    await page.fill('input[name="room_code"]', uniqueCode);
    await page.fill('input[name="capacity"]', '30');
    
    // Pilih gedung pertama yang tersedia
    const select = page.locator('select[name="building_id"]');
    // Jika tidak ada gedung, test akan gagal, yang mana masuk akal karena butuh gedung
    // Ambil semua opsi kecuali yang pertama (Pilih Gedung)
    const options = await select.locator('option').allInnerTexts();
    if (options.length > 1) {
      await select.selectOption({ index: 1 });
    }
    
    await Promise.all([
      page.waitForURL('**/ruangan'),
      page.click('button[type="submit"]')
    ]);
    
    await expect(page.locator('table')).toContainText(uniqueName);
  });

  test('Test 15: Tambah aset di dalam ruangan', async ({ page }) => {
    await page.goto('/ruangan');
    
    // Cari ruangan yang baru dibuat atau ruangan pertama
    const kelolaAsetLink = page.locator('a[href*="/aset"]').filter({ hasText: 'Kelola Aset' }).first();
    const href = await kelolaAsetLink.getAttribute('href');
    const roomId = href.split('/')[2];
    
    await kelolaAsetLink.click();
    await page.waitForURL(`**/ruangan/${roomId}/aset`);
    
    // Klik tambah aset
    await page.locator(`a[href="/ruangan/${roomId}/aset/create"]`).first().click();
    await page.waitForURL(`**/ruangan/${roomId}/aset/create`);
    
    const uniqueAsetName = `Proyektor ${Date.now()}`;
    await page.fill('input[name="asset_name"]', uniqueAsetName);
    await page.fill('input[name="asset_code"]', `ASET-${Date.now()}`);
    
    // Isi field required lainnya
    await page.locator('select[name="condition"]').selectOption({ index: 1 }); // Pilih opsi ke-2 (Baik)
    await page.locator('select[name="status"]').selectOption({ index: 1 });    // Pilih opsi ke-2 (Tersedia)
    await page.locator('select[name="acquisition_type"]').selectOption({ index: 1 }); // Pilih opsi ke-2 (Pengadaan)
    await page.fill('input[name="acquisition_date"]', '2023-01-01');
    
    await Promise.all([
      page.waitForURL(`**/ruangan/${roomId}/aset`),
      page.click('button[type="submit"]')
    ]);
    
    await expect(page.locator('table')).toContainText(uniqueAsetName);
  });

  test('Test 16: Edit aset', async ({ page }) => {
    // Navigasi ke daftar ruangan lalu ke aset ruangan pertama
    await page.goto('/ruangan');
    const kelolaAsetLink = page.locator('a[href*="/aset"]').filter({ hasText: 'Kelola Aset' }).first();
    const roomId = (await kelolaAsetLink.getAttribute('href')).split('/')[2];
    
    await kelolaAsetLink.click();
    await page.waitForURL(`**/ruangan/${roomId}/aset`);
    
    // Cari tombol edit aset pertama
    const editAsetLink = page.locator('a[href*="/edit"]').filter({ hasText: 'Edit' }).first();
    await editAsetLink.click();
    
    await page.waitForURL(`**/ruangan/${roomId}/aset/*/edit`);
    
    await page.fill('input[name="asset_name"]', 'Proyektor Test Edit');
    await Promise.all([
      page.waitForURL(`**/ruangan/${roomId}/aset`),
      page.click('button[type="submit"]')
    ]);
    
    await expect(page.locator('table')).toContainText('Proyektor Test Edit');
  });

  test('Test 17: Export PDF aset ruangan', async ({ request, page }) => {
    // Kita asumsikan endpoint export ada di route ruangan /ruangan/export/pdf atau /ruangan/:id/aset/export/pdf
    // Berdasarkan info terbaru export ada di /ruangan/export/pdf (di ruanganRoutes.js)
    
    const contextRequest = await request.post(`${BASE_URL}/login`, {
      form: { email: ADMIN.email, password: ADMIN.password }
    });
    
    const response = await request.get(`${BASE_URL}/ruangan/export/pdf`);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/pdf');
  });

});
