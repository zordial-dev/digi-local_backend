/**
 * DigiLocal Backend — Full API Test Suite
 * Tests all endpoints (skipping OTP-only routes)
 * Run: node tests/api_full_test.js
 */

const http = require('http');

const BASE = 'http://127.0.0.1:5000';
let VENDOR_TOKEN = '';
let USER_TOKEN = '';
let VENDOR_ID = '';
let CREATED_ORDER_ID = '';
let CREATED_ITEM_ID = '';
let SOCIETY_ID = 1;

let passed = 0, failed = 0, total = 0;
const results = [];

async function req(method, path, body, headers = {}) {
  return new Promise((resolve) => {
    const url = new URL(BASE + path);
    const bodyStr = body ? JSON.stringify(body) : null;
    const options = {
      hostname: url.hostname, port: url.port, path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': bodyStr ? Buffer.byteLength(bodyStr) : 0,
        ...headers
      }
    };
    const request = http.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        let json;
        try { json = JSON.parse(data); } catch { json = data; }
        resolve({ status: res.statusCode, body: json });
      });
    });
    request.on('error', (e) => resolve({ status: 0, body: { error: e.message } }));
    if (bodyStr) request.write(bodyStr);
    request.end();
  });
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

function test(name, status, body, expectedStatus, checks = []) {
  total++;
  const ok = status === expectedStatus && checks.every(c => c);
  if (ok) {
    passed++;
    results.push(`  PASS [${status}] ${name}`);
  } else {
    failed++;
    const why = status !== expectedStatus ? `got ${status} expected ${expectedStatus}` : 'check failed';
    results.push(`  FAIL [${status}] ${name} -- ${why}`);
    const bodyStr = typeof body === 'object' ? JSON.stringify(body).substring(0, 150) : String(body).substring(0, 150);
    results.push(`     Body: ${bodyStr}`);
  }
}

