const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const publicDir = path.join(__dirname, '..', 'public');
const user = { Username: 'alice', Role: 'customer', Email: 'alice@example.test' };
const book = { ISBN: 'book1', Title: '<img src=x onerror=alert(1)>', SellingPrice: '12.50', StockQuantity: 2, Threshold: 5 };

async function page(name) {
    const dom = new JSDOM(fs.readFileSync(path.join(publicDir, name), 'utf8'), {
        url: `http://localhost/${name}`, runScripts: 'outside-only'
    });
    const window = dom.window;
    const calls = [];
    window.alert = () => {};
    window.confirm = () => true;
    window.HTMLElement.prototype.scrollIntoView = () => {};
    window.localStorage.setItem('currentUser', 'alice');
    window.fetch = async (url, options = {}) => {
        calls.push({ url, options });
        let data = [];
        if (url === '/me') data = { user: { ...user, Role: name.startsWith('admin') ? 'admin' : 'customer' } };
        else if (url === '/books' || url === '/books/low-stock') data = [book];
        else if (url === '/books/book1') data = book;
        else if (url === '/customer/profile') data = { user: { ...user, Email: 'updated@example.test' } };
        else if (url === '/checkout') data = { orderId: 1 };
        else if (url.includes('/sales/')) data = { TotalSales: 0 };
        else if (url === '/admin/orders/place') data = { message: 'Recorded' };
        return { ok: true, status: 200, json: async () => data };
    };
    // Match the page's script order; session.js is deferred in the head.
    const scripts = [...window.document.querySelectorAll('script')];
    for (const script of [...scripts.filter(s => !s.defer), ...scripts.filter(s => s.defer)]) {
        const code = script.src ? fs.readFileSync(path.join(publicDir, script.getAttribute('src')), 'utf8') : script.textContent;
        window.eval(code);
    }
    window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
    await new Promise(resolve => setImmediate(resolve));
    return { dom, window, calls };
}

test('customer page renders database text safely and submits a card-free cart', async () => {
    const { dom, window, calls } = await page('dashboard.html');
    try {
        const container = window.document.getElementById('book-container');
        assert.equal(container.querySelector('img'), null);
        assert.match(container.textContent, /<img/);
        container.querySelector('button').click();
        assert.equal(window.document.querySelector('#cart-items img'), null);
        assert.equal(window.document.querySelector('#checkout-section input'), null);
        await window.placeCustomerOrder({ preventDefault() {} });
        const body = JSON.parse(calls.find(call => call.url === '/checkout').options.body);
        assert.deepEqual(body, { items: [{ isbn: 'book1', quantity: 1 }] });
    } finally { dom.window.close(); }
});

test('profile submits to the actual endpoint and saves the safe server response', async () => {
    const { dom, window, calls } = await page('dashboard.html');
    try {
        window.document.getElementById('email').value = 'updated@example.test';
        await window.saveProfile({ preventDefault() {} });
        assert.equal(calls.find(call => call.url === '/customer/profile').options.method, 'PUT');
        assert.equal(JSON.parse(window.localStorage.getItem('userInfo')).Email, 'updated@example.test');
    } finally { dom.window.close(); }
});

test('admin low-stock action records a request and edit form preserves text', async () => {
    const { dom, window, calls } = await page('admin_dashboard.html');
    try {
        await window.loadLowStockBooks();
        assert.equal(window.document.querySelector('#low-stock-body img'), null);
        window.document.querySelector('[data-restock]').click();
        await new Promise(resolve => setImmediate(resolve));
        assert.deepEqual(JSON.parse(calls.find(call => call.url === '/admin/orders/place').options.body), { isbn: 'book1', quantity: 10 });
        window.document.getElementById('editSearchIsbn').value = 'book1';
        await window.searchBookToEdit();
        assert.equal(window.document.querySelector('.title-input').value, book.Title);
        assert.equal(window.document.querySelector('#edit-book-body img'), null);
        window.document.getElementById('save-book').click();
        await new Promise(resolve => setImmediate(resolve));
        assert.ok(calls.some(call => call.url === '/books/book1' && call.options.method === 'PUT'));
    } finally { dom.window.close(); }
});
