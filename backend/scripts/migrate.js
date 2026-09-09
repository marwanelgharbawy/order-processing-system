require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../db');
const { hashPassword } = require('../auth');

// One-time upgrade for an existing academic database. Back up before running.
async function migrate() {
    const [roles] = await db.query("SHOW COLUMNS FROM CUSTOMER LIKE 'Role'");
    if (!roles.length) {
        await db.query("ALTER TABLE CUSTOMER ADD COLUMN Role VARCHAR(10) NOT NULL DEFAULT 'customer'");
    }
    const [prices] = await db.query("SHOW COLUMNS FROM ORDER_ITEMS LIKE 'UnitPrice'");
    if (!prices.length) {
        // Historical prices were never recorded; leave them unknown rather than inventing them.
        await db.query('ALTER TABLE ORDER_ITEMS ADD COLUMN UnitPrice DECIMAL(10, 2) NULL');
    }
    const [users] = await db.query('SELECT Username, Password FROM CUSTOMER');
    for (const user of users) {
        if (!/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(user.Password)) {
            await db.query('UPDATE CUSTOMER SET Password = ? WHERE Username = ?',
                [await hashPassword(user.Password), user.Username]);
        }
    }
    console.log('Upgrade complete. Existing users remain customers; create a separate admin account.');
    console.log('Existing order item prices remain unknown. New orders save their unit prices.');
}

if (require.main === module) {
    migrate().catch(err => {
        console.error(err.message);
        process.exitCode = 1;
    }).finally(() => db.end());
}

module.exports = migrate;
