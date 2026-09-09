require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../db');
const { hashPassword, validPassword } = require('../auth');

async function createUser() {
    const [username, role = 'customer'] = process.argv.slice(2);
    const password = process.env.ACCOUNT_PASSWORD;
    if (!/^[a-zA-Z0-9_]{3,50}$/.test(username || '') ||
        !['customer', 'admin'].includes(role) || !validPassword(password)) {
        throw new Error('Use: npm run create-user -- username customer|admin, with ACCOUNT_PASSWORD set to 8-128 characters');
    }
    await db.query('INSERT INTO CUSTOMER (Username, Password, Role) VALUES (?, ?, ?)',
        [username, await hashPassword(password), role]);
    console.log(`Created ${role} account: ${username}`);
}

createUser().catch(err => {
    console.error(err.code === 'ER_DUP_ENTRY' ? 'Username already exists; no account was changed' : err.message);
    process.exitCode = 1;
}).finally(() => db.end());
