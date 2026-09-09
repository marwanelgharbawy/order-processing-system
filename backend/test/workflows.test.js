const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const db = require('../db');
const { hashPassword, checkPassword } = require('../auth');
const app = require('../server');

// Exercise the real HTTP routes and sessions with an isolated database double.
// SQL constraints, triggers and concurrent locking need a separate MySQL run.
let state;
let queries;
const password = 'SamplePassword123!';

beforeEach(async () => {
    const hash = await hashPassword(password);
    state = {
        users: [{ Username: 'alice', Password: hash, Role: 'customer', Email: 'alice@example.test' },
            { Username: 'admin', Password: hash, Role: 'admin' }],
        books: { book1: { StockQuantity: 5, SellingPrice: '12.50' }, book2: { StockQuantity: 0, SellingPrice: '4.00' } },
        orders: [], items: [], restocks: [{ RestockID: 1, ISBN: 'book1', Quantity: 10, Status: 'Pending' }]
    };
    queries = [];
    db.query = async (sql, args = []) => {
        queries.push({ sql, args });
        if (sql.startsWith('SELECT * FROM CUSTOMER')) return [state.users.filter(user => user.Username === args[0])];
        if (sql.includes('INSERT INTO CUSTOMER (')) {
            if (state.users.some(user => user.Username === args[0])) throw Object.assign(new Error(), { code: 'ER_DUP_ENTRY' });
            state.users.push({ Username: args[0], Password: args[1], Role: 'customer', Email: args[4] });
            return [{ affectedRows: 1 }];
        }
        if (sql.includes('UPDATE CUSTOMER')) {
            const user = state.users.find(user => user.Username === args[6]);
            if (args[0]) user.Password = args[0];
            Object.assign(user, { FirstName: args[1], LastName: args[2], Email: args[3], Phone: args[4], ShippingAddress: args[5] });
            return [{ affectedRows: 1 }];
        }
        if (sql.startsWith('SELECT StockQuantity')) return [state.books[args[0]] ? [state.books[args[0]]] : []];
        if (sql.startsWith('SELECT ISBN FROM BOOK')) return [state.books[args[0]] ? [{ ISBN: args[0] }] : []];
        if (sql.startsWith('INSERT INTO CUSTOMER_ORDER')) {
            state.orders.push({ total: args[0], username: args[1] });
            return [{ insertId: state.orders.length }];
        }
        if (sql.startsWith('INSERT INTO ORDER_ITEMS')) { state.items.push(args); return [{}]; }
        if (sql.startsWith('UPDATE BOOK SET StockQuantity')) {
            state.books[args[1]].StockQuantity += sql.includes('StockQuantity -') ? -args[0] : args[0];
            return [{}];
        }
        if (sql.startsWith('SELECT * FROM ADMIN_ORDER WHERE')) return [state.restocks.filter(order => order.RestockID === Number(args[0]))];
        if (sql.startsWith('SELECT RestockID')) return [state.restocks.filter(order => order.ISBN === args[0] && order.Status === 'Pending')];
        if (sql.startsWith('UPDATE ADMIN_ORDER')) { state.restocks.find(order => order.RestockID === Number(args[1])).Status = args[0]; return [{}]; }
        if (sql.startsWith('INSERT INTO ADMIN_ORDER')) { state.restocks.push({ RestockID: state.restocks.length + 1, Quantity: args[0], ISBN: args[1], Status: 'Pending' }); return [{}]; }
        if (sql.includes('AS TotalSales')) return [[{ TotalSales: 0 }]];
        if (sql.includes('DefaultOrderQty')) return [[{ ISBN: 'book2', ...state.books.book2, DefaultOrderQty: 10 }]];
        if (sql.includes('WHERE O.CustomerUsername')) return [[]];
        if (sql === 'SELECT * FROM ADMIN_ORDER') return [state.restocks];
        throw new Error('Unexpected SQL in test: ' + sql);
    };
    db.getConnection = async () => {
        let snapshot;
        return {
            query: (...args) => db.query(...args),
            beginTransaction: async () => { snapshot = structuredClone(state); },
            commit: async () => {},
            rollback: async () => { state = snapshot; },
            release: () => {}
        };
    };
});

after(() => db.end());

async function login(username = 'alice') {
    const agent = request.agent(app);
    await agent.post('/login').send({ username, password }).expect(200);
    return agent;
}

test('password hashes have independent salts and reject incorrect passwords', async () => {
    const first = await hashPassword(password);
    assert.notEqual(first, await hashPassword(password));
    assert.equal(await checkPassword(password, first), true);
    assert.equal(await checkPassword('wrong', first), false);
    assert.equal(await checkPassword(password, password), false);
});

test('register hashes passwords and ignores a requested admin role', async () => {
    await request(app).post('/register').send({ username: 'new_user', password, email: 'new@example.test', role: 'admin' }).expect(201);
    const user = state.users.at(-1);
    assert.equal(user.Role, 'customer');
    assert.notEqual(user.Password, password);
    assert.equal(await checkPassword(password, user.Password), true);
});

test('login returns safe data and logout invalidates the session', async () => {
    const agent = request.agent(app);
    const result = await agent.post('/login').send({ username: 'alice', password }).expect(200);
    assert.equal(result.body.user.Password, undefined);
    assert.match(result.headers['set-cookie'][0], /HttpOnly/);
    await agent.get('/me').expect(200);
    await agent.post('/logout').expect(200);
    await agent.get('/me').expect(401);
});

test('anonymous and customer requests cannot perform admin actions', async () => {
    await request(app).get('/admin/orders').expect(401);
    await request(app).post('/books').send({}).expect(401);
    const agent = await login();
    await agent.get('/admin/orders').expect(403);
    await agent.post('/admin/orders/confirm/1').expect(403);
    await agent.put('/books/book1').send({}).expect(403);
    await agent.get('/books/low-stock').expect(403);
    await agent.get('/orders/history/admin').expect(403);
});

