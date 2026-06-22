const { test, expect } = require('@playwright/test');
const { BASE_URL } = require('./helpers');

test.describe('REST API Security', () => {

  test('Test 18: GET /api/gedung tanpa login → berhasil (terbuka)', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/gedung`);
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('Test 19: GET /api/aset tanpa login → berhasil', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/aset`);
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  test('Test 20: POST /api/gedung tanpa login → 401 JSON', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/gedung`, {
      data: { name: "Test API", code: "T001" }
    });
    
    expect(response.status()).toBe(401);
    
    const body = await response.json();
    expect(typeof body).toBe('object');
    expect(body.success).toBe(false);
  });

  test('Test 21: DELETE /api/gedung/:id tanpa login → 401 JSON', async ({ request }) => {
    const response = await request.delete(`${BASE_URL}/api/gedung/1`);
    
    expect(response.status()).toBe(401);
    
    const body = await response.json();
    expect(body.success).toBe(false);
  });

});