async function run() {
  console.log('\nDigiLocal Full API Test Suite\n' + '='.repeat(50));

  // HEALTH
  console.log('\n[HEALTH ENDPOINTS]');
  {
    const r = await req('GET', '/health');
    test('GET /health', r.status, r.body, 200, [r.body.status === 'UP']);

    const r2 = await req('GET', '/health/live');
    test('GET /health/live', r2.status, r2.body, 200, [r2.body.status === 'ALIVE']);

    const r3 = await req('GET', '/health/ready');
    test('GET /health/ready', r3.status, r3.body, 200, [r3.body.status === 'READY']);

    const r4 = await req('GET', '/health/version');
    test('GET /health/version', r4.status, r4.body, 200, [!!r4.body.version]);
  }

  // SOCIETIES
  console.log('\n[SOCIETY ENDPOINTS]');
  {
    const r = await req('GET', '/api/societies');
    test('GET /api/societies (list all)', r.status, r.body, 200, [Array.isArray(r.body), r.body.length > 0]);
    if (Array.isArray(r.body) && r.body.length > 0) SOCIETY_ID = r.body[0].society_id;

    const r2 = await req('GET', `/api/societies/${SOCIETY_ID}`);
    test(`GET /api/societies/:id (by ID)`, r2.status, r2.body, 200, [!!r2.body.society_name]);

    const r3 = await req('GET', '/api/societies?search=green');
    test('GET /api/societies?search=green (search)', r3.status, r3.body, 200, [Array.isArray(r3.body)]);

    const r4 = await req('GET', '/api/societies/99999');
    test('GET /api/societies/99999 (not found -> 404)', r4.status, r4.body, 404, []);

    const r5 = await req('GET', `/api/societies/${SOCIETY_ID}/vendors`);
    test(`GET /api/societies/:id/vendors`, r5.status, r5.body, 200, [Array.isArray(r5.body)]);

    const r6 = await req('POST', '/api/societies', {});
    test('POST /api/societies (missing fields -> 400)', r6.status, r6.body, 400, []);
  }

  // VENDOR AUTH
  console.log('\n[VENDOR AUTH ENDPOINTS]');
  {
    const ts = Date.now();
    const regBody = {
      owner_name: `Test Vendor ${ts}`,
      shop_name: `Test Shop ${ts}`,
      mobile: `98765${String(ts).slice(-5)}`,
      email: `testvendor${ts}@test.com`,
      password: 'TestPass123!',
      shop_number: 'B-101',
      society_id: SOCIETY_ID,
      business_category: 'Grocery'
    };
    const r = await req('POST', '/api/vendors/register', regBody);
    test('POST /api/vendors/register', r.status, r.body, 201, [!!r.body.token || !!r.body.vendor_id]);
    if (r.body.vendor_id) VENDOR_ID = String(r.body.vendor_id);
    if (r.body.token) VENDOR_TOKEN = r.body.token;
    if (r.body.accessToken) VENDOR_TOKEN = r.body.accessToken;

    const lr = await req('POST', '/api/vendors/login', { email: regBody.email, password: regBody.password });
    test('POST /api/vendors/login (email+password)', lr.status, lr.body, 200, [!!lr.body.token || !!lr.body.accessToken]);
    if (lr.body.token) VENDOR_TOKEN = lr.body.token;
    if (lr.body.accessToken) VENDOR_TOKEN = lr.body.accessToken;
    if (lr.body.vendor && lr.body.vendor.vendor_id) VENDOR_ID = String(lr.body.vendor.vendor_id);
    if (lr.body.vendorId) VENDOR_ID = String(lr.body.vendorId);

    const lr2 = await req('POST', '/api/vendors/login', { email: regBody.email, password: 'WrongPass!' });
    test('POST /api/vendors/login (wrong password -> 401)', lr2.status, lr2.body, 401, []);

    const lr3 = await req('POST', '/api/vendors/login', { email: 'nobody@never.com', password: 'x' });
    test('POST /api/vendors/login (unknown email -> 401)', lr3.status, lr3.body, 401, []);

    if (VENDOR_ID) {
      const vr = await req('GET', `/api/vendors/${VENDOR_ID}`);
      test(`GET /api/vendors/:id (storefront)`, vr.status, vr.body, 200, [!!vr.body.vendor || !!vr.body.store_name]);
    }
  }

  // VENDOR PANEL
  console.log('\n[VENDOR PANEL ENDPOINTS]');
  {
    const ur = await req('POST', '/api/vendorPanel/upload-image', {});
    test('POST /api/vendorPanel/upload-image (no file -> 400)', ur.status, ur.body, 400, []);

    if (VENDOR_ID && VENDOR_TOKEN) {
      const dr = await req('GET', `/api/vendorPanel/${VENDOR_ID}`, null, authHeader(VENDOR_TOKEN));
      test(`GET /api/vendorPanel/:id (dashboard)`, dr.status, dr.body, 200, []);

      const ar = await req('POST', `/api/vendorPanel/${VENDOR_ID}/items`,
        { item_name: 'Test Milk 1L', description: 'Fresh milk', price: 55, stock: 100, category: 'Dairy', unit: 'litre', is_available: true },
        authHeader(VENDOR_TOKEN)
      );
      test('POST /api/vendorPanel/:id/items (add item)', ar.status, ar.body, 201, [ar.body.message && ar.body.message.includes('success')]);
      if (ar.body.item_id) CREATED_ITEM_ID = String(ar.body.item_id);

      if (CREATED_ITEM_ID) {
        const ur2 = await req('PUT', `/api/vendorPanel/${VENDOR_ID}/items/${CREATED_ITEM_ID}`,
          { item_name: 'Updated Milk 2L', description: 'Updated', price: 65, stock: 80, category: 'Dairy', unit: 'litre', is_available: true, image_url: '' },
          authHeader(VENDOR_TOKEN)
        );
        test('PUT /api/vendorPanel/:id/items/:itemId (update)', ur2.status, ur2.body, 200, []);

        const tr = await req('PUT', `/api/vendorPanel/${VENDOR_ID}/items/${CREATED_ITEM_ID}`,
          { is_available: false }, authHeader(VENDOR_TOKEN)
        );
        test('PUT /api/vendorPanel/:id/items/:itemId (toggle availability)', tr.status, tr.body, 200, []);

        const del = await req('DELETE', `/api/vendorPanel/${VENDOR_ID}/items/${CREATED_ITEM_ID}`, null, authHeader(VENDOR_TOKEN));
        test('DELETE /api/vendorPanel/:id/items/:itemId (delete)', del.status, del.body, 200, [del.body.message && del.body.message.includes('success')]);
      }

      const sr = await req('PUT', `/api/vendorPanel/${VENDOR_ID}/settings`,
        { store_name: 'Updated Store', description: 'New desc', opening_timing: '9:00 AM', closing_timing: '9:00 PM' },
        authHeader(VENDOR_TOKEN)
      );
      test('PUT /api/vendorPanel/:id/settings (update settings)', sr.status, sr.body, 200, []);
    }
  }

  // USER AUTH
  console.log('\n[USER AUTH ENDPOINTS]');
  {
    const ts = Date.now();
    const regBody = {
      name: `Test User ${ts}`,
      email: `testuser${ts}@test.com`,
      phone: `97${String(ts).slice(-8)}`,
      password: 'TestPass123!',
      society_id: SOCIETY_ID,
      flat: 'Tower C-205'
    };

    const rr = await req('POST', '/api/users/register', regBody);
    test('POST /api/users/register', rr.status, rr.body, 201, [!!rr.body.token || !!rr.body.accessToken]);
    if (rr.body.token) USER_TOKEN = rr.body.token;
    const USER_ID = rr.body.user ? rr.body.user.user_id : '';

    const dr = await req('POST', '/api/users/register', regBody);
    test('POST /api/users/register (duplicate -> 400)', dr.status, dr.body, 400, []);

    const lr = await req('POST', '/api/users/login', { phone: regBody.phone, password: regBody.password });
    test('POST /api/users/login (mobile+password)', lr.status, lr.body, 200, [!!lr.body.token || !!lr.body.accessToken]);

    const lr2 = await req('POST', '/api/users/login', { email: regBody.email, password: regBody.password });
    test('POST /api/users/login (email only -> 400)', lr2.status, lr2.body, 400, []);

    const lr3 = await req('POST', '/api/users/login', { phone: regBody.phone, password: 'WrongPass!' });
    test('POST /api/users/login (wrong password -> 401)', lr3.status, lr3.body, 401, []);

    if (USER_ID) {
      const or = await req('GET', `/api/users/${USER_ID}/orders`);
      test(`GET /api/users/:id/orders`, or.status, or.body, 200, [Array.isArray(or.body)]);
    }
    const por = await req('GET', `/api/users/${regBody.phone}/orders`);
    test('GET /api/users/:phone/orders (10-digit phone)', por.status, por.body, 200, [Array.isArray(por.body)]);
  }

  // ORDERS
  console.log('\n[ORDER ENDPOINTS]');
  {
    const cr = await req('POST', '/api/orders', {
      user_id: 'usr_101',
      vendor_id: VENDOR_ID || 1,
      society_id: SOCIETY_ID,
      total_amount: 185,
      delivery_address: 'Tower B-301',
      items: [
        { item_name: 'Milk 1L', quantity: 2, price: 55 },
        { item_name: 'Bread', quantity: 1, price: 75 }
      ]
    });
    test('POST /api/orders (create order)', cr.status, cr.body, 201, [!!cr.body.order_id]);
    if (cr.body.order_id) CREATED_ORDER_ID = cr.body.order_id;

    const er = await req('POST', '/api/orders', { user_id: 'usr_101' });
    test('POST /api/orders (missing items -> 400)', er.status, er.body, 400, []);

    if (CREATED_ORDER_ID) {
      const gr = await req('GET', `/api/orders/${CREATED_ORDER_ID}`);
      test(`GET /api/orders/:id`, gr.status, gr.body, 200, [!!gr.body.order]);

      const s1 = await req('PUT', `/api/orders/${CREATED_ORDER_ID}/status`, { status: 'CONFIRMED' });
      test('PUT /api/orders/:id/status (CONFIRMED)', s1.status, s1.body, 200, [s1.body.status === 'CONFIRMED']);

      const s2 = await req('PUT', `/api/orders/${CREATED_ORDER_ID}/status`, { status: 'DELIVERED' });
      test('PUT /api/orders/:id/status (DELIVERED)', s2.status, s2.body, 200, [s2.body.status === 'DELIVERED']);

      const s3 = await req('PUT', `/api/orders/${CREATED_ORDER_ID}/status`, { status: 'BLAH' });
      test('PUT /api/orders/:id/status (invalid -> 400)', s3.status, s3.body, 400, []);
    }

    const nr = await req('GET', '/api/orders/ORD-0000');
    test('GET /api/orders/ORD-0000 (not found -> 404)', nr.status, nr.body, 404, []);

    const ur = await req('GET', '/api/orders/user/usr_101');
    test('GET /api/orders/user/usr_101', ur.status, ur.body, 200, [Array.isArray(ur.body)]);

    if (VENDOR_ID) {
      const vr = await req('GET', `/api/orders/vendor/${VENDOR_ID}`);
      test(`GET /api/orders/vendor/:id`, vr.status, vr.body, 200, [Array.isArray(vr.body)]);
    }
  }

  // RESULTS
  console.log('\n' + '='.repeat(50));
  results.forEach(r => console.log(r));
  console.log('\n' + '='.repeat(50));
  console.log(`\nRESULTS: ${passed}/${total} passed  |  ${failed} failed`);
  if (failed === 0) {
    console.log('ALL TESTS PASSED!\n');
  } else {
    console.log(`${failed} test(s) FAILED - check above\n`);
  }
}

run().catch(console.error);
