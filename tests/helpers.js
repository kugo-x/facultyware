const BASE_URL = 'http://localhost:3000';

const ADMIN = { email: 'admin@example.com', password: 'password' };
const USER  = { email: 'user@example.com',  password: 'password' };

async function loginAs(page, credentials) {
  await page.goto('/login');
  await page.fill('input[name="email"]', credentials.email);
  await page.fill('input[name="password"]', credentials.password);
  
  // Best practice: Tunggu navigasi secara paralel dengan aksi klik
  await Promise.all([
    page.waitForURL('**/home'),
    page.click('button[type="submit"]')
  ]);
}

async function logout(page) {
  // Cari link/tombol logout di sidebar atau popover user
  // Menggunakan XPath yang mencari link logout di sidebar
  const logoutLink = page.locator('a[href="/logout"]').first();
  // Mungkin tombol trigger popover perlu diklik dulu
  const popoverTrigger = page.locator('#popover-user-trigger');
  if (await popoverTrigger.isVisible()) {
    await popoverTrigger.click();
  }
  await logoutLink.click();
  await page.waitForURL('**/login');
}

module.exports = { BASE_URL, ADMIN, USER, loginAs, logout };