test('profile uses the session identity and preserves a blank password', async () => {
    const agent = await login();
    const oldHash = state.users[0].Password;
    const result = await agent.put('/customer/profile').send({ username: 'admin', email: 'changed@example.test', firstName: 'Alice', password: '' }).expect(200);
    assert.equal(state.users[0].Email, 'changed@example.test');
    assert.equal(state.users[0].Password, oldHash);
    assert.equal(state.users[1].Email, undefined);
    assert.equal(result.body.user.Password, undefined);
});

test('profile password change is hashed and works on next login', async () => {
    const agent = await login();
    await agent.put('/customer/profile').send({ email: 'alice@example.test', password: 'ChangedPassword123!' }).expect(200);
    await request(app).post('/login').send({ username: 'alice', password }).expect(401);
    await request(app).post('/login').send({ username: 'alice', password: 'ChangedPassword123!' }).expect(200);
});

test('checkout ignores submitted identity and price and saves unit price', async () => {
    const agent = await login();
    await agent.post('/checkout').send({ username: 'admin', items: [{ isbn: 'book1', quantity: 2, price: 0.01 }] }).expect(201);
    assert.deepEqual(state.orders, [{ total: '25.00', username: 'alice' }]);
    assert.equal(state.books.book1.StockQuantity, 3);
    assert.equal(state.items[0][3], '12.50');
});

test('checkout rejects invalid quantities, duplicates and empty carts', async () => {
    const agent = await login();
    for (const quantity of [-1, 0, 1.5, '2', null, 100001]) {
        await agent.post('/checkout').send({ items: [{ isbn: 'book1', quantity }] }).expect(400);
    }
    await agent.post('/checkout').send({ items: [] }).expect(400);
    await agent.post('/checkout').send({ items: [{ isbn: 'book1', quantity: 1 }, { isbn: 'book1', quantity: 1 }] }).expect(400);
    assert.equal(state.orders.length, 0);
    assert.equal(state.books.book1.StockQuantity, 5);
});

test('insufficient stock leaves no partial order or stock change', async () => {
    const agent = await login();
    await agent.post('/checkout').send({ items: [{ isbn: 'book1', quantity: 1 }, { isbn: 'book2', quantity: 1 }] }).expect(400);
    assert.equal(state.orders.length, 0);
    assert.equal(state.items.length, 0);
    assert.equal(state.books.book1.StockQuantity, 5);
});

test('a write failure rolls back earlier stock changes', async () => {
    const query = db.query;
    db.query = async (sql, args) => {
        if (sql.startsWith('UPDATE BOOK SET StockQuantity')) throw new Error('Simulated database failure');
        return query(sql, args);
    };
    const agent = await login();
    await agent.post('/checkout').send({ items: [{ isbn: 'book1', quantity: 1 }] }).expect(400);
    assert.equal(state.orders.length, 0);
    assert.equal(state.items.length, 0);
});

test('restock confirmation adds stock exactly once', async () => {
    const agent = await login('admin');
    await agent.post('/admin/orders/confirm/1').expect(200);
    await agent.post('/admin/orders/confirm/1').expect(400);
    assert.equal(state.books.book1.StockQuantity, 15);
});

test('manual restocking and low-stock route are connected, with duplicate protection', async () => {
    const agent = await login('admin');
    const result = await agent.get('/books/low-stock').expect(200);
    assert.equal(result.body[0].ISBN, 'book2');
    await agent.post('/admin/orders/place').send({ isbn: 'book2', quantity: 10 }).expect(201);
    await agent.post('/admin/orders/place').send({ isbn: 'book2', quantity: 10 }).expect(409);
});

test('report uses previous calendar-month boundaries and validates dates', async () => {
    const agent = await login('admin');
    await agent.get('/admin/reports/sales/previous-month').expect(200);
    const sql = queries.at(-1).sql;
    assert.match(sql, /OrderDate >= DATE_FORMAT/);
    assert.match(sql, /OrderDate < DATE_FORMAT/);
    await agent.get('/admin/reports/sales/day?date=2026-02-30').expect(400);
    await agent.get('/admin/reports/sales/day?date=2026-02-28').expect(200);
});

test('cross-origin writes are rejected', async () => {
    await request(app).post('/login').set('Origin', 'https://other.example').send({ username: 'alice', password }).expect(403);
});

test('legacy migration hashes once and leaves historical prices unknown', async () => {
    const migrate = require('../scripts/migrate');
    const columns = new Set();
    let storedPassword = 'legacy123';
    let updates = 0;
    db.query = async (sql, args) => {
        if (sql.startsWith('SHOW COLUMNS')) {
            const name = sql.includes("'Role'") ? 'Role' : 'UnitPrice';
            return [columns.has(name) ? [{ Field: name }] : []];
        }
        if (sql.startsWith('ALTER TABLE')) {
            if (sql.includes('UnitPrice')) assert.match(sql, /NULL/);
            columns.add(sql.includes('UnitPrice') ? 'UnitPrice' : 'Role');
            return [{}];
        }
        if (sql.startsWith('SELECT Username')) return [[{ Username: 'legacy', Password: storedPassword }]];
        if (sql.startsWith('UPDATE CUSTOMER')) {
            storedPassword = args[0];
            updates++;
            return [{}];
        }
        throw new Error('Unexpected migration write: ' + sql);
    };
    await migrate();
    await migrate();
    assert.equal(columns.size, 2);
    assert.equal(updates, 1);
    assert.equal(await checkPassword('legacy123', storedPassword), true);
});
