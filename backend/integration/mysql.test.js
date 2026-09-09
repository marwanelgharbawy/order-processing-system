const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

// These tests change sample rows. Only run against the disposable CI database.
if (process.env.CI_MYSQL_TEST !== 'true' || process.env.DB_NAME !== 'BookstoreDB' ||
    !['127.0.0.1', 'localhost'].includes(process.env.DB_HOST)) {
    throw new Error('MySQL tests require CI_MYSQL_TEST=true and a disposable local BookstoreDB');
}

const db = require('../db');
const app = require('../server');
const { hashPassword } = require('../auth');
const java = '978-0134685991';
const novel = '978-0544003415';
const password = 'TestPassword123!';
let hash;

before(async () => {
    hash = await hashPassword(password);
    const [books] = await db.query('SELECT COUNT(*) AS count FROM BOOK');
    assert.equal(books[0].count, 5, 'The supplied sample data must import successfully');
    const [triggers] = await db.query('SHOW TRIGGERS');
    assert.ok(triggers.some(trigger => trigger.Trigger === 'AutoRestock'));
    assert.ok(triggers.some(trigger => trigger.Trigger === 'PreventNegativeStock'));
});

beforeEach(async () => {
    await db.query('DELETE FROM ORDER_ITEMS');
    await db.query('DELETE FROM CUSTOMER_ORDER');
    await db.query('DELETE FROM CUSTOMER');
    await db.query('UPDATE BOOK SET StockQuantity = 5, Threshold = 5, SellingPrice = 12.50');
    await db.query('DELETE FROM ADMIN_ORDER');
    for (const [name, role] of [['alice', 'customer'], ['bob', 'customer'], ['admin', 'admin']]) {
        await db.query('INSERT INTO CUSTOMER (Username, Password, Role, Email) VALUES (?, ?, ?, ?)',
            [name, hash, role, `${name}@example.test`]);
    }
});

after(() => db.end());

async function login(username = 'alice') {
    const agent = request.agent(app);
    await agent.post('/login').send({ username, password }).expect(200);
    return agent;
}

test('real checkout uses database prices and preserves purchase history after price edits', async () => {
    const agent = await login();
    await agent.post('/checkout').send({ username: 'bob', items: [{ isbn: java, quantity: 2, price: 0 }] }).expect(201);
    const [orders] = await db.query('SELECT * FROM CUSTOMER_ORDER');
    assert.equal(orders[0].CustomerUsername, 'alice');
    assert.equal(Number(orders[0].TotalPrice), 25);
    const [books] = await db.query('SELECT StockQuantity FROM BOOK WHERE ISBN = ?', [java]);
    assert.equal(books[0].StockQuantity, 3);
    await db.query('UPDATE BOOK SET SellingPrice = 99 WHERE ISBN = ?', [java]);
    const history = await agent.get('/orders/history/alice').expect(200);
    assert.equal(Number(history.body[0].items[0].price), 12.5);
});

test('insufficient stock and database write failure leave no partial order', async () => {
    const agent = await login();
    await agent.post('/checkout').send({ items: [{ isbn: java, quantity: 1 }, { isbn: novel, quantity: 6 }] }).expect(400);
    // Force a failure after the order and item insert to exercise a real rollback.
    await db.query(`CREATE TRIGGER TestStockFailure BEFORE UPDATE ON BOOK FOR EACH ROW
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Test stock write failure'`);
    try {
        await agent.post('/checkout').send({ items: [{ isbn: java, quantity: 1 }] }).expect(400);
    } finally {
        await db.query('DROP TRIGGER TestStockFailure');
    }
    const [orders] = await db.query('SELECT COUNT(*) AS count FROM CUSTOMER_ORDER');
    const [items] = await db.query('SELECT COUNT(*) AS count FROM ORDER_ITEMS');
    const [books] = await db.query('SELECT StockQuantity FROM BOOK WHERE ISBN = ?', [java]);
    assert.equal(orders[0].count, 0);
    assert.equal(items[0].count, 0);
    assert.equal(books[0].StockQuantity, 5);
});

test('threshold trigger creates one pending request and receipt increases stock once', async () => {
    const agent = await login();
    const admin = await login('admin');
    await agent.post('/checkout').send({ items: [{ isbn: java, quantity: 1 }] }).expect(201);
    const [requests] = await db.query('SELECT * FROM ADMIN_ORDER WHERE ISBN = ?', [java]);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].Quantity, 10);
    await admin.post('/admin/orders/place').send({ isbn: java, quantity: 10 }).expect(409);
    await admin.post(`/admin/orders/confirm/${requests[0].RestockID}`).expect(200);
    await admin.post(`/admin/orders/confirm/${requests[0].RestockID}`).expect(400);
    const [books] = await db.query('SELECT StockQuantity FROM BOOK WHERE ISBN = ?', [java]);
    assert.equal(books[0].StockQuantity, 14);
});

test('manual pending request suppresses duplicate automatic restocking', async () => {
    const admin = await login('admin');
    await admin.post('/admin/orders/place').send({ isbn: java, quantity: 10 }).expect(201);
    await db.query('UPDATE BOOK SET StockQuantity = 4 WHERE ISBN = ?', [java]);
    const [requests] = await db.query('SELECT COUNT(*) AS count FROM ADMIN_ORDER WHERE ISBN = ?', [java]);
    assert.equal(requests[0].count, 1);
    await assert.rejects(db.query('UPDATE BOOK SET StockQuantity = -1 WHERE ISBN = ?', [java]));
});

test('two customers competing for the last copy cannot both buy it', async () => {
    await db.query('UPDATE BOOK SET StockQuantity = 1 WHERE ISBN = ?', [java]);
    const alice = await login('alice');
    const bob = await login('bob');
    const body = { items: [{ isbn: java, quantity: 1 }] };
    const results = await Promise.all([alice.post('/checkout').send(body), bob.post('/checkout').send(body)]);
    assert.deepEqual(results.map(result => result.status).sort(), [201, 400]);
    const [books] = await db.query('SELECT StockQuantity FROM BOOK WHERE ISBN = ?', [java]);
    const [orders] = await db.query('SELECT COUNT(*) AS count FROM CUSTOMER_ORDER');
    assert.equal(books[0].StockQuantity, 0);
    assert.equal(orders[0].count, 1);
});

test('SQL reports include the previous calendar month and exclude adjacent months', async () => {
    await db.query(`INSERT INTO CUSTOMER_ORDER (OrderDate, TotalPrice, CustomerUsername) VALUES
        (DATE_FORMAT(CURRENT_DATE - INTERVAL 1 MONTH, '%Y-%m-01'), 10, 'alice'),
        (DATE_FORMAT(CURRENT_DATE, '%Y-%m-01') - INTERVAL 1 SECOND, 20, 'alice'),
        (DATE_FORMAT(CURRENT_DATE, '%Y-%m-01'), 100, 'alice'),
        (DATE_FORMAT(CURRENT_DATE - INTERVAL 1 MONTH, '%Y-%m-01') - INTERVAL 1 SECOND, 200, 'alice')`);
    const admin = await login('admin');
    const report = await admin.get('/admin/reports/sales/previous-month').expect(200);
    assert.equal(Number(report.body.TotalSales), 30);
    const [date] = await db.query("SELECT DATE_FORMAT(CURRENT_DATE, '%Y-%m-01') AS day");
    const daily = await admin.get('/admin/reports/sales/day').query({ date: date[0].day }).expect(200);
    assert.equal(Number(daily.body.TotalSales), 100);
    await admin.get('/admin/reports/top-customers').expect(200);
    await admin.get('/admin/reports/top-books').expect(200);
});
